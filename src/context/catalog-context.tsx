import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase_configurado } from '@/lib/env';
import { obtener_supabase } from '@/lib/supabase';
import type { Categoria, EstadisticasVenta, Producto } from '@/types';

const STORAGE_KEY_PRODUCTOS = '@orby_productos';

const CATEGORIAS_INICIALES: Categoria[] = [
  { id_categoria: 'cat-1', nombre_categoria: 'Bebidas' },
  { id_categoria: 'cat-2', nombre_categoria: 'Comida' },
  { id_categoria: 'cat-3', nombre_categoria: 'Postres' },
];

const PRODUCTOS_INICIALES: Producto[] = [
  {
    id_producto: 'prod-1',
    id_categoria: 'cat-1',
    nombre_categoria: 'Bebidas',
    nombre_producto: 'Café Americano',
    descripcion: 'Espresso doble rebajado con agua caliente a punto.',
    precio: 60,
    imagen_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-2',
    id_categoria: 'cat-1',
    nombre_categoria: 'Bebidas',
    nombre_producto: 'Latte',
    descripcion: 'Espresso equilibrado con leche vaporizada y capa fina de microespuma.',
    precio: 70,
    imagen_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-3',
    id_categoria: 'cat-1',
    nombre_categoria: 'Bebidas',
    nombre_producto: 'Frappé',
    descripcion: 'Bebida helada cremosa a base de café y jarabe artesanal.',
    precio: 65,
    imagen_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-4',
    id_categoria: 'cat-1',
    nombre_categoria: 'Bebidas',
    nombre_producto: 'Chocolate Caliente',
    descripcion: 'Chocolate de origen con notas de canela y leche entera cremosa.',
    precio: 50,
    imagen_url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-5',
    id_categoria: 'cat-1',
    nombre_categoria: 'Bebidas',
    nombre_producto: 'Licuado de fresa',
    descripcion: 'Fresas naturales de temporada con leche y toque de vainilla.',
    precio: 60,
    imagen_url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-6',
    id_categoria: 'cat-2',
    nombre_categoria: 'Comida',
    nombre_producto: 'Chilaquiles',
    descripcion: 'Totopos crujientes con salsa verde o roja, crema, queso y cebolla.',
    precio: 120,
    imagen_url: 'https://images.unsplash.com/photo-1640719028984-5142fa661837?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-7',
    id_categoria: 'cat-2',
    nombre_categoria: 'Comida',
    nombre_producto: 'Pasta pesto',
    descripcion: 'Pasta artesanal bañada en salsa de albahaca fresca, piñones y parmesano.',
    precio: 110,
    imagen_url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-8',
    id_categoria: 'cat-2',
    nombre_categoria: 'Comida',
    nombre_producto: 'Burritos de machaca',
    descripcion: 'Tortilla de harina con machaca sonorense norteña y frijoles refritos.',
    precio: 90,
    imagen_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
  {
    id_producto: 'prod-9',
    id_categoria: 'cat-3',
    nombre_categoria: 'Postres',
    nombre_producto: 'Cheesecake',
    descripcion: 'Pastel de queso estilo Nueva York con base de galleta y coulis de frutos.',
    precio: 50,
    imagen_url: 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=300&auto=format&fit=crop&q=80',
    estado: true,
  },
];

const ESTADISTICAS_INICIALES: EstadisticasVenta = {
  ventas_totales_diarias: 20500,
  porcentaje_cambio_ventas: 17,
  pedidos_diarios: 180,
  porcentaje_cambio_pedidos: 8,
  productos_mas_vendidos: [
    { posicion: 1, nombre: 'Latte', cantidad: 30 },
    { posicion: 2, nombre: 'Chocolate', cantidad: 28 },
    { posicion: 3, nombre: 'Frappé', cantidad: 26 },
    { posicion: 4, nombre: 'Americano', cantidad: 20 },
  ],
};

type CatalogContextType = {
  productos: Producto[];
  categorias: Categoria[];
  estadisticas: EstadisticasVenta;
  cambiarEstadoProducto: (id_producto: string, nuevoEstado: boolean) => Promise<void>;
  agregarProducto: (nuevo: Omit<Producto, 'id_producto'>) => Promise<{ exito: boolean; error?: string }>;
  recargarProductos: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>(PRODUCTOS_INICIALES);
  const [categorias] = useState<Categoria[]>(CATEGORIAS_INICIALES);
  const [estadisticas] = useState<EstadisticasVenta>(ESTADISTICAS_INICIALES);

  const recargarDesdeSupabase = async () => {
    if (!supabase_configurado) return;
    try {
      const supabase = obtener_supabase();
      const { data, error } = await supabase.from('producto').select('*');
      if (!error && data && data.length > 0) {
        const formateados: Producto[] = data.map((p) => ({
          id_producto: p.id_producto,
          id_cafeteria: p.id_cafeteria,
          id_categoria: p.id_categoria,
          nombre_producto: p.nombre_producto,
          descripcion: p.descripcion ?? '',
          precio: Number(p.precio),
          imagen_url: p.imagen_url,
          estado: p.estado,
        }));
        setProductos(formateados);
        await AsyncStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(formateados));
      }
    } catch (e) {
      console.warn('Error al consultar productos en Supabase:', e);
    }
  };

  useEffect(() => {
    async function inicializar() {
      try {
        const guardados = await AsyncStorage.getItem(STORAGE_KEY_PRODUCTOS);
        if (guardados) {
          setProductos(JSON.parse(guardados));
        } else if (supabase_configurado) {
          await recargarDesdeSupabase();
        }
      } catch (e) {
        console.warn('Error al cargar productos:', e);
      }
    }
    inicializar();
  }, []);

  const cambiarEstadoProducto = async (id_producto: string, nuevoEstado: boolean) => {
    const actualizados = productos.map((p) =>
      p.id_producto === id_producto ? { ...p, estado: nuevoEstado } : p
    );
    setProductos(actualizados);
    await AsyncStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(actualizados));

    if (supabase_configurado) {
      try {
        const supabase = obtener_supabase();
        await supabase.from('producto').update({ estado: nuevoEstado }).eq('id_producto', id_producto);
      } catch (e) {
        console.warn('Error al actualizar estado en Supabase:', e);
      }
    }
  };

  const agregarProducto = async (nuevo: Omit<Producto, 'id_producto'>) => {
    const idGenerado = `prod-${Date.now()}`;
    const productoCompleto: Producto = {
      ...nuevo,
      id_producto: idGenerado,
    };

    if (supabase_configurado) {
      try {
        const supabase = obtener_supabase();
        const { data, error } = await supabase
          .from('producto')
          .insert({
            id_cafeteria: nuevo.id_cafeteria ?? '00000000-0000-0000-0000-000000000001',
            id_categoria: nuevo.id_categoria,
            nombre_producto: nuevo.nombre_producto,
            descripcion: nuevo.descripcion,
            precio: nuevo.precio,
            imagen_url: nuevo.imagen_url,
            estado: nuevo.estado,
          })
          .select()
          .single();

        if (!error && data) {
          productoCompleto.id_producto = data.id_producto;
        }
      } catch (e) {
        console.warn('Error al guardar producto en Supabase, guardando local:', e);
      }
    }

    const actualizados = [productoCompleto, ...productos];
    setProductos(actualizados);
    await AsyncStorage.setItem(STORAGE_KEY_PRODUCTOS, JSON.stringify(actualizados));

    return { exito: true };
  };

  return (
    <CatalogContext.Provider
      value={{
        productos,
        categorias,
        estadisticas,
        cambiarEstadoProducto,
        agregarProducto,
        recargarProductos: recargarDesdeSupabase,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog debe usarse dentro de un CatalogProvider');
  }
  return context;
}
