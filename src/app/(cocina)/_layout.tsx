import { Stack } from 'expo-router'; // Navegación en pila de Expo Router
import React from 'react';

import { GuardiaRol } from '@/components/GuardiaRol'; // Protección por rol
import { useTema } from '@/theme'; // Tema activo

// LAYOUT DEL GRUPO (cocina)
// Todas sus pantallas quedan protegidas: solo entra el rol 'cocina'
export default function CocinaLayout() {
  const { colores } = useTema();

  return (
    <GuardiaRol rol="cocina">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colores.background },
          animation: 'slide_from_right',
        }}
      />
    </GuardiaRol>
  );
}
