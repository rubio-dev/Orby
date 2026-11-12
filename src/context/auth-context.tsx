import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  cambiar_contrasena_supabase,
  con_reintentos,
  MENSAJE_SIN_CONEXION,
  registrar_empleado_supabase,
  traducir_error,
} from '@/lib/auth'; // Alta real de empleados y mensajes de error en español
import { supabase_configurado } from '@/lib/env';
import { obtener_supabase } from '@/lib/supabase';
import { NOMBRES_ROLES, type RolUsuario, type Usuario } from '@/types';

// CLAVE PARA ALMACENAR LA SESIÓN LOCALMENTE
const STORAGE_KEY_USUARIO = '@orby_usuario_sesion';

type AuthContextType = {
  usuario: Usuario | null;
  estaCargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<{ exito: boolean; rol?: RolUsuario; error?: string }>;
  registrarAdministrador: (datos: {
    nombre: string;
    nombreCafeteria: string;
    correo: string;
    contrasena: string;
  }) => Promise<{ exito: boolean; error?: string }>;
  cerrarSesion: () => Promise<void>;
  registrarPersonal: (
    datos: {
      nombre: string;
      correo: string;
      contrasena: string;
      rol: RolUsuario;
    },
    alReintentar?: (intentoActual: number, maxIntentos: number) => void
  ) => Promise<{ exito: boolean; error?: string }>;
  eliminarPersonal: (
    id_usuario: string,
    alReintentar?: (intentoActual: number, maxIntentos: number) => void
  ) => Promise<{ exito: boolean; error?: string }>;
  cambiarContrasena: (
    nuevaContrasena: string,
    alReintentar?: (intentoActual: number, maxIntentos: number) => void
  ) => Promise<{ exito: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estaCargando, setEstaCargando] = useState(true);

  // Cargar la sesión guardada al iniciar, solo si Supabase todavía la reconoce.
  // Así una cuenta eliminada (por ejemplo, los usuarios demo viejos) no vuelve a entrar.
  useEffect(() => {
    async function restaurarSesion() {
      try {
        const usuarioGuardado = await AsyncStorage.getItem(STORAGE_KEY_USUARIO);
        if (!usuarioGuardado) return;

        const guardado = JSON.parse(usuarioGuardado) as Usuario;

        if (!supabase_configurado) {
          await AsyncStorage.removeItem(STORAGE_KEY_USUARIO);
          return;
        }

        try {
          const { data, error } = await obtener_supabase().auth.getSession();
          if (!error && (!data.session || data.session.user.id !== guardado.id_usuario)) {
            await AsyncStorage.removeItem(STORAGE_KEY_USUARIO);
            return;
          }
          setUsuario(guardado);
        } catch {
          // Sin red no se puede verificar; se conserva la sesión guardada.
          setUsuario(guardado);
        }
      } catch (e) {
        console.warn('Error al restaurar sesión:', e);
      } finally {
        setEstaCargando(false);
      }
    }

    restaurarSesion();
  }, []);

  // Iniciar sesión con correo y contraseña
  const iniciarSesion = async (correo: string, contrasena: string) => {
    if (!supabase_configurado) {
      return {
        exito: false,
        error: 'Supabase no está configurado. Revisa el archivo .env antes de iniciar sesión.',
      };
    }

    const correoNormalizado = correo.trim().toLowerCase();

    try {
      const supabase = obtener_supabase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: correoNormalizado,
        password: contrasena,
      });

      if (authError || !authData.user) {
        return {
          exito: false,
          error: authError ? traducir_error(authError) : 'No se pudo iniciar sesión.',
        };
      }

      // El rol y la cafetería salen del perfil real, no de datos locales.
      const { data: usuarioDb, error: usuarioError } = await supabase
        .from('usuario')
        .select('*')
        .eq('id_usuario', authData.user.id)
        .single();

      if (usuarioError || !usuarioDb) {
        return {
          exito: false,
          error: 'La cuenta existe, pero no tiene perfil en Orby. Pide al administrador que la dé de alta.',
        };
      }

      const rolNombre = NOMBRES_ROLES[usuarioDb.id_rol];
      if (!rolNombre) {
        return { exito: false, error: 'Tu perfil tiene un rol que la app no reconoce.' };
      }

      const usuarioListo: Usuario = {
        id_usuario: usuarioDb.id_usuario,
        id_cafeteria: usuarioDb.id_cafeteria,
        nombre: usuarioDb.nombre,
        correo: authData.user.email ?? correoNormalizado,
        id_rol: usuarioDb.id_rol,
        rol: rolNombre,
        foto: usuarioDb.foto,
        push_token: usuarioDb.push_token,
      };

      setUsuario(usuarioListo);
      await AsyncStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(usuarioListo));
      return { exito: true, rol: usuarioListo.rol };
    } catch (e) {
      console.warn('Error al iniciar sesión:', e);
      return { exito: false, error: MENSAJE_SIN_CONEXION };
    }
  };

  // Registrar nuevo empleado (Cocinero o Mesero) por el Administrador
  const registrarPersonal = async (
    datos: {
      nombre: string;
      correo: string;
      contrasena: string;
      rol: RolUsuario;
    },
    alReintentar?: (intentoActual: number, maxIntentos: number) => void
  ) => {
    if (!supabase_configurado) {
      return {
        exito: false,
        error: 'Supabase no está configurado. No se pueden crear cuentas reales.',
      };
    }

    if (usuario?.rol !== 'administrador') {
      return { exito: false, error: 'Permisos insuficientes: solo el administrador puede registrar empleados.' };
    }

    if (datos.rol !== 'mesero' && datos.rol !== 'cocina') {
      return { exito: false, error: 'Solo se puede registrar a meseros o cocina.' };
    }

    const resultado = await registrar_empleado_supabase(
      {
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim().toLowerCase(),
        contrasena: datos.contrasena,
        rol: datos.rol,
        id_cafeteria: usuario.id_cafeteria, // La cafetería del administrador que lo registra
      },
      alReintentar
    );

    if (resultado.error || !resultado.id_usuario) {
      return { exito: false, error: resultado.error ?? 'No se pudo registrar al empleado.' };
    }

    return { exito: true };
  };

  const eliminarPersonal = async (
    id_usuario: string,
    alReintentar?: (intentoActual: number, maxIntentos: number) => void
  ): Promise<{ exito: boolean; error?: string }> => {
    if (!supabase_configurado) {
      return {
        exito: false,
        error: 'Supabase no está configurado. No se pueden eliminar cuentas reales.',
      };
    }

    if (usuario?.rol !== 'administrador') {
      return { exito: false, error: 'Solo el administrador puede eliminar empleados.' };
    }

    if (id_usuario === usuario.id_usuario) {
      return { exito: false, error: 'No puedes eliminar tu propia cuenta.' };
    }

    const supabase = obtener_supabase();
    // La baja se hace con la función eliminar_empleado (borra la cuenta en auth.users y, en cascada,
    // su perfil) para que el correo quede libre y se pueda registrar de nuevo en el futuro.
    const { resultado, fallo_red } = await con_reintentos<{ error: any }>(
      async () => await supabase.rpc('eliminar_empleado', { p_id_usuario: id_usuario }),
      alReintentar
    );

    if (fallo_red || !resultado) {
      return { exito: false, error: MENSAJE_SIN_CONEXION };
    }

    if (resultado.error) {
      const codigo: string = resultado.error.code ?? '';
      const mensaje: string = resultado.error.message ?? '';

      // La función aún no existe en este proyecto de Supabase
      if (codigo === 'PGRST202' || mensaje.toLowerCase().includes('could not find the function')) {
        return {
          exito: false,
          error: 'Falta aplicar la migración "eliminar_empleado" en Supabase. Avisa al responsable de la base de datos.',
        };
      }

      // Mensajes en español lanzados por la propia función (permisos, empleado no encontrado)
      if (codigo === '42501' || codigo === 'P0002') {
        return { exito: false, error: mensaje };
      }

      return { exito: false, error: traducir_error(resultado.error) };
    }

    return { exito: true };
  };

  // Registrar nuevo Administrador y Cafetería (Inserciones en Supabase)
  const registrarAdministrador = async (datos: {
    nombre: string;
    nombreCafeteria: string;
    correo: string;
    contrasena: string;
  }): Promise<{ exito: boolean; error?: string }> => {
    const correoNormalizado = datos.correo.trim().toLowerCase();
    const nombre = datos.nombre.trim();
    const nombreCafeteria = datos.nombreCafeteria.trim();
    const contrasena = datos.contrasena;

    if (!nombre || !nombreCafeteria || !correoNormalizado || !contrasena) {
      return { exito: false, error: 'Por favor completa todos los campos requeridos.' };
    }

    if (contrasena.length < 6) {
      return { exito: false, error: 'La contraseña debe contener al menos 6 caracteres.' };
    }

    if (!supabase_configurado) {
      return {
        exito: false,
        error: 'Supabase no está configurado. No se puede registrar la cafetería.',
      };
    }

    // signUp guarda el correo y la contraseña cifrada en auth.users. Los datos extra van en 'data'
    // (metadatos) y la función handle_new_user crea la cafetería y el perfil en public.usuario
    // con el mismo UUID. Si algo falla, se avisa: NO se inicia una sesión falsa.
    const supabase = obtener_supabase();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: correoNormalizado,
      password: contrasena,
      options: {
        data: {
          rol: 'administrador', // Texto exacto de la tabla role
          nombre,
          nombre_cafeteria: nombreCafeteria,
        },
      },
    });

    if (authError || !authData.user) {
      return { exito: false, error: traducir_error(authError) };
    }

    // Si el proyecto pide confirmar el correo, la cuenta se crea pero no hay sesión todavía
    if (!authData.session) {
      return {
        exito: false,
        error: 'Cuenta creada. Confirma tu correo y después inicia sesión.',
      };
    }

    // Leer el perfil que creó la función handle_new_user para obtener la cafetería real
    const { data: usuarioDb, error: usuarioError } = await supabase
      .from('usuario')
      .select('id_usuario, id_cafeteria')
      .eq('id_usuario', authData.user.id)
      .maybeSingle();

    if (usuarioError || !usuarioDb) {
      return {
        exito: false,
        error: 'La cuenta se creó, pero no se pudo leer tu perfil. Revisa las políticas RLS de la tabla usuario.',
      };
    }

    // Crear sesión activa del nuevo administrador y persistir
    const nuevoAdmin: Usuario = {
      id_usuario: usuarioDb.id_usuario,
      id_cafeteria: usuarioDb.id_cafeteria,
      nombre,
      correo: correoNormalizado,
      id_rol: 1,
      rol: 'administrador',
    };

    setUsuario(nuevoAdmin);
    await AsyncStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(nuevoAdmin));

    return { exito: true };
  };

  // Cambiar contraseña del usuario autenticado
  const cambiarContrasena = async (
    nuevaContrasena: string,
    alReintentar?: (intentoActual: number, maxIntentos: number) => void
  ): Promise<{ exito: boolean; error?: string }> => {
    if (!usuario) {
      return { exito: false, error: 'No hay una sesión activa.' };
    }

    if (!supabase_configurado) {
      return {
        exito: false,
        error: 'No se pudo conectar al servidor. Verifica la configuración de Supabase.',
      };
    }

    const resultado = await cambiar_contrasena_supabase(
      nuevaContrasena,
      alReintentar,
      usuario.correo
    );
    return { exito: resultado.exito, error: resultado.error ?? undefined };
  };

  // Cerrar sesión
  const cerrarSesion = async () => {
    setUsuario(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_USUARIO);
    } catch (e) {
      console.warn('Error al limpiar sesión de storage:', e);
    }

    if (supabase_configurado) {
      try {
        const supabase = obtener_supabase();
        // Usar timeout corto (500ms) para garantizar navegación instantánea aunque Supabase esté offline
        await Promise.race([
          supabase.auth.signOut().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 500)),
        ]);
      } catch (e) {
        console.warn('Error al cerrar sesión de Supabase:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        estaCargando,
        iniciarSesion,
        registrarAdministrador,
        cerrarSesion,
        registrarPersonal,
        eliminarPersonal,
        cambiarContrasena,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
