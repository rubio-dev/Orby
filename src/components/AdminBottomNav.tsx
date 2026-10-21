import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { confirmarAccion } from '@/lib/confirm';
import { espaciado, tipografia, useTema } from '@/theme';

type TabActiva = 'inicio' | 'menu' | 'personal' | 'perfil' | 'salir';

type AdminBottomNavProps = {
  activa: TabActiva;
};

export function AdminBottomNav({ activa }: AdminBottomNavProps) {
  const router = useRouter();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { cerrarSesion } = useAuth();

  const handleCerrarSesion = () => {
    confirmarAccion({
      titulo: 'Cerrar sesión',
      mensaje: '¿Estás seguro de que deseas salir del panel de administración?',
      textoConfirmar: 'Salir',
      destructivo: true,
      alConfirmar: async () => {
        try {
          await cerrarSesion();
        } finally {
          router.replace('/login');
        }
      },
    });
  };

  const tabs: {
    id: TabActiva;
    etiqueta: string;
    icono: keyof typeof Ionicons.glyphMap;
    iconoActivo: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      id: 'inicio',
      etiqueta: 'Inicio',
      icono: 'home-outline',
      iconoActivo: 'home',
      onPress: () => router.push('/(admin)' as any),
    },
    {
      id: 'menu',
      etiqueta: 'Menú',
      icono: 'restaurant-outline',
      iconoActivo: 'restaurant',
      onPress: () => router.push('/(admin)/menu'),
    },
    {
      id: 'personal',
      etiqueta: 'Personal',
      icono: 'people-outline',
      iconoActivo: 'people',
      onPress: () => router.push('/(admin)/staff'),
    },
    {
      id: 'perfil',
      etiqueta: 'Perfil',
      icono: 'person-outline',
      iconoActivo: 'person',
      onPress: () => router.push('/(admin)/profile'),
    },
    {
      id: 'salir',
      etiqueta: 'Salir',
      icono: 'exit-outline',
      iconoActivo: 'exit',
      onPress: handleCerrarSesion,
    },
  ];

  return (
    <View
      style={[
        estilos.barra,
        {
          backgroundColor: colores.surface,
          borderTopColor: colores.border,
          paddingBottom: Math.max(insets.bottom, espaciado.sm),
        },
      ]}
    >
      {tabs.map((tab) => {
        const estaSeleccionada = activa === tab.id;
        const colorIcono = estaSeleccionada ? colores.primary : colores.text_muted;

        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            style={estilos.itemTab}
            onPress={tab.onPress}
          >
            <Ionicons
              name={estaSeleccionada ? tab.iconoActivo : tab.icono}
              size={24}
              color={colorIcono}
            />
            <Text
              style={[
                tipografia.micro,
                estilos.etiqueta,
                { color: colorIcono, fontWeight: estaSeleccionada ? '700' : '500' },
              ]}
            >
              {tab.etiqueta}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: espaciado.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  itemTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.xs,
  },
  etiqueta: {
    marginTop: 2,
  },
});
