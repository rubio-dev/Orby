import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/context/auth-context';
import {
  con_reintentos,
  es_error_red_o_timeout,
  MENSAJE_SIN_CONEXION,
  traducir_error,
} from '@/lib/auth';
import { supabase_configurado } from '@/lib/env';
import {
  etiquetaComanda,
  mapearComandaCocina,
  SELECT_COMANDA_COCINA,
  type ComandaCocina,
} from '@/lib/kitchen-network';
import { obtener_supabase } from '@/lib/supabase';
import type { Comanda, EstadoMesa, Mesa, TipoServicio } from '@/types';

const STORAGE_KEY_MESAS = '@orby_mesas';

const claveColaMesas = (idCafeteria: string) => `@orby_cola_mesas_${idCafeteria}`;

// Realtime manda varios eventos seguidos (una comanda con 5 productos = varios avisos):
// se espera un momento y se recarga una sola vez, igual que en cocina.
const ESPERA_RECARGA_REALTIME_MS = 400;

// La notificación no guarda el número de mesa: se llega por su comanda.
const SELECT_NOTIFICACION =
  'id_notificacion, id_comanda, id_tipo, leida, fecha_creacion, ' +
  'comanda(mesa(num_mesa), tipo_servicio, nombre_cliente)';

export type OperacionColaMesa = {
  id_operacion: string;
  accion: 'crear' | 'abrir' | 'cerrar' | 'eliminar';
  id_mesa: string;
  num_mesa?: number;
  id_estado?: number;
  fecha: string;
};

export type ResultadoOperacionMesa = {
  exito: boolean;
  enCola?: boolean;
  error?: string;
};

function generarUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function esUuidValido(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const ESTADO_MAP_ID_A_NOMBRE: Record<number, EstadoMesa> = {
  1: 'libre',
  2: 'ocupada',
  3: 'apartada',
  4: 'inactiva',
};

const ESTADO_MAP_NOMBRE_A_ID: Record<EstadoMesa, number> = {
  libre: 1,
  ocupada: 2,
  apartada: 3,
  inactiva: 4,
};

function mesaDesdeFila(fila: Record<string, unknown>): Mesa {
  const idEstado = Number(fila.id_estado);
  return {
    id_mesa: String(fila.id_mesa),
    id_cafeteria: fila.id_cafeteria ? String(fila.id_cafeteria) : undefined,
    num_mesa: Number(fila.num_mesa),
    id_estado: idEstado,
    estado: ESTADO_MAP_ID_A_NOMBRE[idEstado] ?? 'libre',
  };
}

export type NotificacionItem = {
  id_notificacion: string;
  num_mesa: number;
  etiqueta: string;
  tiempo: string;
  leida: boolean;
  fecha: string;
};

// Medianoche de hoy en la hora del teléfono: el inicio solo cuenta los pedidos del día.
function inicioDeHoyIso() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy.toISOString();
}

// Texto corto para la lista de avisos ("hace 2 min", "hace 1 h").
function tiempoRelativo(fecha: string) {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 60000));
  if (minutos < 1) return 'ahora';
  if (minutos === 1) return 'hace 1 min';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return horas === 1 ? 'hace 1 h' : `hace ${horas} h`;
}

// PostgREST devuelve la relación como objeto, pero según la llave puede venir como arreglo.
function primero<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

// Convierte la fila de Supabase (con mesa y productos) al tipo que usan las pantallas.
// El estado de preparación vive en cada producto; la comanda solo está abierta, cerrada o cancelada.
function mapearComanda(datos: ComandaCocina): Comanda {
  return {
    id_comanda: datos.id_comanda,
    id_cafeteria: datos.id_cafeteria,
    id_mesa: datos.id_mesa,
    num_mesa: datos.num_mesa,
    tipo_servicio: datos.tipo_servicio,
    nombre_cliente: datos.nombre_cliente,
    id_usuario: datos.id_usuario,
    id_estado: datos.id_estado,
    estado:
      datos.id_estado === 1 ? 'en preparación' : datos.id_estado === 2 ? 'entregada' : 'cancelada',
    total: datos.total,
    fecha_creacion: datos.fecha_creacion,
    detalles: datos.detalles.map((detalle) => ({
      id_detalle: detalle.id_detalle,
      id_comanda: detalle.id_comanda,
      id_producto: detalle.id_producto,
      nombre_producto: detalle.nombre_producto,
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario,
      especificaciones: detalle.especificaciones ?? undefined,
      id_estado: detalle.id_estado,
      tiempo_estimado_minutos: detalle.tiempo_estimado ?? undefined,
    })),
  };
}

// La notificación llega con comanda(mesa(num_mesa)); se extrae el número sin romper si
// PostgREST devuelve la relación como arreglo.
function mapearNotificacion(fila: Record<string, unknown>): NotificacionItem {
  const comanda = primero(
    fila.comanda as
      | {
          mesa: { num_mesa: number } | { num_mesa: number }[] | null;
          tipo_servicio?: string;
          nombre_cliente?: string | null;
        }
      | {
          mesa: { num_mesa: number } | { num_mesa: number }[] | null;
          tipo_servicio?: string;
          nombre_cliente?: string | null;
        }[]
      | null
  );
  const mesa = primero(comanda?.mesa ?? null);
  const numMesa = Number(mesa?.num_mesa ?? 0);
  const fecha = String(fila.fecha_creacion ?? new Date().toISOString());

  return {
    id_notificacion: String(fila.id_notificacion),
    num_mesa: numMesa,
    etiqueta: etiquetaComanda({
      tipo_servicio: comanda?.tipo_servicio,
      num_mesa: numMesa,
      nombre_cliente: comanda?.nombre_cliente,
    }),
    tiempo: tiempoRelativo(fecha),
    leida: Boolean(fila.leida),
    fecha,
  };
}

// Los errores de la función crear_comanda se explican en español.
function traducirErrorComanda(mensaje: string) {
  if (mensaje.includes('SIN_SESION')) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (mensaje.includes('SIN_PERMISO')) return 'Tu usuario no puede enviar comandas.';
  if (mensaje.includes('SIN_PRODUCTOS')) return 'El pedido no contiene productos.';
  if (mensaje.includes('TIPO_INVALIDO')) return 'El tipo de pedido no es válido.';
  if (mensaje.includes('MESA_INVALIDA')) return 'La mesa ya no existe en esta cafetería.';
  if (mensaje.includes('MESA_NO_DISPONIBLE')) {
    return 'La mesa está apartada o inactiva. Elige otra mesa.';
  }
  if (mensaje.includes('NOMBRE_REQUERIDO')) {
    return 'Escribe el nombre del cliente para el pedido para llevar.';
  }
  if (mensaje.includes('PRODUCTO_INVALIDO')) return 'Uno de los productos ya no está disponible.';
  return 'No se pudo enviar la comanda. Intenta de nuevo.';
}

export type ItemCarrito = {
  id_producto: string;
  nombre_producto: string;
  descripcion?: string;
  precio: number;
  cantidad: number;
  especificaciones?: string;
  imagen_url?: string | null;
};

export type OrdersContextType = {
  mesas: Mesa[];
  cargandoMesas: boolean;
  comandas: Comanda[];
  notificaciones: NotificacionItem[];
  mesaSeleccionada: number;
  tipoServicio: TipoServicio;
  nombreCliente: string;
  carrito: ItemCarrito[];
  colaPendienteMesas: OperacionColaMesa[];
  pendientesMesas: number;
  sincronizandoColaMesas: boolean;
  sincronizarColaMesasPendiente: () => Promise<{ sincronizados: number; pendientes: number }>;
  cambiarEstadoMesa: (num_mesa: number, nuevo_estado: EstadoMesa) => Promise<void>;
  crearMesa: (num_mesa: number) => Promise<ResultadoOperacionMesa>;
  abrirMesa: (id_mesa: string) => Promise<ResultadoOperacionMesa>;
  cerrarMesa: (id_mesa: string, forzar?: boolean) => Promise<ResultadoOperacionMesa>;
  eliminarMesa: (id_mesa: string) => Promise<ResultadoOperacionMesa>;
  recargarMesas: () => Promise<void>;
  seleccionarMesa: (num_mesa: number) => void;
  seleccionarTipoServicio: (tipo: TipoServicio) => void;
  actualizarNombreCliente: (nombre: string) => void;
  cerrarCuentaMesa: (num_mesa: number) => Promise<ResultadoOperacionMesa>;
  agregarAlCarrito: (producto: ItemCarrito) => void;
  quitarDelCarrito: (id_producto: string) => void;
  actualizarEspecificaciones: (id_producto: string, especificaciones: string) => void;
  limpiarCarrito: () => void;
  enviarComandaACocina: (especificacionesGenerales?: string) => Promise<{ exito: boolean; comanda?: Comanda; error?: string }>;
  marcarNotificacionLeida: (id_notificacion: string) => void;
};

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const idUsuario = usuario?.id_usuario ?? null;
  const idCafeteria = usuario?.id_cafeteria;
  const storageKeyMesas = idCafeteria ? `@orby_mesas_${idCafeteria}` : STORAGE_KEY_MESAS;

  // SESIÓN REAL
  // auth-context entra con un usuario demo si el login de Supabase falla. Sin una sesión
  // de Supabase, RLS devuelve 0 filas SIN error y el mesero vería todo vacío. Por eso se
  // revisa la sesión antes de consultar o enviar, igual que en cocina.
  const [revisionSesion, setRevisionSesion] = useState<{
    idUsuario: string;
    real: boolean;
  } | null>(null);
  const estadoSesion: 'verificando' | 'real' | 'falsa' =
    !supabase_configurado || !idUsuario
      ? 'falsa'
      : revisionSesion?.idUsuario !== idUsuario
        ? 'verificando'
        : revisionSesion.real
          ? 'real'
          : 'falsa';
  const sesionReal = estadoSesion === 'real';
  // "conectado" = se puede hablar con Supabase en nombre de este mesero
  const conectado = supabase_configurado && sesionReal && esUuidValido(idCafeteria);

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargandoMesas, setCargandoMesas] = useState<boolean>(false);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number>(0);
  const [tipoServicio, setTipoServicio] = useState<TipoServicio>('mesa');
  const [nombreCliente, setNombreCliente] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // Mesa activa: la que eligió el mesero o, si aún no elige, la primera libre.
  // Así no hay una mesa hardcodeada y la app funciona con las mesas reales.
  const mesaElegida =
    mesas.find((m) => m.num_mesa === mesaSeleccionada) ??
    mesas.find((m) => m.estado === 'libre') ??
    mesas[0] ??
    null;

  const [colaPendienteMesas, setColaPendienteMesas] = useState<OperacionColaMesa[]>([]);
  const [sincronizandoColaMesas, setSincronizandoColaMesas] = useState<boolean>(false);
  const sincronizandoColaRef = useRef(false);
  const cargandoComandasRef = useRef(false);

  // REVISAR LA SESIÓN: al entrar y cada vez que Supabase avise un cambio
  // (inicio, cierre, renovación del token o sesión vencida que no se pudo renovar).
  useEffect(() => {
    if (!supabase_configurado || !idUsuario) return;

    let activo = true;
    const supabase = obtener_supabase();

    const revisar = (sesion: Session | null) => {
      if (!activo) return;
      setRevisionSesion({ idUsuario, real: !!sesion && sesion.user.id === idUsuario });
    };

    // Sin internet, renovar un token vencido falla por red: eso no significa que la sesión
    // sea falsa. Si aún no había resultado, se da por real; si ya había uno, se respeta.
    const dudaPorRed = () => {
      if (!activo) return;
      setRevisionSesion((previa) =>
        previa?.idUsuario === idUsuario ? previa : { idUsuario, real: true }
      );
    };

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error && es_error_red_o_timeout(error)) {
          dudaPorRed();
          return;
        }
        revisar(data.session);
      })
      .catch((e) => {
        console.warn('No se pudo revisar la sesión del mesero:', e);
        dudaPorRed();
      });

    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => revisar(sesion));

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, [idUsuario]);

  // Encolar operaciones offline para mesas
  const encolarOperacionMesa = useCallback(
    async (nuevaOp: Omit<OperacionColaMesa, 'id_operacion' | 'fecha'>) => {
      if (!idCafeteria || !esUuidValido(idCafeteria)) return;

      try {
        const guardada = await AsyncStorage.getItem(claveColaMesas(idCafeteria));
        let colaActual: OperacionColaMesa[] = guardada ? JSON.parse(guardada) : [];

        // Si se elimina una mesa que fue creada offline y aún no sincronizada
        if (nuevaOp.accion === 'eliminar') {
          const idxCrear = colaActual.findIndex(
            (op) => op.id_mesa === nuevaOp.id_mesa && op.accion === 'crear'
          );
          if (idxCrear !== -1) {
            colaActual = colaActual.filter((_, idx) => idx !== idxCrear);
            await AsyncStorage.setItem(claveColaMesas(idCafeteria), JSON.stringify(colaActual));
            setColaPendienteMesas(colaActual);
            return;
          }
        }

        const opCompleta: OperacionColaMesa = {
          ...nuevaOp,
          id_operacion: generarUuid(),
          fecha: new Date().toISOString(),
        };

        colaActual.push(opCompleta);
        await AsyncStorage.setItem(claveColaMesas(idCafeteria), JSON.stringify(colaActual));
        setColaPendienteMesas(colaActual);
      } catch (e) {
        console.warn('Error al encolar operación de mesa offline:', e);
      }
    },
    [idCafeteria]
  );

  // Sincronización de mesas desde Supabase
  const cargarMesasSupabase = useCallback(async (cafeteriaId: string) => {
    setCargandoMesas(true);
    try {
      const supabase = obtener_supabase();
      const { resultado, fallo_red } = await con_reintentos(async () => {
        return await supabase
          .from('mesa')
          .select('id_mesa, id_cafeteria, num_mesa, id_estado, estado_mesa(nombre_estado)')
          .eq('id_cafeteria', cafeteriaId)
          .order('num_mesa', { ascending: true });
      });

      if (fallo_red || !resultado || resultado.error) {
        if (resultado?.error) {
          console.warn('Error al cargar mesas desde Supabase:', resultado.error.message);
        }
        return;
      }

      if (resultado.data) {
        const mesasFormateadas: Mesa[] = resultado.data.map((row: any) => {
          const nombreEstadoRaw = Array.isArray(row.estado_mesa)
            ? row.estado_mesa[0]?.nombre_estado
            : row.estado_mesa?.nombre_estado;

          const estadoNombre = (
            nombreEstadoRaw ? nombreEstadoRaw.toLowerCase() : ESTADO_MAP_ID_A_NOMBRE[row.id_estado] || 'libre'
          ) as EstadoMesa;

          return {
            id_mesa: row.id_mesa,
            id_cafeteria: row.id_cafeteria,
            num_mesa: row.num_mesa,
            id_estado: row.id_estado,
            estado: estadoNombre,
          };
        });

        setMesas(mesasFormateadas);
        await AsyncStorage.setItem(
          `@orby_mesas_${cafeteriaId}`,
          JSON.stringify(mesasFormateadas)
        );
      }
    } catch (error) {
      console.warn('Error inesperado al cargar mesas:', error);
    } finally {
      setCargandoMesas(false);
    }
  }, []);

  // Sincronizar cola de operaciones de mesas pendientes
  const sincronizarColaMesasPendiente = useCallback(
    async (): Promise<{ sincronizados: number; pendientes: number }> => {
      if (!idCafeteria || !esUuidValido(idCafeteria) || !supabase_configurado) {
        return { sincronizados: 0, pendientes: 0 };
      }
      if (sincronizandoColaRef.current) {
        return { sincronizados: 0, pendientes: colaPendienteMesas.length };
      }

      sincronizandoColaRef.current = true;
      setSincronizandoColaMesas(true);

      try {
        const guardada = await AsyncStorage.getItem(claveColaMesas(idCafeteria));
        const colaActual: OperacionColaMesa[] = guardada ? JSON.parse(guardada) : [];

        if (colaActual.length === 0) {
          setColaPendienteMesas([]);
          return { sincronizados: 0, pendientes: 0 };
        }

        let sincronizados = 0;
        let falloConexion = false;
        const restantes: OperacionColaMesa[] = [];
        const supabase = obtener_supabase();

        for (let i = 0; i < colaActual.length; i++) {
          const op = colaActual[i];
          if (falloConexion) {
            restantes.push(op);
            continue;
          }

          try {
            let redFallo = false;
            let resError: unknown = null;

            if (op.accion === 'crear') {
              const { resultado, fallo_red } = await con_reintentos(async () =>
                await supabase
                  .from('mesa')
                  .insert({
                    id_cafeteria: idCafeteria,
                    num_mesa: op.num_mesa,
                    id_estado: op.id_estado ?? 1,
                  })
                  .select('id_mesa, id_cafeteria, num_mesa, id_estado')
                  .single()
              );

              redFallo = fallo_red || (resultado?.error ? es_error_red_o_timeout(resultado.error) : false);
              resError = resultado?.error;

              if (!redFallo && resultado?.data) {
                const idReal = (resultado.data as any).id_mesa;
                if (idReal && idReal !== op.id_mesa) {
                  // Actualizar id_mesa en memoria y almacenamiento local
                  setMesas((prevMesas) => {
                    const actualizadas = prevMesas.map((m) =>
                      m.id_mesa === op.id_mesa ? { ...m, id_mesa: idReal } : m
                    );
                    AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas)).catch(() => {});
                    return actualizadas;
                  });

                  // Reemplazar id_mesa en operaciones posteriores de la cola
                  for (let j = i + 1; j < colaActual.length; j++) {
                    if (colaActual[j].id_mesa === op.id_mesa) {
                      colaActual[j].id_mesa = idReal;
                    }
                  }
                }
              }
            } else if (op.accion === 'abrir') {
              const { resultado, fallo_red } = await con_reintentos(async () =>
                await supabase
                  .from('mesa')
                  .update({ id_estado: 1 })
                  .eq('id_mesa', op.id_mesa)
                  .eq('id_cafeteria', idCafeteria)
              );

              redFallo = fallo_red || (resultado?.error ? es_error_red_o_timeout(resultado.error) : false);
              resError = resultado?.error;
            } else if (op.accion === 'cerrar') {
              const { resultado, fallo_red } = await con_reintentos(async () =>
                await supabase
                  .from('mesa')
                  .update({ id_estado: op.id_estado ?? 4 })
                  .eq('id_mesa', op.id_mesa)
                  .eq('id_cafeteria', idCafeteria)
              );

              redFallo = fallo_red || (resultado?.error ? es_error_red_o_timeout(resultado.error) : false);
              resError = resultado?.error;
            } else if (op.accion === 'eliminar') {
              const { resultado, fallo_red } = await con_reintentos(async () =>
                await supabase
                  .from('mesa')
                  .delete()
                  .eq('id_mesa', op.id_mesa)
                  .eq('id_cafeteria', idCafeteria)
              );

              redFallo = fallo_red || (resultado?.error ? es_error_red_o_timeout(resultado.error) : false);
              resError = resultado?.error;
            }

            if (redFallo) {
              falloConexion = true;
              restantes.push(op);
            } else {
              if (resError) {
                console.warn('Error en operación de cola de mesas:', resError);
              }
              sincronizados++;
            }
          } catch (err) {
            if (es_error_red_o_timeout(err)) {
              falloConexion = true;
            }
            console.warn('Excepción procesando operación de cola de mesas:', err);
            restantes.push(op);
          }
        }

        await AsyncStorage.setItem(claveColaMesas(idCafeteria), JSON.stringify(restantes));
        setColaPendienteMesas(restantes);
        return { sincronizados, pendientes: restantes.length };
      } finally {
        sincronizandoColaRef.current = false;
        setSincronizandoColaMesas(false);
      }
    },
    [idCafeteria, storageKeyMesas, colaPendienteMesas.length]
  );

  // Recargar mesas manualmente (expuesto en contexto)
  const recargarMesas = useCallback(async () => {
    if (idCafeteria && supabase_configurado) {
      await cargarMesasSupabase(idCafeteria);
    } else {
      try {
        const mesasGuardadas = await AsyncStorage.getItem(storageKeyMesas);
        if (mesasGuardadas) {
          setMesas(JSON.parse(mesasGuardadas));
        }
      } catch (e) {
        console.warn('Error al recargar mesas desde almacenamiento local:', e);
      }
    }
  }, [idCafeteria, storageKeyMesas, cargarMesasSupabase]);

  // COMANDAS Y AVISOS DESDE SUPABASE
  // El mesero trae los pedidos de hoy; la cocina se encarga de las cuentas abiertas de días
  // anteriores. Sin sesión real se conservan los datos locales/demo.
  const cargarComandas = useCallback(async (): Promise<'ok' | 'red' | 'error'> => {
    if (!conectado || !idCafeteria || !idUsuario) return 'error';
    if (cargandoComandasRef.current) return 'ok';
    cargandoComandasRef.current = true;

    try {
      const supabase = obtener_supabase();
      const { resultado, fallo_red } = await con_reintentos(async () =>
        await supabase
          .from('comanda')
          .select(SELECT_COMANDA_COCINA)
          .eq('id_cafeteria', idCafeteria)
          .gte('fecha_creacion', inicioDeHoyIso())
          .order('fecha_creacion', { ascending: false })
      );

      if (fallo_red) return 'red';
      if (resultado?.error) {
        console.warn('Error al cargar comandas del mesero:', resultado.error);
        return 'error';
      }

      const nuevas = ((resultado?.data ?? []) as unknown as Record<string, unknown>[]).map(
        mapearComandaCocina
      );
      setComandas(nuevas.map(mapearComanda));
      return 'ok';
    } catch (e) {
      console.warn('Excepción al cargar comandas del mesero:', e);
      return 'error';
    } finally {
      cargandoComandasRef.current = false;
    }
  }, [conectado, idCafeteria, idUsuario]);

  const cargarNotificaciones = useCallback(async () => {
    if (!conectado || !idCafeteria || !idUsuario) return;

    try {
      const supabase = obtener_supabase();
      const { resultado, fallo_red } = await con_reintentos(async () =>
        await supabase
          .from('notificacion')
          .select(SELECT_NOTIFICACION)
          .eq('id_cafeteria', idCafeteria)
          .eq('id_usuario', idUsuario)
          .order('fecha_creacion', { ascending: false })
          .limit(50)
      );

      if (fallo_red) return;
      if (resultado?.error) {
        console.warn('Error al cargar notificaciones del mesero:', resultado.error);
        return;
      }

      const nuevas = ((resultado?.data ?? []) as unknown as Record<string, unknown>[]).map(
        mapearNotificacion
      );
      setNotificaciones(nuevas);
    } catch (e) {
      console.warn('Excepción al cargar notificaciones del mesero:', e);
    }
  }, [conectado, idCafeteria, idUsuario]);

  // CARGA INICIAL: en cuanto hay sesión real
  useEffect(() => {
    if (!conectado) return;
    let cancelado = false;

    // Igual que en cocina: el trabajo va en una función asíncrona y el estado solo cambia
    // cuando responde el servidor; si el efecto se limpia antes, no se pide nada.
    async function pedirDatos() {
      await Promise.resolve();
      if (cancelado) return;
      await cargarComandas();
      if (cancelado) return;
      await cargarNotificaciones();
    }

    pedirDatos().catch(console.warn);
    return () => {
      cancelado = true;
    };
  }, [conectado, cargarComandas, cargarNotificaciones]);

  // REALTIME: comandas, productos y avisos de esta cafetería. RLS filtra los eventos:
  // el mesero solo recibe las comandas de su cafetería y sus propios avisos.
  useEffect(() => {
    if (!conectado || !idCafeteria || !idUsuario) return;

    const supabase = obtener_supabase();
    let espera: ReturnType<typeof setTimeout> | null = null;
    let seCayo = false; // Para recargar al reconectar y no perder lo que pasó mientras tanto
    let activo = true;

    const programarRecarga = () => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => {
        cargarComandas().catch(console.warn);
        cargarNotificaciones().catch(console.warn);
      }, ESPERA_RECARGA_REALTIME_MS);
    };

    const canal: RealtimeChannel = supabase
      .channel(`mesero-${idCafeteria}-${idUsuario}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comanda', filter: `id_cafeteria=eq.${idCafeteria}` },
        programarRecarga
      )
      // detalle_comanda no tiene id_cafeteria: el filtro lo hace RLS (detalle_lectura_cafeteria)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_comanda' }, programarRecarga)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacion', filter: `id_usuario=eq.${idUsuario}` },
        programarRecarga
      )
      .subscribe((estado) => {
        if (!activo) return; // Al desmontar también llega CLOSED; no es una caída
        if (estado === 'SUBSCRIBED') {
          if (seCayo) {
            seCayo = false;
            programarRecarga();
          }
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
          // supabase-js reintenta solo; aquí solo se recuerda que hubo un hueco
          seCayo = true;
        }
      });

    return () => {
      activo = false;
      if (espera) clearTimeout(espera);
      supabase.removeChannel(canal);
    };
  }, [conectado, idCafeteria, idUsuario, cargarComandas, cargarNotificaciones]);

  // REALTIME DE MESAS: si otro mesero abre o cierra una mesa, se refleja al instante.
  useEffect(() => {
    if (!conectado || !idCafeteria) return;

    const supabase = obtener_supabase();

    const canal = supabase
      .channel(`mesas-${idCafeteria}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesa', filter: `id_cafeteria=eq.${idCafeteria}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const idEliminada = (payload.old as { id_mesa?: string } | null)?.id_mesa;
            if (idEliminada) {
              setMesas((prev) => prev.filter((m) => m.id_mesa !== idEliminada));
            }
            return;
          }

          const nueva = mesaDesdeFila(payload.new as Record<string, unknown>);
          setMesas((prev) => {
            const existe = prev.some((m) => m.id_mesa === nueva.id_mesa);
            const siguiente = existe
              ? prev.map((m) => (m.id_mesa === nueva.id_mesa ? nueva : m))
              : [...prev, nueva];
            siguiente.sort((a, b) => a.num_mesa - b.num_mesa);
            AsyncStorage.setItem(storageKeyMesas, JSON.stringify(siguiente)).catch(() => {});
            return siguiente;
          });
        }
      )
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') {
          cargarMesasSupabase(idCafeteria).catch(console.warn);
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [conectado, idCafeteria, storageKeyMesas, cargarMesasSupabase]);

  // AL VOLVER A LA APP: recupera lo que pasó mientras estaba en segundo plano
  useEffect(() => {
    if (!conectado) return;

    const suscripcion = AppState.addEventListener('change', (siguiente: AppStateStatus) => {
      if (siguiente === 'active') {
        cargarComandas().catch(console.warn);
        cargarNotificaciones().catch(console.warn);
      }
    });

    return () => suscripcion.remove();
  }, [conectado, cargarComandas, cargarNotificaciones]);

  // Cargar estado inicial persistente y sincronizar cuando haya cafetería
  useEffect(() => {
    async function inicializar() {
      try {
        const [mesasGuardadas, colaGuardada] = await Promise.all([
          AsyncStorage.getItem(storageKeyMesas),
          idCafeteria ? AsyncStorage.getItem(claveColaMesas(idCafeteria)) : Promise.resolve(null),
        ]);

        if (mesasGuardadas) {
          const mesasLocales = JSON.parse(mesasGuardadas);
          if (Array.isArray(mesasLocales)) setMesas(mesasLocales);
        }

        if (colaGuardada) {
          setColaPendienteMesas(JSON.parse(colaGuardada));
        }
      } catch (e) {
        console.warn('Error al cargar datos de órdenes desde caché:', e);
      }

      if (idCafeteria && supabase_configurado) {
        await cargarMesasSupabase(idCafeteria);
      }
    }

    inicializar();
  }, [idCafeteria, storageKeyMesas, cargarMesasSupabase]);

  // Sincronización en segundo plano: cambio de estado AppState y sondeo periódico
  useEffect(() => {
    const subscripcion = AppState.addEventListener(
      'change',
      (siguienteEstado: AppStateStatus) => {
        if (siguienteEstado === 'active' && colaPendienteMesas.length > 0) {
          sincronizarColaMesasPendiente();
        }
      }
    );

    const intervalo = setInterval(() => {
      if (colaPendienteMesas.length > 0 && !sincronizandoColaRef.current) {
        sincronizarColaMesasPendiente();
      }
    }, 12000);

    return () => {
      subscripcion.remove();
      clearInterval(intervalo);
    };
  }, [colaPendienteMesas.length, sincronizarColaMesasPendiente]);

  // Crear una nueva mesa (Administrador)
  const crearMesa = async (
    num_mesa: number
  ): Promise<ResultadoOperacionMesa> => {
    if (!num_mesa || isNaN(num_mesa) || num_mesa <= 0 || !Number.isInteger(num_mesa)) {
      return { exito: false, error: 'El número de mesa debe ser un número entero mayor a 0.' };
    }

    const yaExiste = mesas.some((m) => m.num_mesa === num_mesa);
    if (yaExiste) {
      return { exito: false, error: `La mesa #${num_mesa} ya existe en esta cafetería.` };
    }

    if (supabase_configurado && idCafeteria) {
      try {
        const supabase = obtener_supabase();
        const { resultado, fallo_red } = await con_reintentos(async () => {
          return await supabase
            .from('mesa')
            .insert({
              id_cafeteria: idCafeteria,
              num_mesa,
              id_estado: 1, // 1 = libre
            })
            .select('id_mesa, id_cafeteria, num_mesa, id_estado, estado_mesa(nombre_estado)')
            .single();
        });

        if (fallo_red || (resultado?.error && es_error_red_o_timeout(resultado.error))) {
          const idTemporal = `mesa-${Date.now()}`;
          const nuevaMesa: Mesa = {
            id_mesa: idTemporal,
            id_cafeteria: idCafeteria,
            num_mesa,
            id_estado: 1,
            estado: 'libre',
          };

          const actualizadas = [...mesas, nuevaMesa].sort((a, b) => a.num_mesa - b.num_mesa);
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'crear',
            id_mesa: idTemporal,
            num_mesa,
            id_estado: 1,
          });
          return { exito: true, enCola: true };
        }

        if (resultado?.error) {
          return { exito: false, error: traducir_error(resultado.error) };
        }

        const row = resultado?.data as any;
        const nombreEstadoRaw = Array.isArray(row?.estado_mesa)
          ? row?.estado_mesa[0]?.nombre_estado
          : row?.estado_mesa?.nombre_estado;

        const nuevaMesa: Mesa = {
          id_mesa: row?.id_mesa ?? `mesa-${Date.now()}`,
          id_cafeteria: idCafeteria,
          num_mesa,
          id_estado: row?.id_estado ?? 1,
          estado: (nombreEstadoRaw?.toLowerCase() as EstadoMesa) || 'libre',
        };

        const actualizadas = [...mesas, nuevaMesa].sort((a, b) => a.num_mesa - b.num_mesa);
        setMesas(actualizadas);
        await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
        return { exito: true };
      } catch (err: any) {
        if (es_error_red_o_timeout(err)) {
          const idTemporal = `mesa-${Date.now()}`;
          const nuevaMesa: Mesa = {
            id_mesa: idTemporal,
            id_cafeteria: idCafeteria,
            num_mesa,
            id_estado: 1,
            estado: 'libre',
          };

          const actualizadas = [...mesas, nuevaMesa].sort((a, b) => a.num_mesa - b.num_mesa);
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'crear',
            id_mesa: idTemporal,
            num_mesa,
            id_estado: 1,
          });
          return { exito: true, enCola: true };
        }
        return {
          exito: false,
          error: err?.message || 'Error inesperado al crear la mesa.',
        };
      }
    }

    // Fallback local / demo
    const nuevaMesa: Mesa = {
      id_mesa: `mesa-${Date.now()}`,
      id_cafeteria: idCafeteria || 'default',
      num_mesa,
      id_estado: 1,
      estado: 'libre',
    };

    const actualizadas = [...mesas, nuevaMesa].sort((a, b) => a.num_mesa - b.num_mesa);
    setMesas(actualizadas);
    await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
    return { exito: true };
  };

  // Abrir mesa (id_estado: 1 - 'libre')
  const abrirMesa = async (
    id_mesa: string
  ): Promise<ResultadoOperacionMesa> => {
    const mesa = mesas.find((m) => m.id_mesa === id_mesa);
    if (!mesa) {
      return { exito: false, error: 'Mesa no encontrada.' };
    }

    if (supabase_configurado && idCafeteria) {
      try {
        const supabase = obtener_supabase();
        const { resultado, fallo_red } = await con_reintentos(async () => {
          return await supabase
            .from('mesa')
            .update({ id_estado: 1 })
            .eq('id_mesa', id_mesa)
            .eq('id_cafeteria', idCafeteria);
        });

        if (fallo_red || (resultado?.error && es_error_red_o_timeout(resultado.error))) {
          const actualizadas = mesas.map((m) =>
            m.id_mesa === id_mesa ? { ...m, id_estado: 1, estado: 'libre' as EstadoMesa } : m
          );
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'abrir',
            id_mesa,
            id_estado: 1,
          });
          return { exito: true, enCola: true };
        }

        if (resultado?.error) {
          return { exito: false, error: traducir_error(resultado.error) };
        }
      } catch (err: any) {
        if (es_error_red_o_timeout(err)) {
          const actualizadas = mesas.map((m) =>
            m.id_mesa === id_mesa ? { ...m, id_estado: 1, estado: 'libre' as EstadoMesa } : m
          );
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'abrir',
            id_mesa,
            id_estado: 1,
          });
          return { exito: true, enCola: true };
        }
        return {
          exito: false,
          error: err?.message || 'Error inesperado al abrir la mesa.',
        };
      }
    }

    const actualizadas = mesas.map((m) =>
      m.id_mesa === id_mesa ? { ...m, id_estado: 1, estado: 'libre' as EstadoMesa } : m
    );
    setMesas(actualizadas);
    await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
    return { exito: true };
  };

  // Cerrar mesa (id_estado: 4 - 'inactiva')
  const cerrarMesa = async (
    id_mesa: string,
    forzar: boolean = false
  ): Promise<ResultadoOperacionMesa> => {
    const mesa = mesas.find((m) => m.id_mesa === id_mesa);
    if (!mesa) {
      return { exito: false, error: 'Mesa no encontrada.' };
    }

    if (mesa.estado === 'ocupada' && !forzar) {
      return {
        exito: false,
        error: 'La mesa se encuentra ocupada con comanda activa. Confirma para forzar el cierre.',
      };
    }

    if (supabase_configurado && idCafeteria) {
      try {
        const supabase = obtener_supabase();
        const { resultado, fallo_red } = await con_reintentos(async () => {
          return await supabase
            .from('mesa')
            .update({ id_estado: 4 })
            .eq('id_mesa', id_mesa)
            .eq('id_cafeteria', idCafeteria);
        });

        if (fallo_red || (resultado?.error && es_error_red_o_timeout(resultado.error))) {
          const actualizadas = mesas.map((m) =>
            m.id_mesa === id_mesa ? { ...m, id_estado: 4, estado: 'inactiva' as EstadoMesa } : m
          );
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'cerrar',
            id_mesa,
            id_estado: 4,
          });
          return { exito: true, enCola: true };
        }

        if (resultado?.error) {
          return { exito: false, error: traducir_error(resultado.error) };
        }
      } catch (err: any) {
        if (es_error_red_o_timeout(err)) {
          const actualizadas = mesas.map((m) =>
            m.id_mesa === id_mesa ? { ...m, id_estado: 4, estado: 'inactiva' as EstadoMesa } : m
          );
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'cerrar',
            id_mesa,
            id_estado: 4,
          });
          return { exito: true, enCola: true };
        }
        return {
          exito: false,
          error: err?.message || 'Error inesperado al cerrar la mesa.',
        };
      }
    }

    const actualizadas = mesas.map((m) =>
      m.id_mesa === id_mesa ? { ...m, id_estado: 4, estado: 'inactiva' as EstadoMesa } : m
    );
    setMesas(actualizadas);
    await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
    return { exito: true };
  };

  // Eliminar mesa (Administrador)
  const eliminarMesa = async (
    id_mesa: string
  ): Promise<ResultadoOperacionMesa> => {
    const mesa = mesas.find((m) => m.id_mesa === id_mesa);
    if (!mesa) {
      return { exito: false, error: 'Mesa no encontrada.' };
    }

    if (mesa.estado === 'ocupada') {
      return {
        exito: false,
        error: 'No se puede eliminar una mesa ocupada. Cierra o finaliza la comanda primero.',
      };
    }

    if (supabase_configurado && idCafeteria) {
      try {
        const supabase = obtener_supabase();
        const { resultado, fallo_red } = await con_reintentos(async () => {
          return await supabase
            .from('mesa')
            .delete()
            .eq('id_mesa', id_mesa)
            .eq('id_cafeteria', idCafeteria);
        });

        if (fallo_red || (resultado?.error && es_error_red_o_timeout(resultado.error))) {
          const actualizadas = mesas.filter((m) => m.id_mesa !== id_mesa);
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'eliminar',
            id_mesa,
          });
          return { exito: true, enCola: true };
        }

        if (resultado?.error) {
          return { exito: false, error: traducir_error(resultado.error) };
        }
      } catch (err: any) {
        if (es_error_red_o_timeout(err)) {
          const actualizadas = mesas.filter((m) => m.id_mesa !== id_mesa);
          setMesas(actualizadas);
          await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
          await encolarOperacionMesa({
            accion: 'eliminar',
            id_mesa,
          });
          return { exito: true, enCola: true };
        }
        return {
          exito: false,
          error: err?.message || 'Error inesperado al eliminar la mesa.',
        };
      }
    }

    const actualizadas = mesas.filter((m) => m.id_mesa !== id_mesa);
    setMesas(actualizadas);
    await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
    return { exito: true };
  };

  // Cambiar estado de una mesa por número (mesero/operación rápida)
  const cambiarEstadoMesa = async (num_mesa: number, nuevo_estado: EstadoMesa) => {
    const nuevoIdEstado = ESTADO_MAP_NOMBRE_A_ID[nuevo_estado] || 1;

    const actualizadas = mesas.map((m) =>
      m.num_mesa === num_mesa ? { ...m, estado: nuevo_estado, id_estado: nuevoIdEstado } : m
    );
    setMesas(actualizadas);
    await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));

    if (supabase_configurado && idCafeteria) {
      try {
        const supabase = obtener_supabase();
        await supabase
          .from('mesa')
          .update({ id_estado: nuevoIdEstado })
          .eq('num_mesa', num_mesa)
          .eq('id_cafeteria', idCafeteria);
      } catch (err) {
        console.warn('Error al sincronizar estado de mesa con Supabase:', err);
      }
    }
  };

  // Cerrar la cuenta de una mesa: la comanda pasa a cerrada y la mesa queda libre.
  const cerrarCuentaMesa = async (num_mesa: number): Promise<ResultadoOperacionMesa> => {
    if (!conectado) {
      return { exito: false, error: 'No hay una sesión real de Supabase. Vuelve a iniciar sesión.' };
    }

    const mesa = mesas.find((m) => m.num_mesa === num_mesa);
    if (!mesa) {
      return { exito: false, error: 'Mesa no encontrada.' };
    }

    try {
      const supabase = obtener_supabase();
      const { resultado, fallo_red } = await con_reintentos(async () =>
        await supabase.rpc('cerrar_comanda', { p_id_mesa: mesa.id_mesa })
      );

      if (fallo_red) {
        return { exito: false, error: MENSAJE_SIN_CONEXION };
      }

      if (resultado?.error) {
        const mensaje = resultado.error.message ?? '';
        if (mensaje.includes('CUENTA_NO_ABIERTA')) {
          return { exito: false, error: 'La mesa no tiene una cuenta abierta.' };
        }
        if (mensaje.includes('MESA_INVALIDA')) {
          return { exito: false, error: 'La mesa ya no existe en esta cafetería.' };
        }
        return { exito: false, error: traducir_error(resultado.error) };
      }

      const actualizadas = mesas.map((m) =>
        m.num_mesa === num_mesa ? { ...m, estado: 'libre' as EstadoMesa, id_estado: 1 } : m
      );
      setMesas(actualizadas);
      await AsyncStorage.setItem(storageKeyMesas, JSON.stringify(actualizadas));
      await cargarComandas();
      return { exito: true };
    } catch (err) {
      console.warn('Excepción al cerrar la cuenta de la mesa:', err);
      return { exito: false, error: MENSAJE_SIN_CONEXION };
    }
  };

  const seleccionarMesa = (num_mesa: number) => {
    setMesaSeleccionada(num_mesa);
  };

  const seleccionarTipoServicio = (tipo: TipoServicio) => {
    setTipoServicio(tipo);
  };

  const actualizarNombreCliente = (nombre: string) => {
    setNombreCliente(nombre);
  };

  const agregarAlCarrito = (item: ItemCarrito) => {
    const existeIndex = carrito.findIndex((c) => c.id_producto === item.id_producto);
    if (existeIndex > -1) {
      const nuevo = [...carrito];
      nuevo[existeIndex].cantidad += item.cantidad;
      setCarrito(nuevo);
    } else {
      setCarrito([...carrito, item]);
    }
  };

  const quitarDelCarrito = (id_producto: string) => {
    setCarrito(carrito.filter((c) => c.id_producto !== id_producto));
  };

  const actualizarEspecificaciones = (id_producto: string, especificaciones: string) => {
    setCarrito(
      carrito.map((c) => (c.id_producto === id_producto ? { ...c, especificaciones } : c))
    );
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setTipoServicio('mesa');
    setNombreCliente('');
  };

  // Enviar pedido armado a cocina
  // Con sesión real la base hace todo en una transacción (crear o reutilizar la cuenta
  // abierta de la mesa, guardar los productos y marcar la mesa como ocupada). Así la
  // cocina recibe la comanda completa por Realtime y no queda una cabecera sin productos.
  const enviarComandaACocina = async (especificacionesGenerales?: string) => {
    if (carrito.length === 0) {
      return { exito: false, error: 'El carrito está vacío' };
    }

    // Al entrar, la sesión tarda un instante en verificarse.
    if (estadoSesion === 'verificando') {
      return {
        exito: false,
        error: 'Estamos verificando tu sesión. Inténtalo de nuevo en un momento.',
      };
    }

    if (!conectado || !idUsuario) {
      return {
        exito: false,
        error: 'No hay una sesión real de Supabase. Vuelve a iniciar sesión.',
      };
    }

    const esLlevar = tipoServicio === 'llevar';
    const nombreLimpio = nombreCliente.trim();

    if (esLlevar && !nombreLimpio) {
      return { exito: false, error: 'Escribe el nombre del cliente para el pedido para llevar.' };
    }

    if (!esLlevar && !mesaElegida) {
      return { exito: false, error: 'Selecciona una mesa antes de enviar el pedido.' };
    }

    const idMesa = esLlevar ? null : mesaElegida!.id_mesa;
    const numMesa = esLlevar ? 0 : mesaElegida!.num_mesa;

    if (!esLlevar && !esUuidValido(idMesa)) {
      return {
        exito: false,
        error: 'La mesa todavía no está sincronizada. Revisa tu conexión e inténtalo de nuevo.',
      };
    }

    if (!carrito.every((item) => esUuidValido(item.id_producto))) {
      return {
        exito: false,
        error: 'El menú todavía no está sincronizado con el servidor. Recarga la app e inténtalo de nuevo.',
      };
    }

    // Los IDs se generan una sola vez: si la petición se reintenta, la función reconoce
    // la comanda y los productos y no los duplica.
    const idComanda = generarUuid();

    try {
      const supabase = obtener_supabase();
      // El precio lo pone la función con el catálogo del servidor, no el teléfono.
      const detalles = carrito.map((item) => ({
        id_detalle: generarUuid(),
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        especificaciones: (item.especificaciones || especificacionesGenerales || '').trim(),
        tiempo_estimado: 15,
        id_estado: 2, // 2 = en preparación en detalle_comanda
      }));

      const { resultado, fallo_red } = await con_reintentos(async () =>
        await supabase.rpc('crear_comanda', {
          p_id_comanda: idComanda,
          p_id_mesa: idMesa,
          p_detalles: detalles,
          p_tipo_servicio: tipoServicio,
          p_nombre_cliente: esLlevar ? nombreLimpio : null,
        })
      );

      if (fallo_red) {
        return { exito: false, error: MENSAJE_SIN_CONEXION };
      }
      if (resultado?.error) {
        console.warn('Error al enviar la comanda a Supabase:', resultado.error);
        return { exito: false, error: traducirErrorComanda(resultado.error.message ?? '') };
      }

      // La mesa ya se marcó ocupada en la función; esto actualiza la copia local.
      if (!esLlevar) await cambiarEstadoMesa(numMesa, 'ocupada');
      limpiarCarrito();
      await cargarComandas();
      return { exito: true };
    } catch (err) {
      console.warn('Excepción al enviar la comanda a Supabase:', err);
      return { exito: false, error: MENSAJE_SIN_CONEXION };
    }
  };

  const marcarNotificacionLeida = (id_notificacion: string) => {
    const actualizadas = notificaciones.map((n) =>
      n.id_notificacion === id_notificacion ? { ...n, leida: true } : n
    );
    setNotificaciones(actualizadas);

    // También en el servidor, para que el aviso no reaparezca al recargar o en otro teléfono.
    if (conectado && idUsuario) {
      obtener_supabase()
        .from('notificacion')
        .update({ leida: true })
        .eq('id_notificacion', id_notificacion)
        .eq('id_usuario', idUsuario)
        .then(({ error }) => {
          if (error) {
            console.warn('No se pudo marcar la notificación como leída:', error);
          }
        });
    }
  };

  return (
    <OrdersContext.Provider
      value={{
        mesas,
        cargandoMesas,
        comandas,
        notificaciones,
        mesaSeleccionada: mesaElegida?.num_mesa ?? 0,
        tipoServicio,
        nombreCliente,
        carrito,
        colaPendienteMesas,
        pendientesMesas: colaPendienteMesas.length,
        sincronizandoColaMesas,
        sincronizarColaMesasPendiente,
        cambiarEstadoMesa,
        crearMesa,
        abrirMesa,
        cerrarMesa,
        eliminarMesa,
        recargarMesas,
        seleccionarMesa,
        seleccionarTipoServicio,
        actualizarNombreCliente,
        cerrarCuentaMesa,
        agregarAlCarrito,
        quitarDelCarrito,
        actualizarEspecificaciones,
        limpiarCarrito,
        enviarComandaACocina,
        marcarNotificacionLeida,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders debe usarse dentro de un OrdersProvider');
  }
  return context;
}
