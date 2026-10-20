import AsyncStorage from '@react-native-async-storage/async-storage'; // Almacenamiento persistente de la sesión en el teléfono
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js'; // Cliente de Supabase y candado de sesión para un solo proceso
import { AppState, Platform } from 'react-native'; // Estado de la app (primer o segundo plano) y plataforma actual

import { supabase_configurado, supabase_llave, supabase_url } from '@/lib/env'; // Datos de conexión leídos de .env

// VARIABLES
// Cliente único; se crea la primera vez que se pide para que importar este archivo nunca falle
let cliente_supabase: SupabaseClient | null = null;

// FUNCIONES
// Renueva el token solo mientras la app está en primer plano
function registrar_refresco_sesion(cliente: SupabaseClient) {
  if (Platform.OS === 'web') {
    return; // En web el navegador maneja la sesión
  }

  AppState.addEventListener('change', (estado_app) => {
    if (estado_app === 'active') {
      cliente.auth.startAutoRefresh();
    } else {
      cliente.auth.stopAutoRefresh();
    }
  });
}

// Devuelve el cliente de Supabase, creándolo en el primer uso
export function obtener_supabase() {
  if (cliente_supabase) {
    return cliente_supabase;
  }

  // Sin .env no hay a dónde conectarse: error claro en lugar de fallar al importar
  if (!supabase_configurado) {
    throw new Error('Supabase no está configurado: copia .env.example como .env y completa la URL y la llave (ver README).');
  }

  cliente_supabase = createClient(supabase_url, supabase_llave, {
    auth: {
      // En web se usa el localStorage del navegador; en el teléfono, AsyncStorage
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // En móvil la sesión no llega por URL
      lock: processLock,
    },
  });

  registrar_refresco_sesion(cliente_supabase);

  return cliente_supabase;
}
