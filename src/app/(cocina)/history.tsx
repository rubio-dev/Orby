import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
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
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { Comanda } from '@/types';

export default function CocinaHistoryScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { comandas } = useOrders();

  const completadas = comandas.filter((c) => c.id_estado === 3 || c.id_estado === 4);

  const renderComanda = ({ item }: { item: Comanda }) => (
    <View style={[estilos.tarjeta, { backgroundColor: colores.surface }]}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.mesa, { color: colores.text }]}>
          Mesa {item.num_mesa}
        </Text>
        <View style={estilos.chipListo}>
          <Text style={estilos.textoChipListo}>Completado</Text>
        </View>
      </View>

      <View style={estilos.detalles}>
        {item.detalles.map((d) => (
          <Text key={d.id_detalle} style={[estilos.itemTexto, { color: colores.text_secondary }]}>
            • {d.cantidad} {d.nombre_producto}
          </Text>
        ))}
      </View>

      <View style={estilos.pie}>
        <Text style={[tipografia.detalle, { color: colores.text_muted }]}>
          Total: ${item.total}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(cocina)/order-detail?id=${item.id_comanda}`)}
        >
          <Text style={[tipografia.etiqueta, { color: colores.primary_strong, fontWeight: '700' }]}>
            Ver detalles →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Historial de Comandas"
        onBack={() => router.push('/(cocina)' as any)}
      />

      <View style={estilos.contenido}>
        <FlatList
          data={completadas}
          keyExtractor={(item) => item.id_comanda}
          renderItem={renderComanda}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Ionicons name="time-outline" size={48} color={colores.text_muted} />
              <Text style={[tipografia.cuerpo, { color: colores.text_muted, marginTop: espaciado.md }]}>
                Aún no hay comandas finalizadas en el turno
              </Text>
            </View>
          }
        />
      </View>

      <CocinaBottomNav activa="historial" />
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
  tarjeta: {
    padding: espaciado.md,
    borderRadius: radios.xxl,
    borderWidth: 1.5,
    borderColor: '#1A1D1C',
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espaciado.xs,
  },
  mesa: {
    fontFamily: fuentes.bold,
    fontSize: 20,
  },
  chipListo: {
    backgroundColor: '#D8ECE5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  textoChipListo: {
    fontFamily: fuentes.bold,
    fontSize: 12,
    color: '#276858',
  },
  detalles: {
    marginVertical: espaciado.xs,
    paddingLeft: 4,
  },
  itemTexto: {
    fontSize: 15,
    lineHeight: 21,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espaciado.xs,
    paddingTop: espaciado.xs,
    borderTopWidth: 1,
    borderTopColor: '#E6EAE8',
  },
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.xxl * 2,
  },
});
