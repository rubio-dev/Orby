import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { estaEnEspera, useKitchen } from '@/context/kitchen-context';
import { AvisoSinConexion } from '@/kitchen/AvisoSinConexion';
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)
import { ESTADO_COMANDA, ESTADO_DETALLE, type DetalleCocina } from '@/lib/kitchen-network';
import { espaciado, fuentes, radios, useTema } from '@/theme';

export default function CocinaOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colores } = useTema();
  const {
    comandasAbiertas,
    comandasCerradasHoy,
    cargando,
    sinConexion,
    cambiarEstadoProducto,
    cambiarTiempoEstimado,
    completarComanda,
  } = useKitchen();

  // Se guarda solo el id: así el modal siempre muestra el tiempo actual del producto,
  // aunque cambie mientras está abierto (por ejemplo, por Realtime)
  const [idDetalleParaTiempo, setIdDetalleParaTiempo] = useState<string | null>(null);

  // Se busca en las abiertas y, si viene del historial, en las cerradas de hoy.
  // Ya no se usa la primera comanda como respaldo: mostraría los productos de otra mesa.
  const comanda =
    comandasAbiertas.find((c) => c.id_comanda === id) ??
    comandasCerradasHoy.find((c) => c.id_comanda === id);

  if (!comanda) {
    return (
      <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]}>
        <ScreenHeader
          titulo={cargando ? 'Cargando…' : 'Comanda no encontrada'}
          onBack={() => router.back()}
        />
        {/* Sin sesión real la comanda se oculta: la franja roja explica por qué */}
        <AvisoSinConexion />
        <View style={estilos.vacio}>
          {cargando ? (
            <ActivityIndicator size="large" color={colores.primary} />
          ) : (
            <Text style={{ fontSize: 16, color: colores.text_muted }}>
              No se encontró la orden solicitada. Puede que la cuenta ya se haya cerrado.
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Solo se trabaja sobre cuentas abiertas; las cerradas del historial son de solo lectura
  // (la base también lo exige con la política detalle_actualizar_cuenta_abierta)
  const editable = comanda.id_estado === ESTADO_COMANDA.abierta;
  const faltantes = comanda.detalles.filter((d) => estaEnEspera(d.id_estado));
  const detalleParaTiempo = comanda.detalles.find((d) => d.id_detalle === idDetalleParaTiempo) ?? null;

  // Tiempo estimado: la suma de lo que todavía falta y ya tiene un tiempo asignado
  const tiempoEstimadoTotal = faltantes.reduce((acc, item) => acc + (item.tiempo_estimado ?? 0), 0);

  // Las especificaciones son por producto ("sin cebolla" es del chilaquil, no de toda la mesa)
  const conEspecificaciones = comanda.detalles.filter(
    (d) => d.especificaciones && d.especificaciones.trim() !== '' && d.id_estado !== ESTADO_DETALLE.cancelado
  );

  // Botón "Completar": marca como listos los productos que faltan y manda UN solo aviso
  // 'pedido_listo' al mesero. No cierra la cuenta: eso lo hace quien cobra.
  const handleCompletarOrden = () => {
    if (faltantes.length === 0) {
      mostrarAviso('Nada pendiente', `La Mesa ${comanda.num_mesa} no tiene productos por preparar.`);
      return;
    }

    const cuantos = faltantes.length === 1 ? 'el producto que falta' : `los ${faltantes.length} productos que faltan`;
    mostrarAviso(
      'Completar orden',
      `¿Marcar como listos ${cuantos} de la Mesa ${comanda.num_mesa}? Se enviará un solo aviso al mesero.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          style: 'default',
          onPress: async () => {
            await completarComanda(comanda.id_comanda);
            // Sin conexión el cambio queda en la cola: se dice tal cual para no prometer de más
            mostrarAviso(
              sinConexion ? 'Guardado sin conexión' : '¡Orden lista!',
              sinConexion
                ? `Los productos de la Mesa ${comanda.num_mesa} quedaron listos en este teléfono. El aviso al mesero se enviará al volver la conexión.`
                : `Se avisó al mesero que el pedido de la Mesa ${comanda.num_mesa} está listo para servirse.`,
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

      {/* Solo aparece sin conexión o con cambios por enviar */}
      <AvisoSinConexion />

      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
        {/* Subtítulo: Orden #1 */}
        <Text style={[estilos.subtituloOrden, { color: colores.primary }]}>
          Orden #{comanda.num_mesa}
        </Text>

        {!editable && (
          <Text style={[estilos.notaSoloLectura, { color: colores.text_muted }]}>
            Esta cuenta ya se cerró: solo se puede consultar.
          </Text>
        )}

        {/* Tarjetas de productos */}
        {comanda.detalles.map((detalle: DetalleCocina) => {
          const enPreparacion = detalle.id_estado === ESTADO_DETALLE.en_preparacion;
          const estaListo = detalle.id_estado === ESTADO_DETALLE.listo;
          // Entregado o cancelado ya no es trabajo de la cocina: se muestra, pero no se toca
          const terminado =
            detalle.id_estado === ESTADO_DETALLE.entregado || detalle.id_estado === ESTADO_DETALLE.cancelado;
          const sePuedeCambiar = editable && !terminado;

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
                  {terminado && (
                    <Text style={[estilos.estadoTerminado, { color: colores.text_muted }]}>
                      {detalle.id_estado === ESTADO_DETALLE.entregado ? 'Entregado' : 'Cancelado'}
                    </Text>
                  )}
                </View>

                {/* Selector de tiempo estimado */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!sePuedeCambiar}
                  onPress={() => setIdDetalleParaTiempo(detalle.id_detalle)}
                  style={[estilos.cajaTiempoEstimado, { borderColor: colores.text }]}
                >
                  <Text style={[estilos.labelTiempoEstimado, { color: colores.text }]}>
                    Selecciona el tiempo{'\n'}estimado (min):
                  </Text>
                  <View style={[estilos.dropdownPill, { borderColor: colores.text }]}>
                    <Ionicons name="time-outline" size={16} color={colores.text} />
                    <Text style={[estilos.textoMinutosDropdown, { color: colores.text }]}>
                      {detalle.tiempo_estimado ? `${detalle.tiempo_estimado}:00` : '--:--'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colores.text} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Botones: En preparación / Listo. Un producto pendiente no tiene ninguno marcado. */}
              <View style={estilos.filaBotonesEstado}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!sePuedeCambiar}
                  accessibilityState={{ selected: enPreparacion, disabled: !sePuedeCambiar }}
                  onPress={() =>
                    cambiarEstadoProducto(comanda.id_comanda, detalle.id_detalle, ESTADO_DETALLE.en_preparacion)
                  }
                  style={[
                    estilos.botonEstado,
                    enPreparacion
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
                      enPreparacion ? { color: colores.warning } : { color: colores.text_muted },
                    ]}
                  >
                    En preparación
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!sePuedeCambiar}
                  accessibilityState={{ selected: estaListo, disabled: !sePuedeCambiar }}
                  onPress={() =>
                    cambiarEstadoProducto(comanda.id_comanda, detalle.id_detalle, ESTADO_DETALLE.listo)
                  }
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
          {conEspecificaciones.length > 0 ? (
            conEspecificaciones.map((d) => (
              <Text key={d.id_detalle} style={[estilos.textoEspecificaciones, { color: colores.text_secondary }]}>
                • {d.nombre_producto}: {d.especificaciones}
              </Text>
            ))
          ) : (
            <Text style={[estilos.textoEspecificaciones, { color: colores.text_secondary }]}>
              • Sin especificaciones
            </Text>
          )}
        </View>

        {/* Tiempo estimado total */}
        <Text style={[estilos.tiempoEstimadoTotalTexto, { color: colores.text }]}>
          Tiempo estimado: {tiempoEstimadoTotal}min
        </Text>

        {/* Botón Completar (solo en cuentas abiertas) */}
        {editable && (
          <CustomButton
            titulo="Completar"
            variante="primary"
            onPress={handleCompletarOrden}
            estilo={estilos.botonCompletar}
          />
        )}
      </ScrollView>

      {/* Modal para cambiar tiempo estimado */}
      <Modal
        visible={!!detalleParaTiempo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIdDetalleParaTiempo(null)}
      >
        <TouchableOpacity
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
          activeOpacity={1}
          onPress={() => setIdDetalleParaTiempo(null)}
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
                    detalleParaTiempo?.tiempo_estimado === min
                      ? { backgroundColor: colores.primary }
                      : { backgroundColor: colores.placeholder },
                  ]}
                  onPress={async () => {
                    if (detalleParaTiempo) {
                      // Se cierra primero: el cambio entra a la cola y se ve al instante
                      setIdDetalleParaTiempo(null);
                      await cambiarTiempoEstimado(comanda.id_comanda, detalleParaTiempo.id_detalle, min);
                    }
                  }}
                >
                  <Text
                    style={[
                      estilos.textoMinutosItem,
                      {
                        color:
                          detalleParaTiempo?.tiempo_estimado === min
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
  // Nuevos (cocina con datos reales): mismo tamaño que el resto del texto secundario
  estadoTerminado: {
    fontFamily: fuentes.medium,
    fontSize: 13,
    marginTop: 2,
  },
  notaSoloLectura: {
    fontFamily: fuentes.medium,
    fontSize: 14,
    textAlign: 'center',
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
