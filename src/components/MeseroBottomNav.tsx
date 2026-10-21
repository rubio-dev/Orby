import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { useOrders } from '@/context/orders-context';
import { confirmarAccion } from '@/lib/confirm';
import { espaciado, tipografia, useTema } from '@/theme';

type TabMesero = 'inicio' | 'notificaciones' | 'perfil' | 'salir';

type MeseroBottomNavProps = {
  activa: TabMesero;
};

export function MeseroBottomNav({ activa }: MeseroBottomNavProps) {
  const router = useRouter();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { cerrarSesion } = useAuth();
  const { notificaciones } = useOrders();

  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  const handleCerrarSesion = () => {
    confirmarAccion({
      titulo: 'Cerrar sesión',
      mensaje: '¿Estás seguro de que deseas salir del panel de mesero?',
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
    id: TabMesero;
    etiqueta: string;
    icono: keyof typeof Ionicons.glyphMap;
    iconoActivo: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    badge?: number;
  }[] = [
    {
      id: 'inicio',
      etiqueta: 'Inicio',
      icono: 'home-outline',
      iconoActivo: 'home',
      onPress: () => router.push('/(mesero)' as any),
    },
    {
      id: 'notificaciones',
      etiqueta: 'Notificaciones',
      icono: 'notifications-outline',
      iconoActivo: 'notifications',
      onPress: () => router.push('/(mesero)/notifications'),
      badge: sinLeer > 0 ? sinLeer : undefined,
    },
    {
      id: 'perfil',
      etiqueta: 'Perfil',
      icono: 'person-outline',
      iconoActivo: 'person',
      onPress: () => router.push('/(mesero)/mesero-profile' as any),
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
            <View style={{ position: 'relative' }}>
              <Ionicons
                name={estaSeleccionada ? tab.iconoActivo : tab.icono}
                size={24}
                color={colorIcono}
              />
              {tab.badge !== undefined && (
                <View style={[estilos.badge, { backgroundColor: colores.danger }]}>
                  <Text style={estilos.badgeTexto}>{tab.badge}</Text>
                </View>
              )}
            </View>
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
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeTexto: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
