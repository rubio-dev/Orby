import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { confirmarAccion } from '@/lib/confirm';
import { espaciado, tipografia, useTema } from '@/theme';

type TabCocina = 'inicio' | 'comandas' | 'historial' | 'perfil' | 'salir';

type CocinaBottomNavProps = {
  activa: TabCocina;
};

export function CocinaBottomNav({ activa }: CocinaBottomNavProps) {
  const router = useRouter();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { cerrarSesion } = useAuth();

  const handleCerrarSesion = () => {
    confirmarAccion({
      titulo: 'Cerrar sesión',
      mensaje: '¿Estás seguro de que deseas salir del panel de cocina?',
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
    id: TabCocina;
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
      onPress: () => router.push('/(cocina)' as any),
    },
    {
      id: 'comandas',
      etiqueta: 'Comandas',
      icono: 'receipt-outline',
      iconoActivo: 'receipt',
      onPress: () => router.push('/(cocina)/orders'),
    },
    {
      id: 'historial',
      etiqueta: 'Historial',
      icono: 'time-outline',
      iconoActivo: 'time',
      onPress: () => router.push('/(cocina)/history'),
    },
    {
      id: 'perfil',
      etiqueta: 'Perfil',
      icono: 'person-outline',
      iconoActivo: 'person',
      onPress: () => router.push('/(cocina)/cocina-profile' as any),
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
