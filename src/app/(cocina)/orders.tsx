import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CocinaBottomNav } from '@/components/CocinaBottomNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { Comanda } from '@/types';

export default function CocinaOrdersScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { comandas } = useOrders();

  const [tabActual, setTabActual] = useState<'preparacion' | 'listos'>('preparacion');
  const [tiempoActual] = useState(() => Date.now());

  const enPreparacion = comandas.filter((c) => c.id_estado === 2);
  const listos = comandas.filter((c) => c.id_estado === 3);

  const listaMostrar = tabActual === 'preparacion' ? enPreparacion : listos;

  const calcularMinutosTranscurridos = (fechaIso: string) => {
    const diff = Math.floor((tiempoActual - new Date(fechaIso).getTime()) / 60000);
    return Math.max(1, diff);
  };

  const renderComanda = ({ item }: { item: Comanda }) => {
    const minutos = calcularMinutosTranscurridos(item.fecha_creacion);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(cocina)/order-detail?id=${item.id_comanda}`)}
        style={[estilos.tarjetaComanda, { backgroundColor: colores.surface }]}
      >
        {/* Icono de gorro de chef / cocina */}
        <View style={estilos.iconoChef}>
          <Ionicons name="restaurant-outline" size={32} color="#1A1D1C" />
        </View>

        {/* Información central: Mesa y lista de platillos */}
        <View style={estilos.infoCentral}>
          <Text style={[estilos.mesaTitulo, { color: colores.text }]}>
            Mesa {item.num_mesa}
          </Text>

          {item.detalles.map((d) => (
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
            <Ionicons name="arrow-undo-outline" size={14} color="#1A1D1C" style={estilos.iconoFlechaTiempo} />
          </View>

          <View style={[estilos.chipEstado, { backgroundColor: '#D8ECE5' }]}>
            <Text style={[estilos.textoChipEstado, { color: '#276858' }]}>
              {item.id_estado === 2 ? 'En preparación' : 'Listo'}
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
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colores.primary} />
              <Text style={[tipografia.cuerpo, { color: colores.text_muted, marginTop: espaciado.md }]}>
                No hay comandas en este estado
              </Text>
            </View>
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
    borderColor: '#1A1D1C',
    minHeight: 90,
  },
  iconoChef: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#1A1D1C',
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
