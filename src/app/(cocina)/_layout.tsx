import { Stack } from 'expo-router'; // Navegación en pila de Expo Router
import React from 'react';

import { GuardiaRol } from '@/components/GuardiaRol'; // Protección por rol
import { KitchenProvider } from '@/context/kitchen-context'; // Datos reales de cocina, cola y Realtime
import { useTema } from '@/theme'; // Tema activo

// LAYOUT DEL GRUPO (cocina)
// Todas sus pantallas quedan protegidas: solo entra el rol 'cocina'.
// KitchenProvider va dentro de la guardia: solo se conecta (y abre Realtime) si el rol es cocina,
// y se monta aquí y no en src/app/_layout.tsx para no tocar el layout raíz, que es compartido.
export default function CocinaLayout() {
  const { colores } = useTema();

  return (
    <GuardiaRol rol="cocina">
      <KitchenProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colores.background },
            animation: 'slide_from_right',
          }}
        />
      </KitchenProvider>
    </GuardiaRol>
  );
}
