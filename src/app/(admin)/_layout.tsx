import { Stack } from 'expo-router';
import React from 'react';
import { useTema } from '@/theme';

export default function AdminLayout() {
  const { colores } = useTema();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colores.background },
        animation: 'slide_from_right',
      }}
    />
  );
}

