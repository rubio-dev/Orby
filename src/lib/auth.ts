import { createClient } from '@supabase/supabase-js'; // Para crear un cliente temporal al registrar empleados

import { supabase_llave, supabase_url } from '@/lib/env'; // Datos de conexión leídos de .env
import { obtener_supabase } from '@/lib/supabase';

// CONSTANTES
// El mockup pide 8 caracteres; supabase/config.toml permite 6, así que 8 cumple con ambos
export const LARGO_MINIMO_CONTRASENA = 8;
export const TIMEOUT_CONEXION_MS = 7000;
export const MAX_INTENTOS_CONEXION = 3;
export const MENSAJE_SIN_CONEXION =
  'No se pudo conectar al servidor. Verifica tu conexión a internet e inténtalo de nuevo.';

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

  if (codigo === 'same_password' || mensaje.includes('different from the old password')) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }

  if (codigo === 'weak_password' || mensaje.includes('password should be at least')) {
    return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  }

  if (
    codigo === 'session_not_found' ||
    mensaje.includes('auth session missing') ||
    mensaje.includes('session_not_found')
  ) {
    return 'Tu sesión ha expirado o estás en modo demostración. Inicia sesión nuevamente con tu cuenta real.';
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

// DETECCIÓN DE ERRORES DE RED O TIMEOUT
export function es_error_red_o_timeout(error: unknown): boolean {
  if (!error) return false;
  const mensaje =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : String(error).toLowerCase();
  const nombre =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name: unknown }).name).toLowerCase()
      : '';
  const codigo =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code).toLowerCase()
      : '';

  const patrones = [
    'timeout_conexion',
    'timeout',
    'failed to fetch',
    'network request failed',
    'networkerror',
    'network error',
    'fetch failed',
    'name resolution failed',
    'unknownhost',
    'connection refused',
    'econnrefused',
    'enotfound',
    'failed to connect',
    'socket',
    'ehostunreach',
    'enetunreach',
    'econnreset',
    'eai_again',
    'net::',
    'authretryablefetcherror',
  ];

  return patrones.some(
    (p) => mensaje.includes(p) || nombre.includes(p) || codigo.includes(p)
  );
}

// UTILIDAD GENÉRICA CON REINTENTOS Y TIMEOUT (HASTA 3 INTENTOS ANTE ERROR DE RED O TIMEOUT)
export async function con_reintentos<T>(
  operacion: () => Promise<T>,
  alReintentar?: (intentoActual: number, maxIntentos: number) => void
): Promise<{ resultado: T | null; fallo_red: boolean }> {
  for (let intento = 1; intento <= MAX_INTENTOS_CONEXION; intento++) {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    try {
      const promesaTimeout = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
          reject(new Error('TIMEOUT_CONEXION'));
        }, TIMEOUT_CONEXION_MS);
      });

      const res = await Promise.race([operacion(), promesaTimeout]);

      if (timerId !== undefined) {
        clearTimeout(timerId);
      }

      const posibleError =
        res && typeof res === 'object' && 'error' in res
          ? (res as { error: unknown }).error
          : null;

      if (posibleError && es_error_red_o_timeout(posibleError)) {
        if (intento < MAX_INTENTOS_CONEXION) {
          alReintentar?.(intento + 1, MAX_INTENTOS_CONEXION);
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        return { resultado: null, fallo_red: true };
      }

      return { resultado: res, fallo_red: false };
    } catch (err: unknown) {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }

      if (es_error_red_o_timeout(err)) {
        if (intento < MAX_INTENTOS_CONEXION) {
          alReintentar?.(intento + 1, MAX_INTENTOS_CONEXION);
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        return { resultado: null, fallo_red: true };
      }

      throw err;
    }
  }

  return { resultado: null, fallo_red: true };
}

// REGISTRO DE EMPLEADOS EN SUPABASE (MESERO O COCINA)
// El administrador ya tiene sesión iniciada. Si usáramos el cliente principal, signUp
// cambiaría la sesión del administrador por la del empleado nuevo.
// Por eso se crea un cliente TEMPORAL que no guarda sesión: registra al empleado y se descarta.
// La función handle_new_user de la base de datos crea su perfil en public.usuario.
// Nota: cuando se despliegue la Edge Function 'registrar-empleado' (supabase/functions), se puede
// usar en lugar de esto; es más segura porque revisa en el servidor que quien registra sea administrador.
export async function registrar_empleado_supabase(
  datos: {
    nombre: string;
    correo: string;
    contrasena: string;
    rol: 'mesero' | 'cocina';
    id_cafeteria: string;
  },
  alReintentar?: (intentoActual: number, maxIntentos: number) => void
): Promise<{ id_usuario: string | null; error: string | null }> {
  const cliente_temporal = createClient(supabase_url, supabase_llave, {
    auth: {
      persistSession: false, // No guarda la sesión del empleado en el teléfono
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'orby-registro-empleado', // Clave distinta para no chocar con la sesión del administrador
    },
  });

  const { resultado, fallo_red } = await con_reintentos<{
    data: { user: { id: string; identities?: unknown[] } | null } | null;
    error: ErrorSupabase;
  }>(
    () =>
      (cliente_temporal.auth as any).signUp({
        email: datos.correo.trim().toLowerCase(),
        password: datos.contrasena,
        options: {
          data: {
            rol: datos.rol, // 'mesero' o 'cocina' (texto exacto de la tabla role)
            nombre: datos.nombre.trim(),
            id_cafeteria: datos.id_cafeteria, // La función lo liga a la cafetería del administrador
          },
        },
      }),
    alReintentar
  );

  if (fallo_red || !resultado) {
    return { id_usuario: null, error: MENSAJE_SIN_CONEXION };
  }

  const { data, error } = resultado;

  if (error) {
    return { id_usuario: null, error: traducir_error(error) };
  }

  // Con confirmación de correo activa, Supabase no marca error si el correo ya existe:
  // devuelve un usuario sin identidades. Así lo detectamos.
  if (!data || !data.user || data.user.identities?.length === 0) {
    return { id_usuario: null, error: 'Ya existe una cuenta con ese correo.' };
  }

  return { id_usuario: data.user.id, error: null };
}

export async function cambiar_contrasena_supabase(
  nuevaContrasena: string,
  alReintentar?: (intentoActual: number, maxIntentos: number) => void,
  correoActual?: string
): Promise<{ exito: boolean; error: string | null }> {
  const supabase = obtener_supabase();
  const cliente_verificacion = correoActual
    ? createClient(supabase_url, supabase_llave, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'orby-verificar-contrasena',
        },
      })
    : null;

  for (let intento = 1; intento <= MAX_INTENTOS_CONEXION; intento++) {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    try {
      const promesaTimeout = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
          reject(new Error('TIMEOUT_CONEXION'));
        }, TIMEOUT_CONEXION_MS);
      });

      const ejecutarOperacion = async () => {
        // 1. Verificar en Supabase Auth (por comparación de hash bcrypt en el servidor)
        //    si la nueva contraseña es igual a la contraseña activa en auth.users.
        if (cliente_verificacion && correoActual) {
          const verificacion = await cliente_verificacion.auth.signInWithPassword({
            email: correoActual.trim().toLowerCase(),
            password: nuevaContrasena,
          });

          if (!verificacion.error && verificacion.data.user) {
            return {
              error: {
                code: 'same_password',
                message: 'New password should be different from the old password.',
              },
            };
          }

          if (verificacion.error && es_error_red_o_timeout(verificacion.error)) {
            return { error: verificacion.error };
          }
        }

        // 2. Si no es la misma contraseña, actualizar en Supabase Auth
        return await supabase.auth.updateUser({ password: nuevaContrasena });
      };

      const resultado = await Promise.race([ejecutarOperacion(), promesaTimeout]);

      if (timerId !== undefined) {
        clearTimeout(timerId);
      }

      if (resultado.error) {
        if (es_error_red_o_timeout(resultado.error)) {
          if (intento < MAX_INTENTOS_CONEXION) {
            alReintentar?.(intento + 1, MAX_INTENTOS_CONEXION);
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          return {
            exito: false,
            error: MENSAJE_SIN_CONEXION,
          };
        }

        return { exito: false, error: traducir_error(resultado.error) };
      }

      return { exito: true, error: null };
    } catch (err: any) {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }

      if (es_error_red_o_timeout(err)) {
        if (intento < MAX_INTENTOS_CONEXION) {
          alReintentar?.(intento + 1, MAX_INTENTOS_CONEXION);
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        return {
          exito: false,
          error: MENSAJE_SIN_CONEXION,
        };
      }

      return {
        exito: false,
        error: traducir_error({
          message: err?.message ?? 'Error inesperado al actualizar la contraseña.',
          code: err?.code ?? null,
        }),
      };
    }
  }

  return {
    exito: false,
    error: MENSAJE_SIN_CONEXION,
  };
}
