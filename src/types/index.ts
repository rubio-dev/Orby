// TIPOS DE LA APLICACIÓN ORBY
// Representan las entidades del modelo de datos de Supabase y el estado de la app

export type RolUsuario = 'administrador' | 'mesero' | 'cocina';

export const ID_ROLES: Record<RolUsuario, number> = {
  administrador: 1,
  mesero: 2,
  cocina: 3,
};

export const NOMBRES_ROLES: Record<number, RolUsuario> = {
  1: 'administrador',
  2: 'mesero',
  3: 'cocina',
};

export type Usuario = {
  id_usuario: string;
  id_cafeteria: string;
  nombre: string;
  correo: string;
  id_rol: number;
  rol: RolUsuario;
  foto?: string | null;
  push_token?: string | null;
};

export type Categoria = {
  id_categoria: string;
  id_cafeteria?: string;
  nombre_categoria: string;
};

export type Producto = {
  id_producto: string;
  id_cafeteria?: string;
  id_categoria: string;
  nombre_categoria?: string;
  nombre_producto: string;
  descripcion: string;
  precio: number;
  imagen_url?: string | null;
  estado: boolean; // true = disponible, false = inactivo
};

export type EstadoMesa = 'libre' | 'ocupada' | 'apartada' | 'inactiva';

export type Mesa = {
  id_mesa: string;
  id_cafeteria?: string;
  num_mesa: number;
  id_estado: number;
  estado: EstadoMesa;
};

export type EstadoComanda = 'pendiente' | 'en preparación' | 'listo' | 'entregada' | 'cancelada';

export type DetalleComanda = {
  id_detalle: string;
  id_comanda: string;
  id_producto: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  especificaciones?: string;
  id_estado: number;
  tiempo_estimado_minutos?: number;
};

export type Comanda = {
  id_comanda: string;
  id_cafeteria?: string;
  id_mesa: string;
  num_mesa: number;
  id_usuario: string;
  nombre_mesero?: string;
  id_estado: number;
  estado: EstadoComanda;
  total: number;
  fecha_creacion: string;
  detalles: DetalleComanda[];
};

export type EstadisticasVenta = {
  ventas_totales_diarias: number;
  porcentaje_cambio_ventas: number;
  pedidos_diarios: number;
  porcentaje_cambio_pedidos: number;
  productos_mas_vendidos: {
    posicion: number;
    nombre: string;
    cantidad: number;
  }[];
};

