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

import { MeseroBottomNav } from '@/components/MeseroBottomNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { type NotificacionItem, useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';

export default function MeseroNotificationsScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { notificaciones, marcarNotificacionLeida } = useOrders();

  const renderItem = ({ item }: { item: NotificacionItem }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        marcarNotificacionLeida(item.id_notificacion);
      }}
      style={[
        estilos.tarjeta,
        {
          backgroundColor: colores.surface,
          borderColor: '#1A1D1C',
        },
      ]}
    >
      <View style={estilos.iconoContenedor}>
        <Ionicons name="notifications-outline" size={32} color="#1A1D1C" />
      </View>

      <View style={estilos.info}>
        <Text style={[estilos.titulo, { color: '#1A1D1C' }]}>Pedido listo</Text>
        <View style={estilos.filaDetalle}>
          <Text style={[estilos.mesaTexto, { color: colores.text_secondary }]}>
            Mesa {item.num_mesa}
          </Text>
          <Text style={[estilos.tiempoTexto, { color: colores.text_muted }]}>
            {item.tiempo}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Notificaciones"
        onBack={() => router.push('/(mesero)' as any)}
      />

      <View style={estilos.contenido}>
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id_notificacion}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Ionicons name="notifications-off-outline" size={48} color={colores.text_muted} />
              <Text style={[tipografia.cuerpo, { color: colores.text_muted, marginTop: espaciado.md }]}>
                No hay notificaciones pendientes
              </Text>
            </View>
          }
        />
      </View>

      <MeseroBottomNav activa="notificaciones" />
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
    gap: espaciado.md,
    paddingTop: espaciado.sm,
    paddingBottom: espaciado.xl,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.xxl,
    borderWidth: 1.5,
    minHeight: 84,
  },
  iconoContenedor: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espaciado.md,
  },
  info: {
    flex: 1,
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 4,
  },
  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mesaTexto: {
    fontFamily: fuentes.medium,
    fontSize: 15,
  },
  tiempoTexto: {
    fontFamily: fuentes.regular,
    fontSize: 14,
  },
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.xxl * 2,
  },
});
