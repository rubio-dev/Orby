import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { mostrarAviso } from '@/lib/confirm';
import { supabase_configurado } from '@/lib/env';
import {
  aplicarColaSobreComandas,
  contarCambiosPendientes,
  crearOperacionesCambioEstado,
  crearOperacionesCompletarComanda,
  crearOperacionTiempoEstimado,
  ESTADO_COMANDA,
  ESTADO_DETALLE,
  mapearComandaCocina,
  procesarCola,
  SELECT_COMANDA_COCINA,
  type ComandaCocina,
  type EjecutorConRed,
  type OperacionCocina,
} from '@/lib/kitchen-network';
import { obtener_supabase } from '@/lib/supabase';

// CONTEXTO DE COCINA
// Datos reales de la cocina: comandas abiertas de su cafetería con sus productos, las cerradas
// de hoy (historial), la cola de cambios sin conexión y Realtime.
// Se monta solo en src/app/(cocina)/_layout.tsx, así que no afecta a los otros roles.
// No reemplaza a orders-context: ese sigue siendo del mesero (mesas, carrito y su cola de mesas).
//
// Todo cambio de la cocina pasa por la cola, haya conexión o no. Así hay un solo camino:
// los cambios siempre salen en orden y con las mismas reglas (ver src/lib/kitchen-network.ts).

// CONSTANTES
// Igual que la cola de catálogo y de mesas de Gael: se reintenta cada 12 s mientras haya pendientes
const INTERVALO_REINTENTO_MS = 12000;
// Realtime puede mandar varios eventos seguidos (una comanda con 5 productos = 6 eventos):
// se espera un momento y se recarga una sola vez
const ESPERA_RECARGA_REALTIME_MS = 400;

const claveCola = (idCafeteria: string) => `@orby_cola_cocina_${idCafeteria}`;
const claveCopia = (idCafeteria: string) => `@orby_cocina_comandas_${idCafeteria}`;

// La función de reintentos de Gael (7000 ms, 3 intentos), con la forma que espera la cola
const conRed: EjecutorConRed = (operacion) => con_reintentos(operacion);

function esUuidValido(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Medianoche de hoy en la hora del teléfono; el historial muestra lo de "hoy" del local
function inicioDeHoyIso() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy.toISOString();
}

// AYUDAS PARA LAS PANTALLAS
// Están aquí (y no en cada pantalla) para que el inicio y la lista de comandas cuenten igual.

// Un producto "en espera" es el que la cocina todavía no termina
export function estaEnEspera(id_estado: number) {
  return id_estado === ESTADO_DETALLE.pendiente || id_estado === ESTADO_DETALLE.en_preparacion;
}

// "preparacion": le falta algo. "listos": no le falta nada y hay algo listo para llevar.
// "sin_pendientes": todo se entregó o se canceló, o la cuenta aún no tiene productos.
export function clasificarComanda(
  comanda: ComandaCocina
): 'preparacion' | 'listos' | 'sin_pendientes' {
  if (comanda.detalles.some((d) => estaEnEspera(d.id_estado))) return 'preparacion';
  if (comanda.detalles.some((d) => d.id_estado === ESTADO_DETALLE.listo)) return 'listos';
  return 'sin_pendientes';
}

// La espera se mide por producto, desde su fecha_creacion (ver docs/decisions.md):
// un postre pedido a las 14:30 no lleva esperando desde que se abrió la cuenta a la 13:00.
// Para la tarjeta de la comanda se toma el producto en espera más antiguo.
export function minutosDeEspera(comanda: ComandaCocina, ahora: number) {
  const enEspera = comanda.detalles.filter((d) => estaEnEspera(d.id_estado));
  const desde = enEspera.length > 0 ? enEspera[0].fecha_creacion : comanda.fecha_creacion;
  return Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60000));
}

// "Espera promedio" del inicio: cuánto llevan esperando, en promedio, los productos en espera.
// null si no hay ninguno (la pantalla muestra 0).
export function esperaPromedioMinutos(comandas: ComandaCocina[], ahora: number) {
  const tiempos = comandas.flatMap((c) =>
    c.detalles
      .filter((d) => estaEnEspera(d.id_estado))
      .map((d) => (ahora - new Date(d.fecha_creacion).getTime()) / 60000)
  );
  if (tiempos.length === 0) return null;
  return Math.max(0, Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length));
}

// TIPOS
type KitchenContextType = {
  comandasAbiertas: ComandaCocina[]; // Ya incluyen los cambios que siguen en la cola
  comandasCerradasHoy: ComandaCocina[];
  cargando: boolean; // Primera carga, sin nada que mostrar todavía
  recargando: boolean; // Deslizar hacia abajo
  sinConexion: boolean;
  // Entró como usuario demo (sin sesión de Supabase) o la sesión es de otra persona.
  // Sin sesión real, RLS devuelve 0 filas SIN error: la cocina vería todo en 0 creyendo
  // que no hay pedidos. Por eso se avisa en lugar de consultar.
  sinSesionReal: boolean;
  cambiosPendientes: number;
  recargar: (opciones?: { manual?: boolean }) => Promise<void>;
  cambiarEstadoProducto: (id_comanda: string, id_detalle: string, estado: number) => Promise<void>;
  cambiarTiempoEstimado: (id_comanda: string, id_detalle: string, minutos: number) => Promise<void>;
  completarComanda: (id_comanda: string) => Promise<{ marcados: number }>;
};

const KitchenContext = createContext<KitchenContextType | undefined>(undefined);

export function KitchenProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const idCafeteria = esUuidValido(usuario?.id_cafeteria) ? usuario!.id_cafeteria : null;
  const idUsuario = usuario?.id_usuario ?? null;

  // SESIÓN REAL
  // auth-context (compartido, no se toca) entra con un usuario demo si el login de Supabase
  // falla, aunque sea por una contraseña autollenada mal. Aquí se revisa que exista una
  // sesión de Supabase y que sea de este mismo usuario antes de consultar o enviar nada.
  // Se guarda de qué usuario es el resultado: si cambia el usuario, el resultado viejo no
  // sirve y se considera "verificando" hasta que llegue el nuevo (sin setState en el efecto)
  const [revision, setRevision] = useState<{ idUsuario: string; real: boolean } | null>(null);
  const estadoSesion: 'verificando' | 'real' | 'falsa' =
    !supabase_configurado || !idUsuario
      ? 'falsa'
      : revision?.idUsuario !== idUsuario
        ? 'verificando'
        : revision.real
          ? 'real'
          : 'falsa';
  const sesionReal = estadoSesion === 'real';
  // "conectado" = se puede hablar con Supabase en nombre de esta cocina
  const conectado = supabase_configurado && idCafeteria !== null && sesionReal;

  // Se pone en true cuando ya se leyó la copia y la cola del teléfono; hasta entonces no se
  // consulta el servidor, para que la copia vieja no llegue tarde y pise datos nuevos
  const [almacenListo, setAlmacenListo] = useState(false);

  const [abiertasServidor, setAbiertasServidor] = useState<ComandaCocina[]>([]);
  const [cerradasHoy, setCerradasHoy] = useState<ComandaCocina[]>([]);
  const [cola, setCola] = useState<OperacionCocina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);

  // Las funciones asíncronas leen de refs para no trabajar con una copia vieja del estado
  const colaRef = useRef<OperacionCocina[]>([]);
  const sincronizandoRef = useRef(false);
  const cargandoRef = useRef(false);
  const idCafeteriaRef = useRef(idCafeteria);

  // Va antes que el efecto de INICIO: los efectos corren en orden, así que cuando INICIO
  // carga los datos, el ref ya apunta a la cafetería nueva
  useEffect(() => {
    idCafeteriaRef.current = idCafeteria;
  }, [idCafeteria]);

  // COLA: guardar en memoria y en el teléfono (por cafetería, como la de Gael)
  const guardarCola = useCallback(async (nueva: OperacionCocina[]) => {
    colaRef.current = nueva;
    setCola(nueva);
    const id = idCafeteriaRef.current;
    if (!id) return;
    try {
      await AsyncStorage.setItem(claveCola(id), JSON.stringify(nueva));
    } catch (e) {
      console.warn('No se pudo guardar la cola de cocina en el teléfono:', e);
    }
  }, []);

  // CARGA DESDE SUPABASE
  const cargarComandas = useCallback(async (): Promise<'ok' | 'red' | 'error'> => {
    const id = idCafeteriaRef.current;
    if (!conectado || !id) return 'error';
    if (cargandoRef.current) return 'ok';
    cargandoRef.current = true;

    try {
      const supabase = obtener_supabase();
      const [abiertas, cerradas] = await Promise.all([
        conRed(
          async () =>
            await supabase
              .from('comanda')
              .select(SELECT_COMANDA_COCINA)
              .eq('id_cafeteria', id)
              .eq('id_estado', ESTADO_COMANDA.abierta)
              .order('fecha_creacion', { ascending: true })
        ),
        // No hay fecha de cierre en la tabla: "de hoy" = cuentas abiertas hoy que ya se cerraron
        conRed(
          async () =>
            await supabase
              .from('comanda')
              .select(SELECT_COMANDA_COCINA)
              .eq('id_cafeteria', id)
              .eq('id_estado', ESTADO_COMANDA.cerrada)
              .gte('fecha_creacion', inicioDeHoyIso())
              .order('fecha_creacion', { ascending: false })
        ),
      ]);

      if (abiertas.fallo_red || cerradas.fallo_red) {
        setSinConexion(true);
        return 'red';
      }

      const error = abiertas.resultado?.error ?? cerradas.resultado?.error;
      if (error) {
        console.warn('Error al cargar comandas de cocina:', error);
        mostrarAviso('No se pudieron cargar las comandas', traducir_error(error));
        return 'error';
      }

      // El SELECT se arma con texto concatenado, así que TypeScript no deduce el tipo de las
      // filas; mapearComandaCocina es quien las revisa y convierte
      const nuevasAbiertas = (
        (abiertas.resultado?.data ?? []) as unknown as Record<string, unknown>[]
      ).map(mapearComandaCocina);
      const nuevasCerradas = (
        (cerradas.resultado?.data ?? []) as unknown as Record<string, unknown>[]
      ).map(mapearComandaCocina);

      // Si cambió de cafetería mientras cargaba, esta respuesta ya no sirve
      if (idCafeteriaRef.current !== id) return 'ok';

      setAbiertasServidor(nuevasAbiertas);
      setCerradasHoy(nuevasCerradas);
      setSinConexion(false);

      // Copia en el teléfono para mostrar algo si la app se abre sin conexión
      AsyncStorage.setItem(
        claveCopia(id),
        JSON.stringify({ abiertas: nuevasAbiertas, cerradas: nuevasCerradas })
      ).catch((e) => console.warn('No se pudo guardar la copia de comandas:', e));

      return 'ok';
    } catch (e) {
      console.warn('Excepción al cargar comandas de cocina:', e);
      return 'error';
    } finally {
      cargandoRef.current = false;
    }
  }, [conectado]);

  // ENVÍO DE LA COLA
  const sincronizar = useCallback(async () => {
    // Sin sesión real (conectado = false) la cola NO se envía: por RLS la cuenta "no existiría"
    // y los cambios se descartarían como "la cuenta ya no existe". Se quedan guardados
    // hasta que la cocina vuelva a entrar bien.
    if (!conectado || sincronizandoRef.current || colaRef.current.length === 0) return;
    sincronizandoRef.current = true;

    try {
      // Se envía una foto de la cola; lo que se agregue mientras tanto se respeta al final
      const enviada = colaRef.current;
      const resultado = await procesarCola(enviada, { supabase: obtener_supabase(), conRed });
      const agregadasMientras = colaRef.current.slice(enviada.length);
      await guardarCola([...resultado.restantes, ...agregadasMientras]);

      setSinConexion(resultado.detenida === 'red');

      // Los cambios que no se aplicaron se explican todos juntos en un solo aviso
      const mensajes = resultado.descartadas.map((d) => d.mensaje).filter((m) => m !== '');
      if (mensajes.length > 0) {
        mostrarAviso(
          mensajes.length === 1 ? 'Un cambio no se aplicó' : `${mensajes.length} cambios no se aplicaron`,
          mensajes.join('\n\n')
        );
      }

      // Si algo se aplicó o se descartó, se trae lo que de verdad quedó en el servidor
      if (resultado.aplicadas.length > 0 || resultado.descartadas.length > 0) {
        await cargarComandas();
      }
    } catch (e) {
      console.warn('Excepción al sincronizar la cola de cocina:', e);
    } finally {
      sincronizandoRef.current = false;
    }
  }, [conectado, guardarCola, cargarComandas]);

  // Primero se envía lo pendiente y luego se carga, para ver el resultado ya aplicado
  const sincronizarYCargar = useCallback(async () => {
    if (!conectado) return 'error' as const;
    await sincronizar();
    return cargarComandas();
  }, [conectado, sincronizar, cargarComandas]);

  // Lo mismo, con el indicador de "deslizar hacia abajo" y el aviso si no hay conexión
  const recargar = useCallback(
    async (opciones?: { manual?: boolean }) => {
      if (!conectado) return;
      if (opciones?.manual) setRecargando(true);
      try {
        const estado = await sincronizarYCargar();
        if (estado === 'red' && opciones?.manual) {
          mostrarAviso('Sin conexión', MENSAJE_SIN_CONEXION);
        }
      } finally {
        if (opciones?.manual) setRecargando(false);
      }
    },
    [conectado, sincronizarYCargar]
  );

  // REVISAR LA SESIÓN: al entrar y cada vez que Supabase avise un cambio
  // (inicio de sesión, cierre, renovación del token o sesión vencida que no se pudo renovar)
  useEffect(() => {
    if (!supabase_configurado || !idUsuario) return; // Ya se deduce "falsa" arriba

    let activo = true;
    const supabase = obtener_supabase();

    const revisar = (sesion: Session | null) => {
      if (!activo) return;
      setRevision({ idUsuario, real: !!sesion && sesion.user.id === idUsuario });
    };

    // Sin internet, renovar un token vencido falla por red: eso no significa que la sesión
    // sea falsa. Si aún no había resultado, se da por real y la franja dirá "Sin conexión";
    // si ya había uno, se respeta.
    const dudaPorRed = () => {
      if (!activo) return;
      setRevision((previa) =>
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
        console.warn('No se pudo revisar la sesión de cocina:', e);
        dudaPorRed();
      });

    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => revisar(sesion));

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, [idUsuario]);

  // INICIO: copia guardada y cola del teléfono (no usa la red; los datos frescos
  // se piden en el efecto de abajo, cuando además haya sesión real)
  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      setAlmacenListo(false);
      setCargando(true);
      setAbiertasServidor([]);
      setCerradasHoy([]);
      colaRef.current = [];
      setCola([]);

      if (!idCafeteria) {
        setCargando(false);
        return;
      }

      try {
        const [copia, colaGuardada] = await Promise.all([
          AsyncStorage.getItem(claveCopia(idCafeteria)),
          AsyncStorage.getItem(claveCola(idCafeteria)),
        ]);
        if (cancelado) return;
        if (copia) {
          const datos = JSON.parse(copia) as { abiertas: ComandaCocina[]; cerradas: ComandaCocina[] };
          setAbiertasServidor(datos.abiertas ?? []);
          setCerradasHoy(datos.cerradas ?? []);
        }
        if (colaGuardada) {
          const guardada = JSON.parse(colaGuardada) as OperacionCocina[];
          colaRef.current = guardada;
          setCola(guardada);
        }
      } catch (e) {
        console.warn('No se pudo leer la copia de cocina del teléfono:', e);
      }

      if (cancelado) return;
      setCargando(false);
      setAlmacenListo(true);
    }

    iniciar();
    return () => {
      cancelado = true;
    };
  }, [idCafeteria]);

  // DATOS FRESCOS: en cuanto hay sesión real y ya se leyó el teléfono.
  // También corre al volver a entrar bien después de una sesión falsa.
  useEffect(() => {
    if (!conectado || !almacenListo) return;
    let cancelado = false;

    // Igual que en INICIO: el trabajo va en una función asíncrona. Así el estado solo
    // cambia cuando responde el servidor y, si el efecto se limpia antes, no se pide nada.
    async function pedirDatos() {
      await Promise.resolve();
      if (!cancelado) await sincronizarYCargar();
    }

    pedirDatos().catch(console.warn);
    return () => {
      cancelado = true;
    };
  }, [conectado, almacenListo, sincronizarYCargar]);

  // REALTIME: cualquier cambio en las comandas o sus productos recarga la lista.
  // RLS filtra los eventos: cada cocina solo recibe los de su cafetería.
  useEffect(() => {
    if (!conectado || !idCafeteria) return;

    const supabase = obtener_supabase();
    let espera: ReturnType<typeof setTimeout> | null = null;
    let seCayo = false; // Para recargar al reconectar y no perder lo que pasó mientras tanto
    let activo = true;

    const programarRecarga = () => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => {
        cargarComandas().catch(console.warn);
      }, ESPERA_RECARGA_REALTIME_MS);
    };

    const canal: RealtimeChannel = supabase
      .channel(`cocina-${idCafeteria}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comanda', filter: `id_cafeteria=eq.${idCafeteria}` },
        programarRecarga
      )
      // detalle_comanda no tiene id_cafeteria: el filtro lo hace RLS (detalle_lectura_cafeteria)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_comanda' }, programarRecarga)
      .subscribe((estado) => {
        if (!activo) return; // Al desmontar también llega CLOSED; no es una caída
        if (estado === 'SUBSCRIBED') {
          if (seCayo) {
            seCayo = false;
            recargar().catch(console.warn);
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
  }, [conectado, idCafeteria, cargarComandas, recargar]);

  // AL VOLVER A LA APP y CADA 12 s mientras haya pendientes o falte conexión (igual que Gael)
  const hayAlgoPendiente = cola.length > 0 || sinConexion;
  useEffect(() => {
    if (!conectado) return;

    const suscripcion = AppState.addEventListener('change', (siguiente: AppStateStatus) => {
      if (siguiente === 'active') recargar().catch(console.warn);
    });

    const intervalo = hayAlgoPendiente
      ? setInterval(() => {
          recargar().catch(console.warn);
        }, INTERVALO_REINTENTO_MS)
      : null;

    return () => {
      suscripcion.remove();
      if (intervalo) clearInterval(intervalo);
    };
  }, [conectado, hayAlgoPendiente, recargar]);

  // ACCIONES DE LAS PANTALLAS
  // Lo que se ve en pantalla ya incluye la cola, así que el "estado anterior" que guarda
  // cada cambio es el que la cocina tenía delante al tocar el botón.
  const comandasAbiertas = useMemo(
    () => aplicarColaSobreComandas(abiertasServidor, cola),
    [abiertasServidor, cola]
  );

  const encolar = useCallback(
    async (ops: OperacionCocina[]) => {
      if (ops.length === 0) return;
      await guardarCola([...colaRef.current, ...ops]);
      // Se intenta enviar de inmediato; si no hay red, se queda en la cola
      sincronizar().catch(console.warn);
    },
    [guardarCola, sincronizar]
  );

  const buscar = useCallback(
    (id_comanda: string, id_detalle?: string) => {
      const comanda = comandasAbiertas.find((c) => c.id_comanda === id_comanda);
      const detalle = comanda?.detalles.find((d) => d.id_detalle === id_detalle);
      return { comanda, detalle };
    },
    [comandasAbiertas]
  );

  const cambiarEstadoProducto = useCallback(
    async (id_comanda: string, id_detalle: string, estado: number) => {
      const { comanda, detalle } = buscar(id_comanda, id_detalle);
      if (!comanda || !detalle || detalle.id_estado === estado) return;
      await encolar(crearOperacionesCambioEstado(comanda, detalle, estado));
    },
    [buscar, encolar]
  );

  const cambiarTiempoEstimado = useCallback(
    async (id_comanda: string, id_detalle: string, minutos: number) => {
      const { comanda, detalle } = buscar(id_comanda, id_detalle);
      if (!comanda || !detalle || detalle.tiempo_estimado === minutos) return;
      await encolar([crearOperacionTiempoEstimado(comanda, detalle, minutos)]);
    },
    [buscar, encolar]
  );

  const completarComanda = useCallback(
    async (id_comanda: string) => {
      const { comanda } = buscar(id_comanda);
      if (!comanda) return { marcados: 0 };
      const ops = crearOperacionesCompletarComanda(comanda);
      await encolar(ops);
      return { marcados: ops.filter((op) => op.tipo === 'estado_detalle').length };
    },
    [buscar, encolar]
  );

  return (
    <KitchenContext.Provider
      value={{
        comandasAbiertas,
        comandasCerradasHoy: cerradasHoy,
        cargando,
        recargando,
        sinConexion,
        // Solo cuenta si hay .env: sin Supabase configurado, cerrar sesión no arregla nada
        sinSesionReal: supabase_configurado && estadoSesion === 'falsa',
        cambiosPendientes: contarCambiosPendientes(cola),
        recargar,
        cambiarEstadoProducto,
        cambiarTiempoEstimado,
        completarComanda,
      }}
    >
      {children}
    </KitchenContext.Provider>
  );
}

export function useKitchen() {
  const contexto = useContext(KitchenContext);
  if (!contexto) {
    throw new Error('useKitchen debe usarse dentro de un KitchenProvider (src/app/(cocina)/_layout.tsx)');
  }
  return contexto;
}
