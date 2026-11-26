// REGLAS DE VALIDACIÓN COMPARTIDAS
// Viven aquí (y no en cada pantalla) para que el formulario, el contexto y la base de datos
// apliquen los mismos límites. Las funciones que devuelven string|null devuelven el mensaje
// de error listo para mostrar, o null cuando el dato es válido.

// LÍMITES DE TEXTO (coinciden con las columnas de Supabase o son más estrictos)
export const MAX_LARGO_NOMBRE = 80;
export const MAX_LARGO_NOMBRE_CAFETERIA = 80;
export const MAX_LARGO_PRODUCTO = 120; // producto.nombre_producto varchar(120)
export const MAX_LARGO_DESCRIPCION_PRODUCTO = 200; // producto.descripcion varchar(200)
export const MAX_LARGO_ESPECIFICACIONES = 200; // detalle_comanda.especificaciones varchar(255)
export const MAX_LARGO_NOMBRE_CLIENTE = 60;

// LÍMITES DEL NEGOCIO
export const MIN_PRECIO_PRODUCTO = 0.01;
export const MAX_PRECIO_PRODUCTO = 99999.99;
export const MAX_NUMERO_MESA = 200;
export const MAX_CANTIDAD_POR_PRODUCTO = 20;
export const MAX_CANTIDAD_TOTAL_PEDIDO = 80;

// IMÁGENES DE PRODUCTO
export const MAX_IMAGEN_BYTES = 5 * 1024 * 1024; // 5 MB
export const FORMATOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Limpia espacios repetidos y de los extremos. Se usa antes de guardar nombres.
export function limpiar_espacios(texto: string) {
  return texto.replace(/\s+/g, ' ').trim();
}

// Compara nombres ignorando mayúsculas, acentos y espacios repetidos.
// Sirve para detectar "Café Latte" y "cafe latte" como el mismo nombre.
export function normalizar_para_comparar(texto: string) {
  return limpiar_espacios(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Recorta un texto al máximo permitido sin partir un carácter raro por la mitad.
export function limitar_texto(texto: string, maximo: number) {
  return texto.length > maximo ? texto.slice(0, maximo) : texto;
}

// PERSONAS Y CAFETERÍA
const CARACTERES_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;
const CARACTERES_CAFETERIA = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,'&()\-]+$/;
const CARACTERES_CLIENTE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,'&()/#\-]+$/;
const AL_MENOS_DOS_LETRAS = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ].*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

export function validar_nombre_persona(nombre: string): string | null {
  const limpio = limpiar_espacios(nombre);

  if (limpio.length < 3) {
    return 'Escribe el nombre completo (mínimo 3 caracteres).';
  }

  if (limpio.length > MAX_LARGO_NOMBRE) {
    return `El nombre no puede pasar de ${MAX_LARGO_NOMBRE} caracteres.`;
  }

  if (!AL_MENOS_DOS_LETRAS.test(limpio)) {
    return 'El nombre debe incluir al menos dos letras.';
  }

  if (!CARACTERES_NOMBRE.test(limpio)) {
    return 'El nombre solo puede llevar letras, espacios, apóstrofes, puntos y guiones.';
  }

  return null;
}

export function validar_nombre_cafeteria(nombre: string): string | null {
  const limpio = limpiar_espacios(nombre);

  if (limpio.length < 2) {
    return 'Escribe el nombre de tu cafetería (mínimo 2 caracteres).';
  }

  if (limpio.length > MAX_LARGO_NOMBRE_CAFETERIA) {
    return `El nombre de la cafetería no puede pasar de ${MAX_LARGO_NOMBRE_CAFETERIA} caracteres.`;
  }

  if (!AL_MENOS_DOS_LETRAS.test(limpio)) {
    return 'El nombre de la cafetería debe incluir al menos dos letras.';
  }

  if (!CARACTERES_CAFETERIA.test(limpio)) {
    return 'Usa solo letras, números, espacios y signos como & . , \' ( ) -';
  }

  return null;
}

export function validar_nombre_cliente(nombre: string): string | null {
  const limpio = limpiar_espacios(nombre);

  if (limpio.length < 2) {
    return 'Escribe el nombre del cliente (mínimo 2 caracteres).';
  }

  if (limpio.length > MAX_LARGO_NOMBRE_CLIENTE) {
    return `El nombre del cliente no puede pasar de ${MAX_LARGO_NOMBRE_CLIENTE} caracteres.`;
  }

  if (!AL_MENOS_DOS_LETRAS.test(limpio)) {
    return 'El nombre del cliente debe incluir al menos dos letras.';
  }

  if (!CARACTERES_CLIENTE.test(limpio)) {
    return 'El nombre del cliente tiene símbolos no permitidos.';
  }

  return null;
}

// PRODUCTOS
export function validar_nombre_producto(nombre: string): string | null {
  const limpio = limpiar_espacios(nombre);

  if (limpio.length < 2) {
    return 'Escribe el nombre del producto (mínimo 2 caracteres).';
  }

  if (limpio.length > MAX_LARGO_PRODUCTO) {
    return `El nombre del producto no puede pasar de ${MAX_LARGO_PRODUCTO} caracteres.`;
  }

  // Evita saltos de línea y caracteres de control en una tarjeta del menú.
  if (/[\u0000-\u001F\u007F]/.test(limpio)) {
    return 'El nombre del producto tiene caracteres no permitidos.';
  }

  return null;
}

export function validar_nombre_categoria(nombre: string): string | null {
  const limpio = limpiar_espacios(nombre);

  if (limpio.length < 2) {
    return 'Escribe el nombre de la categoría (mínimo 2 caracteres).';
  }

  if (limpio.length > 60) {
    return 'El nombre de la categoría no puede pasar de 60 caracteres.';
  }

  return null;
}

// Convierte lo escrito en el campo de precio a número. Acepta "$80", "80.50" y "80,50".
export function parsear_precio(texto: string): number | null {
  const limpio = texto.replace(/[^\d.,-]/g, '').trim();
  if (!limpio) return null;

  let normalizado = limpio;
  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');

  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    // El último separador se toma como decimal; el otro es de miles.
    normalizado =
      ultimaComa > ultimoPunto
        ? limpio.replace(/\./g, '').replace(',', '.')
        : limpio.replace(/,/g, '');
  } else if (ultimaComa !== -1) {
    normalizado = limpio.replace(',', '.');
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

export function validar_precio_producto(precio: number): string | null {
  if (!Number.isFinite(precio) || precio <= 0) {
    return 'El precio debe ser mayor a $0.';
  }

  if (precio < MIN_PRECIO_PRODUCTO) {
    return `El precio mínimo es $${MIN_PRECIO_PRODUCTO.toFixed(2)}.`;
  }

  if (precio > MAX_PRECIO_PRODUCTO) {
    return `El precio máximo permitido es $${MAX_PRECIO_PRODUCTO.toLocaleString('es-MX')}.`;
  }

  return null;
}

// MESAS Y CARRITO
export function validar_numero_mesa(numero: number): string | null {
  if (!Number.isInteger(numero) || numero <= 0) {
    return 'El número de mesa debe ser un entero mayor a 0.';
  }

  if (numero > MAX_NUMERO_MESA) {
    return `El número de mesa no puede pasar de ${MAX_NUMERO_MESA}.`;
  }

  return null;
}

export function validar_cantidad_producto(cantidad: number): string | null {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return 'La cantidad debe ser un entero mayor a 0.';
  }

  if (cantidad > MAX_CANTIDAD_POR_PRODUCTO) {
    return `Solo se permiten ${MAX_CANTIDAD_POR_PRODUCTO} unidades por producto.`;
  }

  return null;
}

// IMÁGENES
export function normalizar_mime_imagen(mime?: string | null): string | null {
  if (!mime) return null;
  const limpio = mime.toLowerCase().split(';')[0].trim();
  if (limpio === 'image/jpg') return 'image/jpeg';
  return limpio;
}

export function validar_tamano_imagen(bytes?: number | null): string | null {
  if (bytes == null || bytes <= 0) {
    return null; // Sin dato de tamaño no se puede rechazar por peso; el formato sí se valida.
  }

  if (bytes > MAX_IMAGEN_BYTES) {
    return `La imagen pesa ${(bytes / (1024 * 1024)).toFixed(1)} MB. El máximo es 5 MB.`;
  }

  return null;
}

export function validar_formato_imagen(mime?: string | null): string | null {
  const normalizado = normalizar_mime_imagen(mime);
  if (!normalizado) {
    return 'No se pudo identificar el formato de la imagen. Usa JPG, PNG o WEBP.';
  }

  if (!FORMATOS_IMAGEN_PERMITIDOS.includes(normalizado as (typeof FORMATOS_IMAGEN_PERMITIDOS)[number])) {
    return 'Formato no permitido. Usa una imagen JPG, PNG o WEBP.';
  }

  return null;
}

// Calcula los bytes reales de un base64 (sin contar el encabezado data:image/...).
export function bytes_de_base64(base64: string): number {
  const limpio = base64.replace(/[\r\n\s]/g, '');
  if (!limpio) return 0;
  const padding = limpio.endsWith('==') ? 2 : limpio.endsWith('=') ? 1 : 0;
  return Math.floor((limpio.length * 3) / 4) - padding;
}

export function validar_url_imagen(url: string): string | null {
  const limpia = url.trim();
  if (!limpia) return null; // Quitar la imagen es válido.

  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(limpia)) {
    return null;
  }

  if (!/^https?:\/\//i.test(limpia)) {
    return 'La URL de la imagen debe empezar con http:// o https://.';
  }

  if (/\s/.test(limpia)) {
    return 'La URL de la imagen no puede tener espacios.';
  }

  return null;
}
