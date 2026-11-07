import AsyncStorage from '@react-native-async-storage/async-storage';
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
  traducir_error,
} from '@/lib/auth';
import { supabase_configurado } from '@/lib/env';
import { obtener_supabase } from '@/lib/supabase';
import type { Comanda, EstadoMesa, Mesa } from '@/types';

const STORAGE_KEY_MESAS = '@orby_mesas';
const STORAGE_KEY_COMANDAS = '@orby_comandas';
const STORAGE_KEY_NOTIFICACIONES = '@orby_notificaciones';

const claveColaMesas = (idCafeteria: string) => `@orby_cola_mesas_${idCafeteria}`;

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

export type NotificacionItem = {
  id_notificacion: string;
  num_mesa: number;
  tiempo: string;
  leida: boolean;
  fecha: string;
};

// 11 mesas iniciales según la captura de la página 7 y 8
const MESAS_INICIALES: Mesa[] = [
  { id_mesa: 'mesa-1', num_mesa: 1, id_estado: 1, estado: 'libre' },
  { id_mesa: 'mesa-2', num_mesa: 2, id_estado: 1, estado: 'libre' },
  { id_mesa: 'mesa-3', num_mesa: 3, id_estado: 3, estado: 'apartada' },
  { id_mesa: 'mesa-4', num_mesa: 4, id_estado: 1, estado: 'libre' },
  { id_mesa: 'mesa-5', num_mesa: 5, id_estado: 2, estado: 'ocupada' },
  { id_mesa: 'mesa-6', num_mesa: 6, id_estado: 1, estado: 'libre' },
  { id_mesa: 'mesa-7', num_mesa: 7, id_estado: 3, estado: 'apartada' },
  { id_mesa: 'mesa-8', num_mesa: 8, id_estado: 1, estado: 'libre' },
  { id_mesa: 'mesa-9', num_mesa: 9, id_estado: 1, estado: 'libre' },
  { id_mesa: 'mesa-10', num_mesa: 10, id_estado: 2, estado: 'ocupada' },
  { id_mesa: 'mesa-11', num_mesa: 11, id_estado: 1, estado: 'libre' },
];

// Comandas iniciales según las capturas de página 11 y 12
const COMANDAS_INICIALES: Comanda[] = [
  {
    id_comanda: 'ord-1',
    id_mesa: 'mesa-4',
    num_mesa: 4,
    id_usuario: 'usr-2',
    nombre_mesero: 'Liz',
    id_estado: 1, // 1=abierta (en preparación según detalles)
    estado: 'en preparación',
    total: 220,
    fecha_creacion: new Date(Date.now() - 2 * 60000).toISOString(),
    detalles: [
      {
        id_detalle: 'det-1',
        id_comanda: 'ord-1',
        id_producto: 'prod-4',
        nombre_producto: 'Chocolate Caliente',
        cantidad: 1,
        precio_unitario: 50,
        tiempo_estimado_minutos: 5,
        id_estado: 2, // en preparación
      },
      {
        id_detalle: 'det-2',
        id_comanda: 'ord-1',
        id_producto: 'prod-6',
        nombre_producto: 'Chilaquiles',
        cantidad: 1,
        precio_unitario: 120,
        tiempo_estimado_minutos: 20,
        especificaciones: 'Sin cebolla',
        id_estado: 2,
      },
      {
        id_detalle: 'det-3',
        id_comanda: 'ord-1',
        id_producto: 'prod-9',
        nombre_producto: 'Cheesecake',
        cantidad: 1,
        precio_unitario: 50,
        tiempo_estimado_minutos: 5,
        id_estado: 3, // listo
      },
    ],
  },
  {
    id_comanda: 'ord-2',
    id_mesa: 'mesa-5',
    num_mesa: 5,
    id_usuario: 'usr-2',
    nombre_mesero: 'Liz',
    id_estado: 1,
    estado: 'en preparación',
    total: 200,
    fecha_creacion: new Date(Date.now() - 2 * 60000).toISOString(),
    detalles: [
      {
        id_detalle: 'det-4',
        id_comanda: 'ord-2',
        id_producto: 'prod-2',
        nombre_producto: 'Latte',
        cantidad: 1,
        precio_unitario: 70,
        id_estado: 2,
      },
      {
        id_detalle: 'det-5',
        id_comanda: 'ord-2',
        id_producto: 'prod-3',
        nombre_producto: 'Frappé',
        cantidad: 2,
        precio_unitario: 65,
        id_estado: 2,
      },
    ],
  },
  {
    id_comanda: 'ord-3',
    id_mesa: 'mesa-6',
    num_mesa: 6,
    id_usuario: 'usr-2',
    nombre_mesero: 'Liz',
    id_estado: 1,
    estado: 'en preparación',
    total: 170,
    fecha_creacion: new Date(Date.now() - 5 * 60000).toISOString(),
    detalles: [
      {
        id_detalle: 'det-6',
        id_comanda: 'ord-3',
        id_producto: 'prod-7',
        nombre_producto: 'Pasta pesto',
        cantidad: 1,
        precio_unitario: 110,
        id_estado: 2,
      },
      {
        id_detalle: 'det-7',
        id_comanda: 'ord-3',
        id_producto: 'prod-5',
        nombre_producto: 'Licuado de fresa',
        cantidad: 1,
        precio_unitario: 60,
        id_estado: 2,
      },
    ],
  },
  {
    id_comanda: 'ord-4',
    id_mesa: 'mesa-7',
    num_mesa: 7,
    id_usuario: 'usr-2',
    nombre_mesero: 'Liz',
    id_estado: 1,
    estado: 'en preparación',
    total: 280,
    fecha_creacion: new Date(Date.now() - 10 * 60000).toISOString(),
    detalles: [
      {
        id_detalle: 'det-8',
        id_comanda: 'ord-4',
        id_producto: 'prod-7',
        nombre_producto: 'Pasta pesto',
        cantidad: 2,
        precio_unitario: 110,
        id_estado: 2,
      },
      {
        id_detalle: 'det-9',
        id_comanda: 'ord-4',
        id_producto: 'prod-5',
        nombre_producto: 'Licuado de fresa',
        cantidad: 1,
        precio_unitario: 60,
        id_estado: 2,
      },
    ],
  },
  {
    id_comanda: 'ord-5',
    id_mesa: 'mesa-8',
    num_mesa: 8,
    id_usuario: 'usr-2',
    nombre_mesero: 'Liz',
    id_estado: 1,
    estado: 'en preparación',
    total: 510,
    fecha_creacion: new Date(Date.now() - 15 * 60000).toISOString(),
    detalles: [
      {
        id_detalle: 'det-10',
        id_comanda: 'ord-5',
        id_producto: 'prod-8',
        nombre_producto: 'Burritos de machaca',
        cantidad: 3,
        precio_unitario: 90,
        id_estado: 2,
      },
      {
        id_detalle: 'det-11',
        id_comanda: 'ord-5',
        id_producto: 'prod-5',
        nombre_producto: 'Licuados',
        cantidad: 4,
        precio_unitario: 60,
        id_estado: 2,
      },
    ],
  },
  {
    id_comanda: 'ord-6',
    id_mesa: 'mesa-9',
    num_mesa: 9,
    id_usuario: 'usr-2',
    nombre_mesero: 'Liz',
    id_estado: 1,
    estado: 'en preparación',
    total: 460,
    fecha_creacion: new Date(Date.now() - 16 * 60000).toISOString(),
    detalles: [
      {
        id_detalle: 'det-12',
        id_comanda: 'ord-6',
        id_producto: 'prod-8',
        nombre_producto: 'Burritos de machaca',
        cantidad: 3,
        precio_unitario: 90,
        id_estado: 2,
      },
      {
        id_detalle: 'det-13',
        id_comanda: 'ord-6',
        id_producto: 'prod-5',
        nombre_producto: 'Licuados',
        cantidad: 2,
        precio_unitario: 60,
        id_estado: 2,
      },
      {
        id_detalle: 'det-14',
        id_comanda: 'ord-6',
        id_producto: 'prod-2',
        nombre_producto: 'Latte',
        cantidad: 1,
        precio_unitario: 70,
        id_estado: 2,
      },
    ],
  },
  {
    id_comanda: 'ord-7',
    id_mesa: 'mesa-10',
    num_mesa: 10,
    id_usuario: 'usr-2',
    nombre_mesero: 'Liz',
    id_estado: 1,
    estado: 'listo',
    total: 120,
    fecha_creacion: new Date(Date.now() - 25 * 60000).toISOString(),
    detalles: [
      {
        id_detalle: 'det-15',
        id_comanda: 'ord-7',
        id_producto: 'prod-1',
        nombre_producto: 'Café Americano',
        cantidad: 2,
        precio_unitario: 60,
        id_estado: 3,
      },
    ],
  },
];

// Notificaciones iniciales de pedidos listos según página 4
const NOTIFICACIONES_INICIALES: NotificacionItem[] = [
  { id_notificacion: 'not-1', num_mesa: 5, tiempo: 'hace 1 min', leida: false, fecha: new Date().toISOString() },
  { id_notificacion: 'not-2', num_mesa: 6, tiempo: 'hace 1 min', leida: false, fecha: new Date().toISOString() },
  { id_notificacion: 'not-3', num_mesa: 8, tiempo: 'hace 2 min', leida: true, fecha: new Date().toISOString() },
  { id_notificacion: 'not-4', num_mesa: 10, tiempo: 'hace 5 min', leida: true, fecha: new Date().toISOString() },
];

export type ItemCarrito = {
  id_producto: string;
  nombre_producto: string;
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
  agregarAlCarrito: (producto: ItemCarrito) => void;
  quitarDelCarrito: (id_producto: string) => void;
  actualizarEspecificaciones: (id_producto: string, especificaciones: string) => void;
  limpiarCarrito: () => void;
  enviarComandaACocina: (especificacionesGenerales?: string) => Promise<{ exito: boolean; comanda?: Comanda; error?: string }>;
  actualizarEstadoDetalle: (id_comanda: string, id_detalle: string, nuevoEstado: number) => Promise<void>;
  actualizarTiempoEstimadoDetalle: (id_comanda: string, id_detalle: string, minutos: number) => Promise<void>;
  completarComanda: (id_comanda: string) => Promise<void>;
  marcarNotificacionLeida: (id_notificacion: string) => void;
};

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const idCafeteria = usuario?.id_cafeteria;
  const storageKeyMesas = idCafeteria ? `@orby_mesas_${idCafeteria}` : STORAGE_KEY_MESAS;

  const [mesas, setMesas] = useState<Mesa[]>(MESAS_INICIALES);
  const [cargandoMesas, setCargandoMesas] = useState<boolean>(false);
  const [comandas, setComandas] = useState<Comanda[]>(COMANDAS_INICIALES);
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>(NOTIFICACIONES_INICIALES);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number>(5);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([
    {
      id_producto: 'prod-4',
      nombre_producto: 'Chocolate Caliente',
      precio: 50,
      cantidad: 1,
      especificaciones: 'Descripción',
      imagen_url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=300&auto=format&fit=crop&q=80',
    },
    {
      id_producto: 'prod-6',
      nombre_producto: 'Chilaquiles',
      precio: 120,
      cantidad: 1,
      especificaciones: 'Descripción',
      imagen_url: 'https://images.unsplash.com/photo-1640719028984-5142fa661837?w=300&auto=format&fit=crop&q=80',
    },
    {
      id_producto: 'prod-9',
      nombre_producto: 'Cheesecake',
      precio: 50,
      cantidad: 1,
      especificaciones: 'Descripción',
      imagen_url: 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=300&auto=format&fit=crop&q=80',
    },
  ]);

  const [colaPendienteMesas, setColaPendienteMesas] = useState<OperacionColaMesa[]>([]);
  const [sincronizandoColaMesas, setSincronizandoColaMesas] = useState<boolean>(false);
  const sincronizandoColaRef = useRef(false);

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

  // Cargar estado inicial persistente y sincronizar cuando haya cafetería
  useEffect(() => {
    async function inicializar() {
      try {
        const [mesasGuardadas, comandasGuardadas, notificacionesGuardadas, colaGuardada] =
          await Promise.all([
            AsyncStorage.getItem(storageKeyMesas),
            AsyncStorage.getItem(STORAGE_KEY_COMANDAS),
            AsyncStorage.getItem(STORAGE_KEY_NOTIFICACIONES),
            idCafeteria ? AsyncStorage.getItem(claveColaMesas(idCafeteria)) : Promise.resolve(null),
          ]);

        if (mesasGuardadas) {
          setMesas(JSON.parse(mesasGuardadas));
        } else if (!idCafeteria) {
          setMesas(MESAS_INICIALES);
        }

        if (comandasGuardadas) setComandas(JSON.parse(comandasGuardadas));
        if (notificacionesGuardadas) setNotificaciones(JSON.parse(notificacionesGuardadas));
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

  const seleccionarMesa = (num_mesa: number) => {
    setMesaSeleccionada(num_mesa);
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
  };

  // Enviar pedido armado a cocina
  const enviarComandaACocina = async (especificacionesGenerales?: string) => {
    if (carrito.length === 0) {
      return { exito: false, error: 'El carrito está vacío' };
    }

    const mesaActual = mesas.find((m) => m.num_mesa === mesaSeleccionada);
    const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const idComanda = `com-${Date.now()}`;
    const idMesa = mesaActual?.id_mesa ?? `mesa-${mesaSeleccionada}`;

    const nuevaComanda: Comanda = {
      id_comanda: idComanda,
      id_cafeteria: idCafeteria,
      id_mesa: idMesa,
      num_mesa: mesaSeleccionada,
      id_usuario: usuario?.id_usuario ?? 'usr-2',
      nombre_mesero: usuario?.nombre ?? 'Liz',
      id_estado: 1, // 1 = abierta en modelo comanda
      estado: 'en preparación',
      total,
      fecha_creacion: new Date().toISOString(),
      detalles: carrito.map((item, idx) => ({
        id_detalle: `det-${Date.now()}-${idx}`,
        id_comanda: idComanda,
        id_producto: item.id_producto,
        nombre_producto: item.nombre_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        especificaciones: item.especificaciones || especificacionesGenerales,
        id_estado: 2, // 2 = en preparación en detalle_comanda
        tiempo_estimado_minutos: 15,
      })),
    };

    const actualizadas = [nuevaComanda, ...comandas];
    setComandas(actualizadas);
    await AsyncStorage.setItem(STORAGE_KEY_COMANDAS, JSON.stringify(actualizadas));

    // Cambiar la mesa a ocupada automáticamente
    await cambiarEstadoMesa(mesaSeleccionada, 'ocupada');

    // Limpiar carrito
    limpiarCarrito();

    // Sincronizar en segundo plano si Supabase está activo
    if (supabase_configurado && idCafeteria) {
      try {
        const supabase = obtener_supabase();
        await supabase.from('comanda').insert({
          id_cafeteria: idCafeteria,
          id_mesa: idMesa,
          id_usuario: usuario?.id_usuario,
          id_estado: 1, // 1 = abierta
          total,
        });
      } catch (err) {
        console.warn('Error al guardar comanda en Supabase:', err);
      }
    }

    return { exito: true, comanda: nuevaComanda };
  };

  // Cocina actualiza el estado de un producto (1: pendiente, 2: en preparación, 3: listo)
  const actualizarEstadoDetalle = async (id_comanda: string, id_detalle: string, nuevoEstado: number) => {
    const actualizadas = comandas.map((c) => {
      if (c.id_comanda !== id_comanda) return c;
      const nuevosDetalles = c.detalles.map((d) =>
        d.id_detalle === id_detalle ? { ...d, id_estado: nuevoEstado } : d
      );
      return { ...c, detalles: nuevosDetalles };
    });

    setComandas(actualizadas);
    await AsyncStorage.setItem(STORAGE_KEY_COMANDAS, JSON.stringify(actualizadas));
  };

  // Cocina asigna tiempo estimado por producto
  const actualizarTiempoEstimadoDetalle = async (id_comanda: string, id_detalle: string, minutos: number) => {
    const actualizadas = comandas.map((c) => {
      if (c.id_comanda !== id_comanda) return c;
      const nuevosDetalles = c.detalles.map((d) =>
        d.id_detalle === id_detalle ? { ...d, tiempo_estimado_minutos: minutos } : d
      );
      return { ...c, detalles: nuevosDetalles };
    });

    setComandas(actualizadas);
    await AsyncStorage.setItem(STORAGE_KEY_COMANDAS, JSON.stringify(actualizadas));
  };

  // Cocina completa la orden
  const completarComanda = async (id_comanda: string) => {
    const comandaObj = comandas.find((c) => c.id_comanda === id_comanda);

    const actualizadas = comandas.map((c) =>
      c.id_comanda === id_comanda ? { ...c, id_estado: 1, estado: 'listo' as const } : c
    );

    setComandas(actualizadas);
    await AsyncStorage.setItem(STORAGE_KEY_COMANDAS, JSON.stringify(actualizadas));

    // Generar notificación para el mesero de "Pedido listo"
    if (comandaObj) {
      const nuevaNotif: NotificacionItem = {
        id_notificacion: `not-${Date.now()}`,
        num_mesa: comandaObj.num_mesa,
        tiempo: 'hace 1 min',
        leida: false,
        fecha: new Date().toISOString(),
      };
      const nuevasNotifs = [nuevaNotif, ...notificaciones];
      setNotificaciones(nuevasNotifs);
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFICACIONES, JSON.stringify(nuevasNotifs));
    }
  };

  const marcarNotificacionLeida = (id_notificacion: string) => {
    const actualizadas = notificaciones.map((n) =>
      n.id_notificacion === id_notificacion ? { ...n, leida: true } : n
    );
    setNotificaciones(actualizadas);
    AsyncStorage.setItem(STORAGE_KEY_NOTIFICACIONES, JSON.stringify(actualizadas));
  };

  return (
    <OrdersContext.Provider
      value={{
        mesas,
        cargandoMesas,
        comandas,
        notificaciones,
        mesaSeleccionada,
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
        agregarAlCarrito,
        quitarDelCarrito,
        actualizarEspecificaciones,
        limpiarCarrito,
        enviarComandaACocina,
        actualizarEstadoDetalle,
        actualizarTiempoEstimadoDetalle,
        completarComanda,
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
