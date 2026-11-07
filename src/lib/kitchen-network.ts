// COLA DE COCINA SIN CONEXIÓN (funciones puras)
//
// Aquí vive la lógica de la cola de cocina: qué se guarda cuando no hay conexión y cómo se
// envía después, en orden. No usa React, React Native ni AsyncStorage: recibe el cliente de
// Supabase y la función de reintentos como parámetros. Así:
//   - la app (src/context/kitchen-context.tsx) le pasa con_reintentos de '@/lib/auth' (7000 ms, 3 intentos);
//   - el script scripts/prueba-cocina.mjs puede cargar este mismo archivo con Node y probarlo.
// Por eso aquí solo hay "import type": Node los borra al leer el archivo y no intenta
// resolver '@/...' ni paquetes de React Native.
//
// Reglas de la cola:
//   1. Los cambios se envían EN ORDEN. Si la red falla a mitad, se detiene ahí y lo que
//      falta se queda guardado para el siguiente intento (no se salta nada).
//   2. No se sobrescriben cambios ajenos: cada cambio de estado guarda el estado que tenía
//      el producto cuando la cocina lo tocó, y solo se aplica si sigue igual en el servidor.
//   3. Si la cuenta ya se cerró o se canceló, el cambio se descarta con un mensaje claro.
//   4. RLS no da error cuando bloquea un UPDATE: deja 0 filas. Por eso se piden las filas
//      actualizadas y, si vienen 0, se averigua por qué en lugar de darlo por hecho.
//   5. Reintentar algo que ya se aplicó no hace daño: con_reintentos corta a los 7 s, pero
//      la petición pudo llegar al servidor. Si el producto ya tiene el estado nuevo, o la
//      notificación ya existe, se cuenta como aplicado.

import type { SupabaseClient } from '@supabase/supabase-js';

// CATÁLOGOS (mismos IDs que supabase/seed.sql)
export const ESTADO_COMANDA = { abierta: 1, cerrada: 2, cancelada: 3 } as const;

export const ESTADO_DETALLE = {
  pendiente: 1,
  en_preparacion: 2,
  listo: 3,
  entregado: 4,
  cancelado: 5,
} as const;

export const NOMBRES_ESTADO_DETALLE: Record<number, string> = {
  1: 'pendiente',
  2: 'en preparación',
  3: 'listo',
  4: 'entregado',
  5: 'cancelado',
};

// tipo_notificacion 3 = 'producto_listo' (el aviso es por producto, no por comanda)
export const TIPO_NOTIFICACION_PRODUCTO_LISTO = 3;

// TIPOS DE DATOS DE COCINA
// Propios de cocina para no tocar src/types/index.ts, que es compartido y todavía
// usa los estados viejos de la comanda.
export type DetalleCocina = {
  id_detalle: string;
  id_comanda: string;
  id_producto: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  especificaciones: string | null;
  tiempo_estimado: number | null;
  id_estado: number;
  fecha_creacion: string;
};

export type ComandaCocina = {
  id_comanda: string;
  id_cafeteria: string;
  id_mesa: string;
  num_mesa: number;
  id_usuario: string; // El mesero que abrió la cuenta: a él le llega el aviso de "listo"
  id_estado: number;
  total: number;
  fecha_creacion: string;
  detalles: DetalleCocina[];
};

// Columnas que pide la cocina: la comanda, el número de su mesa y sus productos con el nombre.
// PostgREST arma los objetos anidados siguiendo las llaves foráneas.
export const SELECT_COMANDA_COCINA =
  'id_comanda, id_cafeteria, id_mesa, id_usuario, id_estado, total, fecha_creacion, ' +
  'mesa(num_mesa), ' +
  'detalle_comanda(id_detalle, id_comanda, id_producto, cantidad, precio_unitario, especificaciones, ' +
  'tiempo_estimado, id_estado, fecha_creacion, producto(nombre_producto))';

// PostgREST devuelve la relación como objeto, pero según la llave puede venir como arreglo
function primero<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

// Convierte una fila de SELECT_COMANDA_COCINA en ComandaCocina.
// Los productos se ordenan por hora de alta: lo que se pidió primero sale primero.
export function mapearComandaCocina(fila: Record<string, unknown>): ComandaCocina {
  const mesa = primero(fila.mesa as { num_mesa: number } | { num_mesa: number }[] | null);
  const detalles = (fila.detalle_comanda as Record<string, unknown>[] | null) ?? [];

  return {
    id_comanda: String(fila.id_comanda),
    id_cafeteria: String(fila.id_cafeteria),
    id_mesa: String(fila.id_mesa),
    num_mesa: Number(mesa?.num_mesa ?? 0),
    id_usuario: String(fila.id_usuario),
    id_estado: Number(fila.id_estado),
    total: Number(fila.total ?? 0),
    fecha_creacion: String(fila.fecha_creacion),
    detalles: detalles
      .map((d) => {
        const producto = primero(
          d.producto as { nombre_producto: string } | { nombre_producto: string }[] | null
        );
        return {
          id_detalle: String(d.id_detalle),
          id_comanda: String(d.id_comanda),
          id_producto: String(d.id_producto),
          nombre_producto: producto?.nombre_producto ?? 'Producto',
          cantidad: Number(d.cantidad),
          precio_unitario: Number(d.precio_unitario),
          especificaciones: (d.especificaciones as string | null) ?? null,
          tiempo_estimado: d.tiempo_estimado == null ? null : Number(d.tiempo_estimado),
          id_estado: Number(d.id_estado),
          fecha_creacion: String(d.fecha_creacion),
        };
      })
      .sort((a, b) => a.fecha_creacion.localeCompare(b.fecha_creacion)),
  };
}

// TIPOS DE LA COLA
// num_mesa y nombre_producto se guardan solo para poder explicar en pantalla qué pasó
type OperacionBase = {
  id_operacion: string;
  id_comanda: string;
  num_mesa: number;
  nombre_producto: string;
  fecha: string;
};

export type OperacionEstadoDetalle = OperacionBase & {
  tipo: 'estado_detalle';
  id_detalle: string;
  estado_anterior: number; // Lo que veía la cocina; si el servidor ya tiene otra cosa, no se pisa
  estado_nuevo: number;
};

export type OperacionTiempoEstimado = OperacionBase & {
  tipo: 'tiempo_estimado';
  id_detalle: string;
  minutos: number;
};

export type OperacionNotificacion = OperacionBase & {
  tipo: 'notificacion';
  id_notificacion: string; // Se genera aquí para que reintentar no cree avisos repetidos
  id_cafeteria: string;
  id_usuario: string;
  depende_de: string | null; // El cambio a "listo" que la origina; si ese se descarta, el aviso también
};

export type OperacionCocina =
  | OperacionEstadoDetalle
  | OperacionTiempoEstimado
  | OperacionNotificacion;

export type MotivoDescarte =
  | 'cuenta_cerrada'
  | 'cuenta_cancelada'
  | 'conflicto'
  | 'no_encontrado'
  | 'dependencia'
  | 'error';

export type Descarte = {
  operacion: OperacionCocina;
  motivo: MotivoDescarte;
  mensaje: string; // Vacío en 'dependencia': el aviso ya lo dio el cambio que la originó
};

export type ResultadoCola = {
  restantes: OperacionCocina[]; // Lo que se queda guardado para el siguiente intento
  aplicadas: OperacionCocina[];
  descartadas: Descarte[];
  detenida: null | 'red' | 'sesion'; // Por qué se detuvo antes de terminar, si fue el caso
};

// Misma forma que con_reintentos de '@/lib/auth'
export type EjecutorConRed = <T>(
  operacion: () => Promise<T>
) => Promise<{ resultado: T | null; fallo_red: boolean }>;

export type DependenciasCola = {
  supabase: SupabaseClient;
  conRed: EjecutorConRed;
};

// UTILIDADES
// UUID v4 sin depender de crypto.randomUUID, que no existe en todos los motores de React Native
export function generarUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Los "cambios" que ve la persona en cocina: los avisos al mesero van incluidos en su cambio a "listo"
export function contarCambiosPendientes(cola: OperacionCocina[]): number {
  return cola.filter((op) => op.tipo !== 'notificacion').length;
}

function etiqueta(op: OperacionCocina) {
  return `“${op.nombre_producto}” (Mesa ${op.num_mesa})`;
}

// Un token vencido no es un error del cambio: se detiene la cola y se reintenta con sesión nueva
function esErrorDeSesion(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const codigo = String(error.code ?? '');
  const mensaje = String(error.message ?? '').toLowerCase();
  return codigo === 'PGRST301' || codigo === 'PGRST303' || mensaje.includes('jwt');
}

// CREAR OPERACIONES
// Cambio de estado de un producto. Si queda "listo", se agrega el aviso para el mesero
// justo detrás, para que se envíe solo si el cambio se aplicó.
export function crearOperacionesCambioEstado(
  comanda: ComandaCocina,
  detalle: DetalleCocina,
  estado_nuevo: number
): OperacionCocina[] {
  const fecha = new Date().toISOString();
  const cambio: OperacionEstadoDetalle = {
    tipo: 'estado_detalle',
    id_operacion: generarUuid(),
    id_comanda: comanda.id_comanda,
    num_mesa: comanda.num_mesa,
    nombre_producto: detalle.nombre_producto,
    fecha,
    id_detalle: detalle.id_detalle,
    estado_anterior: detalle.id_estado,
    estado_nuevo,
  };

  if (estado_nuevo !== ESTADO_DETALLE.listo) {
    return [cambio];
  }

  const aviso: OperacionNotificacion = {
    tipo: 'notificacion',
    id_operacion: generarUuid(),
    id_comanda: comanda.id_comanda,
    num_mesa: comanda.num_mesa,
    nombre_producto: detalle.nombre_producto,
    fecha,
    id_notificacion: generarUuid(),
    id_cafeteria: comanda.id_cafeteria,
    id_usuario: comanda.id_usuario,
    depende_de: cambio.id_operacion,
  };

  return [cambio, aviso];
}

export function crearOperacionTiempoEstimado(
  comanda: ComandaCocina,
  detalle: DetalleCocina,
  minutos: number
): OperacionTiempoEstimado {
  return {
    tipo: 'tiempo_estimado',
    id_operacion: generarUuid(),
    id_comanda: comanda.id_comanda,
    num_mesa: comanda.num_mesa,
    nombre_producto: detalle.nombre_producto,
    fecha: new Date().toISOString(),
    id_detalle: detalle.id_detalle,
    minutos,
  };
}

// VISTA OPTIMISTA
// Aplica lo que sigue en la cola sobre las comandas que llegaron del servidor (o de la copia
// guardada), para que la pantalla muestre los cambios de la cocina aunque aún no se envíen.
export function aplicarColaSobreComandas(
  comandas: ComandaCocina[],
  cola: OperacionCocina[]
): ComandaCocina[] {
  if (cola.length === 0) return comandas;

  return comandas.map((comanda) => {
    const ops = cola.filter((op) => op.id_comanda === comanda.id_comanda);
    if (ops.length === 0) return comanda;

    const detalles = comanda.detalles.map((detalle) => {
      let resultado = detalle;
      for (const op of ops) {
        if (op.tipo === 'estado_detalle' && op.id_detalle === detalle.id_detalle) {
          resultado = { ...resultado, id_estado: op.estado_nuevo };
        } else if (op.tipo === 'tiempo_estimado' && op.id_detalle === detalle.id_detalle) {
          resultado = { ...resultado, tiempo_estimado: op.minutos };
        }
      }
      return resultado;
    });

    return { ...comanda, detalles };
  });
}

// ENVÍO DE LA COLA
type Resultado =
  | { estado: 'aplicada' }
  | { estado: 'detener'; razon: 'red' | 'sesion' }
  | { estado: 'descartada'; motivo: MotivoDescarte; mensaje: string };

type ErrorPostgrest = { code?: string; message?: string } | null;

// Convierte un error de Supabase en "detener" (red o sesión) o en descarte con mensaje
function resultadoPorError(
  error: ErrorPostgrest,
  op: OperacionCocina,
  accion: string
): Resultado {
  if (esErrorDeSesion(error)) return { estado: 'detener', razon: 'sesion' };
  return {
    estado: 'descartada',
    motivo: 'error',
    mensaje: `No se pudo ${accion} ${etiqueta(op)}: ${error?.message ?? 'error desconocido'}.`,
  };
}

// Lee el estado actual de la cuenta. id_estado null = no existe o no es de esta cafetería.
async function leerEstadoComanda(
  id_comanda: string,
  { supabase, conRed }: DependenciasCola
): Promise<{ leida: true; id_estado: number | null } | { leida: false; razon: 'red' | 'sesion' }> {
  const { resultado, fallo_red } = await conRed(
    async () =>
      await supabase.from('comanda').select('id_estado').eq('id_comanda', id_comanda).maybeSingle()
  );
  if (fallo_red || !resultado) return { leida: false, razon: 'red' };
  // Un SELECT no falla por RLS (solo devuelve menos filas), así que un error aquí es de
  // sesión o del servidor: en ambos casos conviene detener y reintentar más tarde
  if (resultado.error) {
    return { leida: false, razon: esErrorDeSesion(resultado.error) ? 'sesion' : 'red' };
  }
  const fila = resultado.data as { id_estado: number } | null;
  return { leida: true, id_estado: fila ? Number(fila.id_estado) : null };
}

// Revisa que la cuenta siga abierta antes de tocar sus productos (la base también lo exige
// con la política detalle_actualizar_cuenta_abierta, pero aquí se explica el porqué).
// Devuelve null si está abierta y se puede seguir.
async function revisarCuentaAbierta(
  op: OperacionCocina,
  deps: DependenciasCola,
  accion: string
): Promise<Resultado | null> {
  const lectura = await leerEstadoComanda(op.id_comanda, deps);
  if (!lectura.leida) return { estado: 'detener', razon: lectura.razon };
  const estado = lectura.id_estado;

  if (estado === null) {
    return {
      estado: 'descartada',
      motivo: 'no_encontrado',
      mensaje: `No se pudo ${accion} ${etiqueta(op)}: la cuenta ya no existe.`,
    };
  }
  if (estado === ESTADO_COMANDA.cerrada) {
    return {
      estado: 'descartada',
      motivo: 'cuenta_cerrada',
      mensaje: `No se pudo ${accion} ${etiqueta(op)}: la cuenta ya se cerró.`,
    };
  }
  if (estado === ESTADO_COMANDA.cancelada) {
    return {
      estado: 'descartada',
      motivo: 'cuenta_cancelada',
      mensaje: `No se pudo ${accion} ${etiqueta(op)}: la cuenta se canceló.`,
    };
  }
  return null; // Abierta: se puede seguir
}

async function aplicarEstadoDetalle(
  op: OperacionEstadoDetalle,
  deps: DependenciasCola
): Promise<Resultado> {
  const accion = `marcar como “${NOMBRES_ESTADO_DETALLE[op.estado_nuevo]}”`;
  const bloqueo = await revisarCuentaAbierta(op, deps, accion);
  if (bloqueo) return bloqueo;

  // Solo cambia si el producto sigue como lo vio la cocina (regla 2)
  const { resultado, fallo_red } = await deps.conRed(
    async () =>
      await deps.supabase
        .from('detalle_comanda')
        .update({ id_estado: op.estado_nuevo })
        .eq('id_detalle', op.id_detalle)
        .eq('id_estado', op.estado_anterior)
        .select('id_detalle')
  );
  if (fallo_red || !resultado) return { estado: 'detener', razon: 'red' };
  if (resultado.error) return resultadoPorError(resultado.error, op, accion);
  if ((resultado.data ?? []).length > 0) return { estado: 'aplicada' };

  // 0 filas (regla 4): averiguar por qué. Primero la cuenta, por si se cerró justo ahora.
  const otraVez = await revisarCuentaAbierta(op, deps, accion);
  if (otraVez) return otraVez;

  const lectura = await deps.conRed(
    async () =>
      await deps.supabase
        .from('detalle_comanda')
        .select('id_estado')
        .eq('id_detalle', op.id_detalle)
        .maybeSingle()
  );
  if (lectura.fallo_red || !lectura.resultado) return { estado: 'detener', razon: 'red' };
  if (lectura.resultado.error) return resultadoPorError(lectura.resultado.error, op, accion);

  const fila = lectura.resultado.data as { id_estado: number } | null;
  if (!fila) {
    return {
      estado: 'descartada',
      motivo: 'no_encontrado',
      mensaje: `No se pudo ${accion} ${etiqueta(op)}: el mesero quitó el producto de la cuenta.`,
    };
  }
  // Ya tenía el estado nuevo: un intento anterior sí llegó (regla 5)
  if (Number(fila.id_estado) === op.estado_nuevo) return { estado: 'aplicada' };

  return {
    estado: 'descartada',
    motivo: 'conflicto',
    mensaje:
      `No se pudo ${accion} ${etiqueta(op)}: alguien más lo cambió a ` +
      `“${NOMBRES_ESTADO_DETALLE[Number(fila.id_estado)] ?? 'otro estado'}” mientras no había conexión.`,
  };
}

async function aplicarTiempoEstimado(
  op: OperacionTiempoEstimado,
  deps: DependenciasCola
): Promise<Resultado> {
  const accion = 'guardar el tiempo estimado de';
  const bloqueo = await revisarCuentaAbierta(op, deps, accion);
  if (bloqueo) return bloqueo;

  const { resultado, fallo_red } = await deps.conRed(
    async () =>
      await deps.supabase
        .from('detalle_comanda')
        .update({ tiempo_estimado: op.minutos })
        .eq('id_detalle', op.id_detalle)
        .select('id_detalle')
  );
  if (fallo_red || !resultado) return { estado: 'detener', razon: 'red' };
  if (resultado.error) return resultadoPorError(resultado.error, op, accion);
  if ((resultado.data ?? []).length > 0) return { estado: 'aplicada' };

  // 0 filas con la cuenta abierta: el producto ya no existe
  const otraVez = await revisarCuentaAbierta(op, deps, accion);
  if (otraVez) return otraVez;
  return {
    estado: 'descartada',
    motivo: 'no_encontrado',
    mensaje: `No se pudo ${accion} ${etiqueta(op)}: el mesero quitó el producto de la cuenta.`,
  };
}

async function aplicarNotificacion(
  op: OperacionNotificacion,
  deps: DependenciasCola
): Promise<Resultado> {
  const accion = 'avisar al mesero de';
  const bloqueo = await revisarCuentaAbierta(op, deps, accion);
  if (bloqueo) return bloqueo;

  // Sin .select(): la cocina no puede leer los avisos del mesero (notificacion_ver_propia),
  // así que pedir la fila de vuelta daría error aunque el aviso sí se guardara.
  // En un INSERT, RLS sí da error si lo bloquea, así que basta con revisar el error.
  const { resultado, fallo_red } = await deps.conRed(
    async () =>
      await deps.supabase.from('notificacion').insert({
        id_notificacion: op.id_notificacion,
        id_cafeteria: op.id_cafeteria,
        id_usuario: op.id_usuario,
        id_comanda: op.id_comanda,
        id_tipo: TIPO_NOTIFICACION_PRODUCTO_LISTO,
      })
  );
  if (fallo_red || !resultado) return { estado: 'detener', razon: 'red' };
  // 23505 = llave repetida: el aviso ya se había guardado en un intento anterior (regla 5)
  if (resultado.error && resultado.error.code !== '23505') {
    return resultadoPorError(resultado.error, op, accion);
  }
  return { estado: 'aplicada' };
}

// Envía la cola en orden. No guarda nada: devuelve lo que quedó para que quien llama
// lo guarde (AsyncStorage en la app, una variable en las pruebas).
export async function procesarCola(
  cola: OperacionCocina[],
  deps: DependenciasCola
): Promise<ResultadoCola> {
  const aplicadas: OperacionCocina[] = [];
  const descartadas: Descarte[] = [];
  const idsDescartados = new Set<string>();

  for (let i = 0; i < cola.length; i++) {
    const op = cola[i];

    // El aviso de un cambio que no se aplicó tampoco se envía
    if (op.tipo === 'notificacion' && op.depende_de && idsDescartados.has(op.depende_de)) {
      idsDescartados.add(op.id_operacion);
      descartadas.push({ operacion: op, motivo: 'dependencia', mensaje: '' });
      continue;
    }

    let resultado: Resultado;
    try {
      if (op.tipo === 'estado_detalle') resultado = await aplicarEstadoDetalle(op, deps);
      else if (op.tipo === 'tiempo_estimado') resultado = await aplicarTiempoEstimado(op, deps);
      else resultado = await aplicarNotificacion(op, deps);
    } catch (err) {
      // Error inesperado (no de red): se descarta para que no trabe la cola para siempre
      resultado = {
        estado: 'descartada',
        motivo: 'error',
        mensaje: `No se pudo enviar el cambio de ${etiqueta(op)}: ${String(err)}.`,
      };
    }

    if (resultado.estado === 'detener') {
      // Regla 1: lo que falta se queda, en el mismo orden
      return { restantes: cola.slice(i), aplicadas, descartadas, detenida: resultado.razon };
    }
    if (resultado.estado === 'aplicada') {
      aplicadas.push(op);
    } else {
      idsDescartados.add(op.id_operacion);
      descartadas.push({ operacion: op, motivo: resultado.motivo, mensaje: resultado.mensaje });
    }
  }

  return { restantes: [], aplicadas, descartadas, detenida: null };
}
