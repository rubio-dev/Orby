import { Stack } from 'expo-router'; // Navegación en pila de Expo Router
import React from 'react';

import { GuardiaRol } from '@/components/GuardiaRol'; // Protección por rol
import { useTema } from '@/theme'; // Tema activo

// LAYOUT DEL GRUPO (mesero)
// Todas sus pantallas quedan protegidas: solo entra el rol 'mesero'
export default function MeseroLayout() {
  const { colores } = useTema();

  return (
    <GuardiaRol rol="mesero">
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
