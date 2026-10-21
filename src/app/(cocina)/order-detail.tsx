import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components/CustomButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, useTema } from '@/theme';
import type { DetalleComanda } from '@/types';
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)

export default function CocinaOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colores } = useTema();
  const {
    comandas,
    actualizarEstadoDetalle,
    actualizarTiempoEstimadoDetalle,
    completarComanda,
  } = useOrders();

  const [detalleParaTiempo, setDetalleParaTiempo] = useState<DetalleComanda | null>(null);

  // Buscar la comanda por ID o usar la primera como fallback
  const comanda = comandas.find((c) => c.id_comanda === id) ?? comandas[0];

  if (!comanda) {
    return (
      <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]}>
        <ScreenHeader titulo="Comanda no encontrada" onBack={() => router.back()} />
        <View style={estilos.vacio}>
          <Text style={{ fontSize: 16, color: colores.text_muted }}>
            No se encontró la orden solicitada.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const tiempoEstimadoTotal = comanda.detalles.reduce(
    (acc, item) => acc + (item.tiempo_estimado_minutos || 10),
    0
  );

  const handleCompletarOrden = async () => {
    mostrarAviso(
      'Completar orden',
      `¿Marcar la orden de la Mesa ${comanda.num_mesa} como lista? Se enviará aviso inmediato al mesero.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          style: 'default',
          onPress: async () => {
            await completarComanda(comanda.id_comanda);
            mostrarAviso(
              '¡Orden Lista!',
              `Se ha notificado al mesero que el pedido de la Mesa ${comanda.num_mesa} está listo para servirse.`,
              [{ text: 'Aceptar', onPress: () => router.replace('/(cocina)/orders') }]
            );
          },
        },
      ]
    );
  };

  const opcionesTiempo = [5, 10, 15, 20, 25, 30];

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo={`Mesa ${comanda.num_mesa}`}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
        {/* Subtítulo: Orden #1 */}
        <Text style={[estilos.subtituloOrden, { color: colores.primary }]}>
          Orden #{comanda.num_mesa}
        </Text>

        {/* Tarjetas de productos */}
        {comanda.detalles.map((detalle) => {
          const estaListo = detalle.id_estado === 3;
          const minutos = detalle.tiempo_estimado_minutos || 5;

          return (
            <View
              key={detalle.id_detalle}
              style={[estilos.tarjetaItem, { backgroundColor: colores.surface, borderColor: colores.text }]}
            >
              <View style={estilos.filaContenido}>
                {/* Imagen del producto */}
                <View style={estilos.imagenContenedor}>
                  <View style={[estilos.imagenFallback, { backgroundColor: colores.placeholder }]}>
                    <Ionicons name="fast-food-outline" size={26} color={colores.primary_strong} />
                  </View>
                </View>

                {/* Nombre y Cantidad * Precio */}
                <View style={estilos.infoProducto}>
                  <Text style={[estilos.nombreProducto, { color: colores.text }]}>
                    {detalle.nombre_producto}
                  </Text>
                  <Text style={[estilos.precioMultiplicador, { color: colores.text_muted }]}>
                    {detalle.cantidad} * {detalle.precio_unitario}
                  </Text>
                </View>

                {/* Selector de tiempo estimado */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setDetalleParaTiempo(detalle)}
                  style={[estilos.cajaTiempoEstimado, { borderColor: colores.text }]}
                >
                  <Text style={[estilos.labelTiempoEstimado, { color: colores.text }]}>
                    Selecciona el tiempo{'\n'}estimado (min):
                  </Text>
                  <View style={[estilos.dropdownPill, { borderColor: colores.text }]}>
                    <Ionicons name="time-outline" size={16} color={colores.text} />
                    <Text style={[estilos.textoMinutosDropdown, { color: colores.text }]}>{minutos}:00</Text>
                    <Ionicons name="chevron-down" size={16} color={colores.text} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Botones: En preparación / Listo */}
              <View style={estilos.filaBotonesEstado}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => actualizarEstadoDetalle(comanda.id_comanda, detalle.id_detalle, 2)}
                  style={[
                    estilos.botonEstado,
                    !estaListo
                      ? {
                          backgroundColor: colores.warning_soft,
                          borderWidth: 1.5,
                          borderColor: colores.warning_border,
                        }
                      : { backgroundColor: colores.surface_muted },
                  ]}
                >
                  <Text
                    style={[
                      estilos.textoBotonEstado,
                      !estaListo ? { color: colores.warning } : { color: colores.text_muted },
                    ]}
                  >
                    En preparación
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => actualizarEstadoDetalle(comanda.id_comanda, detalle.id_detalle, 3)}
                  style={[
                    estilos.botonEstado,
                    estaListo
                      ? { backgroundColor: colores.primary }
                      : { backgroundColor: colores.surface_muted },
                  ]}
                >
                  <Text
                    style={[
                      estilos.textoBotonEstado,
                      estaListo ? { color: colores.on_primary } : { color: colores.text_muted },
                    ]}
                  >
                    Listo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Tarjeta de Especificaciones del cliente */}
        <View style={[estilos.tarjetaEspecificaciones, { backgroundColor: colores.surface, borderColor: colores.text }]}>
          <Text style={[estilos.tituloEspecificaciones, { color: colores.text }]}>Especificaciones:</Text>
          <Text style={[estilos.textoEspecificaciones, { color: colores.text_secondary }]}>
            • {comanda.detalles.find((d) => d.especificaciones)?.especificaciones || 'Sin cebolla'}
          </Text>
        </View>

        {/* Tiempo estimado total */}
        <Text style={[estilos.tiempoEstimadoTotalTexto, { color: colores.text }]}>
          Tiempo estimado: {tiempoEstimadoTotal}min
        </Text>

        {/* Botón Completar */}
        <CustomButton
          titulo="Completar"
          variante="primary"
          onPress={handleCompletarOrden}
          estilo={estilos.botonCompletar}
        />
      </ScrollView>

      {/* Modal para cambiar tiempo estimado */}
      <Modal
        visible={!!detalleParaTiempo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetalleParaTiempo(null)}
      >
        <TouchableOpacity
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
          activeOpacity={1}
          onPress={() => setDetalleParaTiempo(null)}
        >
          <View style={[estilos.modalContenido, { backgroundColor: colores.surface }]}>
            <Text style={[estilos.modalTitulo, { color: colores.text }]}>
              Tiempo estimado ({detalleParaTiempo?.nombre_producto})
            </Text>
            <View style={estilos.opcionesTiempoGrid}>
              {opcionesTiempo.map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[
                    estilos.opcionTiempoItem,
                    detalleParaTiempo?.tiempo_estimado_minutos === min
                      ? { backgroundColor: colores.primary }
                      : { backgroundColor: colores.placeholder },
                  ]}
                  onPress={async () => {
                    if (detalleParaTiempo) {
                      await actualizarTiempoEstimadoDetalle(
                        comanda.id_comanda,
                        detalleParaTiempo.id_detalle,
                        min
                      );
                      setDetalleParaTiempo(null);
                    }
                  }}
                >
                  <Text
                    style={[
                      estilos.textoMinutosItem,
                      {
                        color:
                          detalleParaTiempo?.tiempo_estimado_minutos === min
                            ? colores.on_primary
                            : colores.text,
                      },
                    ]}
                  >
                    {min}:00 min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.xxl,
    gap: espaciado.md,
  },
  subtituloOrden: {
    fontFamily: fuentes.bold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: espaciado.xs,
  },
  tarjetaItem: {
    borderRadius: radios.xxl,
    borderWidth: 1.5,
    padding: espaciado.md,
  },
  filaContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espaciado.sm,
  },
  imagenContenedor: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: espaciado.md,
  },
  imagenFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoProducto: {
    flex: 1,
  },
  nombreProducto: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  precioMultiplicador: {
    fontFamily: fuentes.bold,
    fontSize: 16,
    marginTop: 4,
  },
  cajaTiempoEstimado: {
    borderWidth: 1.5,
    borderRadius: radios.lg,
    padding: espaciado.xs,
    alignItems: 'center',
    minWidth: 120,
  },
  labelTiempoEstimado: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    marginBottom: 4,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  textoMinutosDropdown: {
    fontFamily: fuentes.bold,
    fontSize: 13,
  },
  filaBotonesEstado: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.xs,
  },
  botonEstado: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonEstado: {
    fontFamily: fuentes.bold,
    fontSize: 15,
  },
  tarjetaEspecificaciones: {
    borderWidth: 1.5,
    borderRadius: radios.xxl,
    padding: espaciado.lg,
    marginTop: espaciado.xs,
  },
  tituloEspecificaciones: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  textoEspecificaciones: {
    fontSize: 16,
    paddingLeft: 4,
  },
  tiempoEstimadoTotalTexto: {
    fontFamily: fuentes.bold,
    fontSize: 24,
    textAlign: 'center',
    marginVertical: espaciado.sm,
  },
  botonCompletar: {
    height: 54,
    borderRadius: 27,
  },
  vacio: {
    padding: espaciado.xxl,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  modalContenido: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radios.xl,
    padding: espaciado.lg,
  },
  modalTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    marginBottom: espaciado.md,
    textAlign: 'center',
  },
  opcionesTiempoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    justifyContent: 'center',
  },
  opcionTiempoItem: {
    width: '45%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoMinutosItem: {
    fontFamily: fuentes.bold,
    fontSize: 15,
  },
});
