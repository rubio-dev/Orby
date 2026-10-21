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

import { MeseroBottomNav } from '@/components/MeseroBottomNav';
import { MetricCard } from '@/components/MetricCard';
import { UserHeader } from '@/components/UserHeader';
import { useAuth } from '@/context/auth-context';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, useTema } from '@/theme';

export default function MeseroHomeScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { mesas, comandas } = useOrders();

  const nombreMesero = usuario?.nombre ?? 'Liz';
  const mesasActivas = mesas.filter((m) => m.estado === 'ocupada').length;
  const pedidosHoy = comandas.length;

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado de mesero */}
        <UserHeader nombre={nombreMesero} rol="Mesero" tamanoAvatar={96} />

        {/* Indicadores operativos */}
        <View style={estilos.filaIndicadores}>
          <MetricCard titulo={'Mesas activas'} valor={mesasActivas || 10} anchoFijo />
          <MetricCard titulo={'Pedidos hoy'} valor={pedidosHoy || 22} anchoFijo />
          <MetricCard titulo={'Tiempo\npromedio'} valor={12} sufijo="min" anchoFijo />
        </View>

        {/* Botones de acción rápida del mesero (Página 3) */}
        <View style={estilos.seccionBotones}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(mesero)/new-order')}
            style={[estilos.botonAccion, { backgroundColor: '#388D7A' }]}
          >
            <Ionicons name="clipboard-outline" size={28} color="#FFFFFF" style={estilos.iconoBoton} />
            <Text style={estilos.textoBoton}>Tomar pedido</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(mesero)/tables')}
            style={[estilos.botonAccion, { backgroundColor: '#388D7A' }]}
          >
            <Ionicons name="grid-outline" size={28} color="#FFFFFF" style={estilos.iconoBoton} />
            <Text style={estilos.textoBoton}>Ver mesas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(mesero)/view-menu' as any)}
            style={[estilos.botonAccion, { backgroundColor: '#388D7A' }]}
          >
            <Ionicons name="restaurant-outline" size={28} color="#FFFFFF" style={estilos.iconoBoton} />
            <Text style={estilos.textoBoton}>Ver menú</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Barra de navegación inferior del mesero */}
      <MeseroBottomNav activa="inicio" />
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
    gap: espaciado.md,
    marginTop: espaciado.sm,
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
    color: '#FFFFFF',
  },
});
