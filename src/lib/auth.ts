import { createClient } from '@supabase/supabase-js'; // Para crear un cliente temporal al registrar empleados

import { supabase_llave, supabase_url } from '@/lib/env'; // Datos de conexión leídos de .env

// CONSTANTES
// El mockup pide 8 caracteres; supabase/config.toml permite 6, así que 8 cumple con ambos
export const LARGO_MINIMO_CONTRASENA = 8;

// TIPOS
type ErrorSupabase = { message: string; code?: string | null } | null;

// VALIDACIONES
// Revisa que el correo tenga la forma algo@algo.algo
export function validar_correo(correo: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

// Revisa la contraseña y su confirmación; devuelve el mensaje de error o null si está bien
export function validar_contrasena(contrasena: string, confirmacion: string) {
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }

  if (contrasena !== confirmacion) {
    return 'Las contraseñas no coinciden.';
  }

  return null;
}

// TRADUCCIÓN DE ERRORES
// Supabase responde en inglés; aquí se convierte a un mensaje claro en español
export function traducir_error(error: ErrorSupabase) {
  if (!error) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }

  const codigo = error.code ?? '';
  const mensaje = error.message.toLowerCase();

  if (codigo === 'invalid_credentials' || mensaje.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }

  if (codigo === 'user_already_exists' || mensaje.includes('already registered')) {
    return 'Ya existe una cuenta con ese correo.';
  }

  if (codigo === 'email_not_confirmed' || mensaje.includes('email not confirmed')) {
    return 'Falta confirmar el correo. Revisa tu bandeja de entrada.';
  }

  if (codigo === 'weak_password' || mensaje.includes('password should be')) {
    return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  }

  if (codigo.startsWith('over_') || mensaje.includes('rate limit')) {
    return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
  }

  // La función handle_new_user falló (por ejemplo, el rol no existe en la tabla role)
  if (mensaje.includes('database error saving new user')) {
    return 'La base de datos no pudo crear el perfil. Revisa que existan los roles y la función handle_new_user.';
  }

  if (mensaje.includes('failed to fetch') || mensaje.includes('network request failed')) {
    return 'Sin conexión con el servidor. Revisa tu internet y la URL del archivo .env.';
  }

  return `Error: ${error.message}`;
}

// REGISTRO DE EMPLEADOS EN SUPABASE (MESERO O COCINA)
// El administrador ya tiene sesión iniciada. Si usáramos el cliente principal, signUp
// cambiaría la sesión del administrador por la del empleado nuevo.
// Por eso se crea un cliente TEMPORAL que no guarda sesión: registra al empleado y se descarta.
// La función handle_new_user de la base de datos crea su perfil en public.usuario.
// Nota: cuando se despliegue la Edge Function 'registrar-empleado' (supabase/functions), se puede
// usar en lugar de esto; es más segura porque revisa en el servidor que quien registra sea administrador.
export async function registrar_empleado_supabase(datos: {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: 'mesero' | 'cocina';
  id_cafeteria: string;
}) {
  const cliente_temporal = createClient(supabase_url, supabase_llave, {
    auth: {
      persistSession: false, // No guarda la sesión del empleado en el teléfono
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'orby-registro-empleado', // Clave distinta para no chocar con la sesión del administrador
    },
  });

  const { data, error } = await cliente_temporal.auth.signUp({
    email: datos.correo.trim().toLowerCase(),
    password: datos.contrasena,
    options: {
      data: {
        rol: datos.rol, // 'mesero' o 'cocina' (texto exacto de la tabla role)
        nombre: datos.nombre.trim(),
        id_cafeteria: datos.id_cafeteria, // La función lo liga a la cafetería del administrador
      },
    },
  });

  if (error) {
    return { id_usuario: null, error: traducir_error(error) };
  }

  // Con confirmación de correo activa, Supabase no marca error si el correo ya existe:
  // devuelve un usuario sin identidades. Así lo detectamos.
  if (!data.user || data.user.identities?.length === 0) {
    return { id_usuario: null, error: 'Ya existe una cuenta con ese correo.' };
  }

  return { id_usuario: data.user.id, error: null };
}
