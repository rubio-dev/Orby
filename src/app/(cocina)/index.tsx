import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
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
import { esperaPromedioMinutos, useKitchen } from '@/context/kitchen-context';
import { AvisoSinConexion } from '@/kitchen/AvisoSinConexion';
import { espaciado, fuentes, radios, useTema } from '@/theme';

// Igual que en la lista de comandas: la espera promedio avanza sola cada 30 s
const INTERVALO_RELOJ_MS = 30000;

// Medianoche de hoy en la hora del teléfono
function inicioDeHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy.getTime();
}

export default function CocinaHomeScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { comandasAbiertas, comandasCerradasHoy, recargando, recargar } = useKitchen();

  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), INTERVALO_RELOJ_MS);
    return () => clearInterval(intervalo);
  }, []);

  const nombreCocinero = usuario?.nombre ?? 'Cocina';

  // Mesas activas: las que tienen una cuenta abierta (hay una sola cuenta abierta por mesa).
  // Se cuenta desde las comandas y no desde el estado de la mesa, que el mesero puede
  // dejar en "ocupada" aunque ya no haya pedido.
  const mesasActivas = new Set(
    comandasAbiertas.filter((c) => c.tipo_servicio === 'mesa').map((c) => c.id_mesa)
  ).size;

  // Pedidos hoy: cuentas abiertas hoy, sigan abiertas o ya cerradas.
  // (Las cerradas del contexto ya son solo las de hoy.)
  const desdeHoy = inicioDeHoy();
  const pedidosHoy =
    comandasAbiertas.filter((c) => new Date(c.fecha_creacion).getTime() >= desdeHoy).length +
    comandasCerradasHoy.length;

  // Espera promedio de los productos que la cocina todavía no termina; 0 si no hay ninguno
  const esperaPromedio = esperaPromedioMinutos(comandasAbiertas, ahora) ?? 0;

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      {/* Solo aparece sin conexión o con cambios por enviar */}
      <AvisoSinConexion />

      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
        // Deslizar hacia abajo también actualiza los números del inicio
        refreshControl={
          <RefreshControl
            refreshing={recargando}
            onRefresh={() => recargar({ manual: true })}
            tintColor={colores.primary}
            colors={[colores.primary]}
          />
        }
      >
        {/* Encabezado de cocinero */}
        <UserHeader nombre={nombreCocinero} rol="Cocinero" tamanoAvatar={96} />

        {/* Indicadores operativos (antes eran 10, 22 y 12 fijos) */}
        <View style={estilos.filaIndicadores}>
          <MetricCard titulo={'Mesas activas'} valor={mesasActivas} anchoFijo />
          <MetricCard titulo={'Pedidos hoy'} valor={pedidosHoy} anchoFijo />
          <MetricCard titulo={'Espera\npromedio'} valor={esperaPromedio} sufijo="min" anchoFijo />
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
