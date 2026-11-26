import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { confirmarAccion, mostrarAviso } from '@/lib/confirm';
import { TIPO_NOTIFICACION_PRODUCTO_CANCELADO } from '@/lib/kitchen-network';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';

export default function MeseroNotificationsScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const {
    notificaciones,
    marcarNotificacionLeida,
    limpiarNotificacionesLeidas,
  } = useOrders();
  const [limpiando, setLimpiando] = useState(false);
  const hayLeidas = notificaciones.some((n) => n.leida);

  const handleLimpiar = () => {
    if (!hayLeidas || limpiando) return;

    confirmarAccion({
      titulo: 'Limpiar notificaciones',
      mensaje: 'Se eliminarán las notificaciones que ya leíste. Las pendientes se conservan.',
      textoConfirmar: 'Limpiar',
      textoCancelar: 'Cancelar',
      destructivo: true,
      alConfirmar: async () => {
        setLimpiando(true);
        const resultado = await limpiarNotificacionesLeidas();
        setLimpiando(false);

        if (!resultado.exito) {
          mostrarAviso('No se pudo limpiar', resultado.error ?? 'Intenta de nuevo.');
        }
      },
    });
  };

  const renderItem = ({ item }: { item: NotificacionItem }) => {
    const esCancelacion = item.id_tipo === TIPO_NOTIFICACION_PRODUCTO_CANCELADO;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (!item.leida) marcarNotificacionLeida(item.id_notificacion);
          router.push(`/(mesero)/account?id=${item.id_comanda}` as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${esCancelacion ? 'Producto cancelado' : 'Pedido listo'}, ${item.etiqueta}, ${item.tiempo}${
          item.leida ? ', leída' : ', sin leer'
        }`}
        accessibilityHint="Abre la cuenta y marca la notificación como leída"
        accessibilityState={{ selected: item.leida }}
        style={[
          estilos.tarjeta,
          {
            backgroundColor: colores.surface,
            borderColor: esCancelacion ? colores.danger_border : colores.text,
          },
        ]}
      >
        <View style={estilos.iconoContenedor}>
          <Ionicons
            name={esCancelacion ? 'close-circle-outline' : 'notifications-outline'}
            size={32}
            color={esCancelacion ? colores.danger : colores.text}
          />
        </View>

        <View style={estilos.info}>
          <Text style={[estilos.titulo, { color: esCancelacion ? colores.danger : colores.text }]}>
            {esCancelacion ? 'Producto cancelado' : 'Pedido listo'}
          </Text>
          {item.mensaje ? (
            <Text style={[estilos.mensajeTexto, { color: colores.text_secondary }]}>
              {item.mensaje}
            </Text>
          ) : null}
          <View style={estilos.filaDetalle}>
            <Text style={[estilos.mesaTexto, { color: colores.text_secondary }]}>
              {item.etiqueta}
            </Text>
            <Text style={[estilos.tiempoTexto, { color: colores.text_muted }]}>
              {item.tiempo}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Notificaciones"
        onBack={() => router.push('/(mesero)' as any)}
        derecha={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLimpiar}
            disabled={!hayLeidas || limpiando}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Limpiar notificaciones leídas"
            accessibilityHint="Elimina las notificaciones que ya leíste; las pendientes se conservan"
            accessibilityState={{ disabled: !hayLeidas || limpiando, busy: limpiando }}
            style={[
              estilos.botonLimpiar,
              { opacity: !hayLeidas || limpiando ? 0.4 : 1 },
            ]}
          >
            {limpiando ? (
              <ActivityIndicator size="small" color={colores.text} />
            ) : (
              <Ionicons name="trash-outline" size={24} color={colores.text} />
            )}
          </TouchableOpacity>
        }
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
  botonLimpiar: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  mensajeTexto: {
    fontFamily: fuentes.medium,
    fontSize: 13,
    lineHeight: 18,
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
