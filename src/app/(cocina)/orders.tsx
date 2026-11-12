import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CocinaBottomNav } from '@/components/CocinaBottomNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { clasificarComanda, minutosDeEspera, useKitchen } from '@/context/kitchen-context';
import { AvisoSinConexion } from '@/kitchen/AvisoSinConexion';
import { ESTADO_DETALLE, etiquetaComanda, type ComandaCocina } from '@/lib/kitchen-network';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';

// Cada 30 s se recalcula la espera de las tarjetas; más seguido no cambia el minuto mostrado
const INTERVALO_RELOJ_MS = 30000;

export default function CocinaOrdersScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { comandasAbiertas, cargando, recargando, recargar } = useKitchen();

  const [tabActual, setTabActual] = useState<'preparacion' | 'listos'>('preparacion');
  const [tiempoActual, setTiempoActual] = useState(() => Date.now());

  // Reloj de la pantalla: la espera avanza sola aunque no llegue ningún cambio
  useEffect(() => {
    const intervalo = setInterval(() => setTiempoActual(Date.now()), INTERVALO_RELOJ_MS);
    return () => clearInterval(intervalo);
  }, []);

  // "En preparación": a la comanda le falta algún producto. "Listos": ya no le falta nada.
  // Las que ya se entregaron completas no se muestran: para la cocina no hay nada que hacer.
  // Primero las que más llevan esperando, para que la cocina las atienda antes.
  const { enPreparacion, listos } = useMemo(() => {
    const porEspera = (a: ComandaCocina, b: ComandaCocina) =>
      minutosDeEspera(b, tiempoActual) - minutosDeEspera(a, tiempoActual);
    return {
      enPreparacion: comandasAbiertas
        .filter((c) => clasificarComanda(c) === 'preparacion')
        .sort(porEspera),
      listos: comandasAbiertas.filter((c) => clasificarComanda(c) === 'listos').sort(porEspera),
    };
  }, [comandasAbiertas, tiempoActual]);

  const listaMostrar = tabActual === 'preparacion' ? enPreparacion : listos;

  const renderComanda = ({ item }: { item: ComandaCocina }) => {
    // Mínimo 1 min, como en el diseño original: "0 min" se lee como si no hubiera espera
    const minutos = Math.max(1, minutosDeEspera(item, tiempoActual));
    // En la tarjeta solo va lo que la cocina tiene que preparar o ya preparó;
    // lo entregado o cancelado ya no es asunto de la cocina
    const productosVisibles = item.detalles.filter(
      (d) => d.id_estado !== ESTADO_DETALLE.entregado && d.id_estado !== ESTADO_DETALLE.cancelado
    );

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(cocina)/order-detail?id=${item.id_comanda}`)}
        accessibilityRole="button"
        accessibilityLabel={`${etiquetaComanda(item)}, ${productosVisibles.length} productos, ${minutos} minutos de espera, ${
          tabActual === 'preparacion' ? 'en preparación' : 'listo'
        }`}
        accessibilityHint="Abre el detalle de la comanda"
        style={[estilos.tarjetaComanda, { backgroundColor: colores.surface, borderColor: colores.text }]}
      >
        {/* Icono de gorro de chef / cocina */}
        <View style={[estilos.iconoChef, { borderColor: colores.text }]}>
          <Ionicons name="restaurant-outline" size={32} color={colores.text} />
        </View>

        {/* Información central: Mesa y lista de platillos */}
        <View style={estilos.infoCentral}>
          <Text style={[estilos.mesaTitulo, { color: colores.text }]}>
            {etiquetaComanda(item)}
          </Text>

          {productosVisibles.map((d) => (
            <Text key={d.id_detalle} style={[estilos.itemPlatillo, { color: colores.text_secondary }]}>
              {d.cantidad} {d.nombre_producto}
            </Text>
          ))}
        </View>

        {/* Lado derecho: Cronómetro y estado */}
        <View style={estilos.ladoDerecho}>
          <View style={estilos.filaTiempo}>
            <Text style={[estilos.tiempoTexto, { color: colores.text }]}>
              {minutos} min
            </Text>
            <Ionicons name="arrow-undo-outline" size={14} color={colores.text} style={estilos.iconoFlechaTiempo} />
          </View>

          <View style={[estilos.chipEstado, { backgroundColor: colores.primary_soft }]}>
            <Text style={[estilos.textoChipEstado, { color: colores.primary_strong }]}>
              {tabActual === 'preparacion' ? 'En preparación' : 'Listo'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Comandas"
        onBack={() => router.push('/(cocina)' as any)}
      />

      {/* Solo aparece sin conexión o con cambios por enviar */}
      <AvisoSinConexion />

      <View style={estilos.contenido}>
        {/* Pestañas: En preparación (X) | Listos (Y) */}
        <SegmentedTabs
          opciones={[
            { id: 'preparacion', etiqueta: `En preparación (${enPreparacion.length})` },
            { id: 'listos', etiqueta: `Listos (${listos.length})` },
          ]}
          seleccionada={tabActual}
          alSeleccionar={setTabActual}
          tipo="pills"
        />

        {/* Lista de tarjetas de comandas */}
        <FlatList
          data={listaMostrar}
          keyExtractor={(item) => item.id_comanda}
          renderItem={renderComanda}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          // Deslizar hacia abajo: envía lo pendiente y vuelve a pedir las comandas
          refreshControl={
            <RefreshControl
              refreshing={recargando}
              onRefresh={() => recargar({ manual: true })}
              tintColor={colores.primary}
              colors={[colores.primary]}
            />
          }
          ListEmptyComponent={
            cargando ? (
              <View style={estilos.vacio}>
                <ActivityIndicator size="large" color={colores.primary} />
              </View>
            ) : (
              <View style={estilos.vacio}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colores.primary} />
                <Text style={[tipografia.cuerpo, { color: colores.text_muted, marginTop: espaciado.md }]}>
                  No hay comandas en este estado
                </Text>
              </View>
            )
          }
        />
      </View>

      <CocinaBottomNav activa="comandas" />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    flex: 1,
    paddingHorizontal: espaciado.pantalla,
  },
  lista: {
    paddingTop: espaciado.xs,
    paddingBottom: espaciado.xl,
    gap: espaciado.md,
  },
  tarjetaComanda: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espaciado.md,
    borderRadius: radios.xxl,
    borderWidth: 1.5,
    minHeight: 90,
  },
  iconoChef: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espaciado.md,
  },
  infoCentral: {
    flex: 1,
  },
  mesaTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 4,
  },
  itemPlatillo: {
    fontSize: 15,
    lineHeight: 20,
  },
  ladoDerecho: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  filaTiempo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tiempoTexto: {
    fontFamily: fuentes.bold,
    fontSize: 16,
  },
  iconoFlechaTiempo: {
    transform: [{ rotate: '140deg' }],
  },
  chipEstado: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoChipEstado: {
    fontFamily: fuentes.bold,
    fontSize: 12,
  },
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.xxl * 2,
  },
});
