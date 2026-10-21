import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CocinaBottomNav } from '@/components/CocinaBottomNav';
import { MetricCard } from '@/components/MetricCard';
import { UserHeader } from '@/components/UserHeader';
import { useAuth } from '@/context/auth-context';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, useTema } from '@/theme';

export default function CocinaHomeScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { mesas, comandas } = useOrders();

  const nombreCocinero = usuario?.nombre ?? 'Emilio';
  const mesasActivas = mesas.filter((m) => m.estado === 'ocupada').length;
  const pedidosHoy = comandas.length;

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado de cocinero */}
        <UserHeader nombre={nombreCocinero} rol="Cocinero" tamanoAvatar={96} />

        {/* Indicadores operativos */}
        <View style={estilos.filaIndicadores}>
          <MetricCard titulo={'Mesas activas'} valor={mesasActivas || 10} anchoFijo />
          <MetricCard titulo={'Pedidos hoy'} valor={pedidosHoy || 22} anchoFijo />
          <MetricCard titulo={'Tiempo\npromedio'} valor={12} sufijo="min" anchoFijo />
        </View>

        {/* Botón de Comandas (Página 10) */}
        <View style={estilos.seccionBotones}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(cocina)/orders')}
            style={[estilos.botonAccion, { backgroundColor: colores.primary }]}
          >
            <Ionicons name="fast-food-outline" size={28} color={colores.on_primary} style={estilos.iconoBoton} />
            <Text style={[estilos.textoBoton, { color: colores.on_primary }]}>Comandas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Barra de navegación inferior de cocina */}
      <CocinaBottomNav activa="inicio" />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.xl,
  },
  filaIndicadores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaciado.xs,
    marginTop: espaciado.sm,
    marginBottom: espaciado.xl,
  },
  seccionBotones: {
    marginTop: espaciado.md,
  },
  botonAccion: {
    height: 60,
    borderRadius: radios.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
  },
  iconoBoton: {
    marginRight: espaciado.md,
  },
  textoBoton: {
    fontFamily: fuentes.bold,
    fontSize: 22,
  },
});
