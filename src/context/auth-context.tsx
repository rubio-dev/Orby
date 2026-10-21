import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { registrar_empleado_supabase, traducir_error } from '@/lib/auth'; // Alta real de empleados y mensajes de error en español
import { supabase_configurado } from '@/lib/env';
import { obtener_supabase } from '@/lib/supabase';
import { ID_ROLES, NOMBRES_ROLES, type RolUsuario, type Usuario } from '@/types';

// CLAVE PARA ALMACENAR LA SESIÓN LOCALMENTE
const STORAGE_KEY_USUARIO = '@orby_usuario_sesion';
const STORAGE_KEY_PERSONAL = '@orby_personal_registrado';

// USUARIOS DEMO PARA MODO SIN CONEXIÓN O PRUEBAS RÁPIDAS
const USUARIOS_DEMO: Record<string, Usuario> = {
  'admin@orby.com': {
    id_usuario: '11111111-1111-1111-1111-111111111111',
    id_cafeteria: '00000000-0000-0000-0000-000000000001',
    nombre: 'Gael Guzmán',
    correo: 'admin@orby.com',
    id_rol: 1,
    rol: 'administrador',
    foto: null,
  },
  'mesero@orby.com': {
    id_usuario: '22222222-2222-2222-2222-222222222222',
    id_cafeteria: '00000000-0000-0000-0000-000000000001',
    nombre: 'Liz Morales',
    correo: 'mesero@orby.com',
    id_rol: 2,
    rol: 'mesero',
    foto: null,
  },
  'cocina@orby.com': {
    id_usuario: '33333333-3333-3333-3333-333333333333',
    id_cafeteria: '00000000-0000-0000-0000-000000000001',
    nombre: 'Emilio Sánchez',
    correo: 'cocina@orby.com',
    id_rol: 3,
    rol: 'cocina',
    foto: null,
  },
};

const PERSONAL_INICIAL: Usuario[] = [
  USUARIOS_DEMO['mesero@orby.com'],
  USUARIOS_DEMO['cocina@orby.com'],
  {
    id_usuario: '44444444-4444-4444-4444-444444444444',
    id_cafeteria: '00000000-0000-0000-0000-000000000001',
    nombre: 'Carlos Ruiz',
    correo: 'carlos@orby.com',
    id_rol: 2,
    rol: 'mesero',
  },
  {
    id_usuario: '55555555-5555-5555-5555-555555555555',
    id_cafeteria: '00000000-0000-0000-0000-000000000001',
    nombre: 'Sofía Lara',
    correo: 'sofia@orby.com',
    id_rol: 3,
    rol: 'cocina',
  },
];

type AuthContextType = {
  usuario: Usuario | null;
  estaCargando: boolean;
  listaPersonal: Usuario[];
  iniciarSesion: (correo: string, contrasena: string) => Promise<{ exito: boolean; rol?: RolUsuario; error?: string }>;
  registrarAdministrador: (datos: {
    nombre: string;
    nombreCafeteria: string;
    correo: string;
    contrasena: string;
  }) => Promise<{ exito: boolean; error?: string }>;
  cerrarSesion: () => Promise<void>;
  seleccionarUsuarioDemo: (rol: RolUsuario) => Promise<void>;
  registrarPersonal: (datos: {
    nombre: string;
    correo: string;
    contrasena: string;
    rol: RolUsuario;
  }) => Promise<{ exito: boolean; error?: string }>;
  eliminarPersonal: (id_usuario: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estaCargando, setEstaCargando] = useState(true);
  const [listaPersonal, setListaPersonal] = useState<Usuario[]>(PERSONAL_INICIAL);

  // Cargar usuario guardado y lista de personal al iniciar
  useEffect(() => {
    async function restaurarSesion() {
      try {
        const [usuarioGuardado, personalGuardado] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_USUARIO),
          AsyncStorage.getItem(STORAGE_KEY_PERSONAL),
        ]);

        if (usuarioGuardado) {
          setUsuario(JSON.parse(usuarioGuardado));
        }

        if (personalGuardado) {
          setListaPersonal(JSON.parse(personalGuardado));
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
    const correoNormalizado = correo.trim().toLowerCase();

    // 1. Si Supabase está configurado, intentar autenticación con Supabase
    if (supabase_configurado) {
      try {
        const supabase = obtener_supabase();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: correoNormalizado,
          password: contrasena,
        });

        if (!authError && authData.user) {
          // Obtener datos del perfil en la tabla 'usuario'
          const { data: usuarioDb, error: usuarioError } = await supabase
            .from('usuario')
            .select('*')
            .eq('id_usuario', authData.user.id)
            .single();

          if (!usuarioError && usuarioDb) {
            const rolNombre = NOMBRES_ROLES[usuarioDb.id_rol] ?? 'mesero';
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
          }
        }
      } catch (e: any) {
        console.warn('Error en Supabase auth (intentando fallback local/demo):', e?.message);
      }
    }

    // 2. Fallback de usuarios demo y empleados registrados en modo local
    const demo = USUARIOS_DEMO[correoNormalizado];
    if (demo) {
      setUsuario(demo);
      await AsyncStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(demo));
      return { exito: true, rol: demo.rol };
    }

    const personal = listaPersonal.find((p) => p.correo.toLowerCase() === correoNormalizado);
    if (personal) {
      setUsuario(personal);
      await AsyncStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(personal));
      return { exito: true, rol: personal.rol };
    }

    return { exito: false, error: 'Credenciales inválidas o usuario no registrado.' };
  };

  // Selector de usuario para pruebas locales
  const seleccionarUsuarioDemo = async (rol: RolUsuario) => {
    let demo: Usuario;
    if (rol === 'administrador') demo = USUARIOS_DEMO['admin@orby.com'];
    else if (rol === 'mesero') demo = USUARIOS_DEMO['mesero@orby.com'];
    else demo = USUARIOS_DEMO['cocina@orby.com'];

    setUsuario(demo);
    await AsyncStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(demo));
  };

  // Registrar nuevo empleado (Cocinero o Mesero) por el Administrador
  const registrarPersonal = async (datos: {
    nombre: string;
    correo: string;
    contrasena: string;
    rol: RolUsuario;
  }) => {
    // 1. Regla de seguridad: Solo un Administrador puede registrar personal
    if (usuario?.rol !== 'administrador') {
      return { exito: false, error: 'Permisos insuficientes: solo el administrador puede registrar empleados.' };
    }

    const correoNormalizado = datos.correo.trim().toLowerCase();

    // Validar duplicado en lista activa
    const existe = listaPersonal.some((p) => p.correo.toLowerCase() === correoNormalizado);
    if (existe) {
      return { exito: false, error: 'Ya existe un empleado con este correo electrónico.' };
    }

    const idRol = ID_ROLES[datos.rol];
    const nuevoEmpleado: Usuario = {
      id_usuario: `usr-${Date.now()}`,
      id_cafeteria: usuario?.id_cafeteria ?? '00000000-0000-0000-0000-000000000001',
      nombre: datos.nombre.trim(),
      correo: correoNormalizado,
      id_rol: idRol,
      rol: datos.rol,
    };

    // 2. Si Supabase está disponible, se crea la cuenta REAL del empleado (auth.users + public.usuario).
    //    Antes se llamaba a la Edge Function 'registrar-empleado'; si no está desplegada, el empleado
    //    solo quedaba guardado en el teléfono y después no podía iniciar sesión.
    //    Mientras se despliega, se usa un cliente temporal (ver src/lib/auth.ts).
    if (supabase_configurado) {
      if (datos.rol !== 'mesero' && datos.rol !== 'cocina') {
        return { exito: false, error: 'Solo se puede registrar a meseros o cocina.' };
      }

      const resultado = await registrar_empleado_supabase({
        nombre: datos.nombre,
        correo: correoNormalizado,
        contrasena: datos.contrasena,
        rol: datos.rol,
        id_cafeteria: usuario.id_cafeteria, // La cafetería del administrador que lo registra
      });

      // Si Supabase rechazó el registro, se avisa y NO se agrega a la lista
      if (resultado.error || !resultado.id_usuario) {
        return { exito: false, error: resultado.error ?? 'No se pudo registrar al empleado.' };
      }

      nuevoEmpleado.id_usuario = resultado.id_usuario; // Mismo UUID que en auth.users
    }

    const nuevaLista = [nuevoEmpleado, ...listaPersonal];
    setListaPersonal(nuevaLista);
    await AsyncStorage.setItem(STORAGE_KEY_PERSONAL, JSON.stringify(nuevaLista));

    return { exito: true };
  };

  const eliminarPersonal = async (id_usuario: string) => {
    if (usuario?.rol !== 'administrador') {
      console.warn('Solo el administrador puede eliminar empleados.');
      return;
    }

    const filtrada = listaPersonal.filter((p) => p.id_usuario !== id_usuario);
    setListaPersonal(filtrada);
    await AsyncStorage.setItem(STORAGE_KEY_PERSONAL, JSON.stringify(filtrada));

    if (supabase_configurado) {
      try {
        const supabase = obtener_supabase();
        await supabase.from('usuario').delete().eq('id_usuario', id_usuario);
      } catch (err) {
        console.warn('Error al eliminar de Supabase:', err);
      }
    }
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

    let idUsuarioFinal = `adm-${Date.now()}`;
    let idCafeteriaFinal = `caf-${Date.now()}`;

    // 1. Registro en Supabase si está configurado
    // signUp guarda el correo y la contraseña cifrada en auth.users. Los datos extra van en 'data'
    // (metadatos) y la función handle_new_user crea la cafetería y el perfil en public.usuario
    // con el mismo UUID. Si algo falla, se avisa: NO se inicia una sesión falsa.
    if (supabase_configurado) {
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

      idUsuarioFinal = usuarioDb.id_usuario;
      idCafeteriaFinal = usuarioDb.id_cafeteria;
    }

    // 2. Crear sesión activa del nuevo administrador y persistir
    const nuevoAdmin: Usuario = {
      id_usuario: idUsuarioFinal,
      id_cafeteria: idCafeteriaFinal,
      nombre,
      correo: correoNormalizado,
      id_rol: 1,
      rol: 'administrador',
    };

    setUsuario(nuevoAdmin);
    await AsyncStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(nuevoAdmin));

    return { exito: true };
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
        listaPersonal,
        iniciarSesion,
        registrarAdministrador,
        cerrarSesion,
        seleccionarUsuarioDemo,
        registrarPersonal,
        eliminarPersonal,
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
