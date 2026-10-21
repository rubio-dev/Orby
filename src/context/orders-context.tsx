import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase_configurado } from '@/lib/env';
import { obtener_supabase } from '@/lib/supabase';
import type { Comanda, EstadoMesa, Mesa } from '@/types';

const STORAGE_KEY_MESAS = '@orby_mesas';
const STORAGE_KEY_COMANDAS = '@orby_comandas';
const STORAGE_KEY_NOTIFICACIONES = '@orby_notificaciones';

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
    id_estado: 2, // en preparación
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
    id_estado: 2,
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
    id_estado: 2,
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
    id_estado: 2,
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
    id_estado: 2,
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
    id_estado: 2,
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
    id_estado: 3, // listo
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

type OrdersContextType = {
  mesas: Mesa[];
  comandas: Comanda[];
  notificaciones: NotificacionItem[];
  mesaSeleccionada: number;
  carrito: ItemCarrito[];
  cambiarEstadoMesa: (num_mesa: number, nuevo_estado: EstadoMesa) => Promise<void>;
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
  const [mesas, setMesas] = useState<Mesa[]>(MESAS_INICIALES);
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

  // Cargar estado inicial persistente
  useEffect(() => {
    async function cargarDatos() {
      try {
        const [mesasGuardadas, comandasGuardadas, notificacionesGuardadas] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_MESAS),
          AsyncStorage.getItem(STORAGE_KEY_COMANDAS),
          AsyncStorage.getItem(STORAGE_KEY_NOTIFICACIONES),
        ]);

        if (mesasGuardadas) setMesas(JSON.parse(mesasGuardadas));
        if (comandasGuardadas) setComandas(JSON.parse(comandasGuardadas));
        if (notificacionesGuardadas) setNotificaciones(JSON.parse(notificacionesGuardadas));
      } catch (e) {
        console.warn('Error al cargar datos de órdenes:', e);
      }
    }
    cargarDatos();
  }, []);

  // Cambiar estado de una mesa (Libre, Ocupada, Apartada)
  const cambiarEstadoMesa = async (num_mesa: number, nuevo_estado: EstadoMesa) => {
    const estadoMap: Record<EstadoMesa, number> = {
      libre: 1,
      ocupada: 2,
      apartada: 3,
      inactiva: 4,
    };

    const actualizadas = mesas.map((m) =>
      m.num_mesa === num_mesa ? { ...m, estado: nuevo_estado, id_estado: estadoMap[nuevo_estado] } : m
    );
    setMesas(actualizadas);
    await AsyncStorage.setItem(STORAGE_KEY_MESAS, JSON.stringify(actualizadas));

    if (supabase_configurado) {
      try {
        const supabase = obtener_supabase();
        await supabase
          .from('mesa')
          .update({ id_estado: estadoMap[nuevo_estado] })
          .eq('num_mesa', num_mesa);
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

    const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const idComanda = `com-${Date.now()}`;

    const nuevaComanda: Comanda = {
      id_comanda: idComanda,
      id_mesa: `mesa-${mesaSeleccionada}`,
      num_mesa: mesaSeleccionada,
      id_usuario: 'usr-2',
      nombre_mesero: 'Liz',
      id_estado: 2, // en preparación
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
        id_estado: 2,
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
    if (supabase_configurado) {
      try {
        const supabase = obtener_supabase();
        await supabase.from('comanda').insert({
          id_cafeteria: '00000000-0000-0000-0000-000000000001',
          id_mesa: nuevaComanda.id_mesa,
          id_usuario: nuevaComanda.id_usuario,
          id_estado: 2,
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
      c.id_comanda === id_comanda ? { ...c, id_estado: 3, estado: 'listo' as const } : c
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
        comandas,
        notificaciones,
        mesaSeleccionada,
        carrito,
        cambiarEstadoMesa,
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
