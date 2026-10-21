import { Redirect } from 'expo-router'; // Redirección de Expo Router
import React, { type ReactNode } from 'react'; // Tipo de los hijos de un componente
import { ActivityIndicator, StyleSheet, View } from 'react-native'; // Componentes base de React Native

import { useAuth } from '@/context/auth-context'; // Usuario con sesión iniciada
import { useTema } from '@/theme'; // Tema activo
import type { RolUsuario } from '@/types'; // Roles de la app

// PANTALLA DE INICIO DE CADA ROL
const INICIO_POR_ROL: Record<RolUsuario, string> = {
  administrador: '/(admin)',
  mesero: '/(mesero)',
  cocina: '/(cocina)',
};

// GUARDIA DE ROL
// Protege un grupo de pantallas: si no hay sesión manda al login,
// y si el usuario tiene otro rol lo manda a SU pantalla de inicio.
// Así un mesero no puede entrar a las pantallas del administrador aunque escriba la ruta.
export function GuardiaRol({ rol, children }: { rol: RolUsuario; children: ReactNode }) {
  const { colores } = useTema();
  const { usuario, estaCargando } = useAuth();

  // Todavía se está leyendo la sesión guardada
  if (estaCargando) {
    return (
      <View style={[estilos.cargando, { backgroundColor: colores.background }]}>
        <ActivityIndicator size="large" color={colores.primary} />
      </View>
    );
  }

  // Nadie ha iniciado sesión
  if (!usuario) {
    return <Redirect href="/login" />;
  }

  // El rol no corresponde: se manda a su propia pantalla de inicio
  if (usuario.rol !== rol) {
    return <Redirect href={INICIO_POR_ROL[usuario.rol] as any} />;
  }

  return <>{children}</>;
}

// ESTILOS
const estilos = StyleSheet.create({
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
