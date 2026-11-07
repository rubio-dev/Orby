import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useOrders } from '@/context/orders-context';
import { confirmarAccion, mostrarAviso } from '@/lib/confirm';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { EstadoMesa, Mesa } from '@/types';

export default function AdminTablesScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const {
    mesas,
    cargandoMesas,
    pendientesMesas,
    sincronizandoColaMesas,
    sincronizarColaMesasPendiente,
    recargarMesas,
    crearMesa,
    abrirMesa,
    cerrarMesa,
    eliminarMesa,
  } = useOrders();

  // Estados locales
  const [refrescando, setRefrescando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [creando, setCreando] = useState(false);
  const [accionEnProgreso, setAccionEnProgreso] = useState<string | null>(null);

  // Recarga manual mediante pull-to-refresh
  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargarMesas();
    } finally {
      setRefrescando(false);
    }
  };

  // KPIs
  const totalMesas = mesas.length;
  const mesasAbiertas = mesas.filter(
    (m) => m.estado === 'libre' || m.estado === 'apartada'
  ).length;
  const mesasOcupadas = mesas.filter((m) => m.estado === 'ocupada').length;
  const mesasCerradas = mesas.filter((m) => m.estado === 'inactiva').length;

  // Apertura de modal con sugerencia automática de siguiente número
  const abrirModalCrear = (siguienteSugerido?: number) => {
    if (siguienteSugerido !== undefined) {
      setNuevoNumero(String(siguienteSugerido));
    } else {
      const maxNum = mesas.reduce((max, m) => Math.max(max, m.num_mesa), 0);
      setNuevoNumero(String(maxNum + 1));
    }
    setModalVisible(true);
  };

  // Sincronización manual de la cola de mesas
  const handleSincronizarCola = async () => {
    try {
      const res = await sincronizarColaMesasPendiente();
      if (res.pendientes === 0) {
        mostrarAviso(
          'Sincronización completa',
          'Todos los cambios pendientes de mesas se aplicaron con éxito.'
        );
      } else {
        mostrarAviso(
          'Sincronización parcial',
          `Se aplicaron ${res.sincronizados} cambio(s), pero aún quedan ${res.pendientes} pendientes.`
        );
      }
    } catch {
      mostrarAviso('Error', 'No se pudo sincronizar la cola de mesas.');
    }
  };

  const handleCrearMesa = async () => {
    const num = parseInt(nuevoNumero.trim(), 10);
    if (isNaN(num) || num <= 0) {
      mostrarAviso(
        'Número inválido',
        'Por favor ingresa un número de mesa entero y mayor a 0.'
      );
      return;
    }

    setCreando(true);
    try {
      const res = await crearMesa(num);
      if (res.enCola) {
        setModalVisible(false);
        setNuevoNumero('');
        mostrarAviso(
          'Cambio guardado en cola',
          'Sin conexión al servidor. El cambio se aplicó localmente y se sincronizará automáticamente al reconectar.'
        );
      } else if (res.exito) {
        setModalVisible(false);
        setNuevoNumero('');
        mostrarAviso('Mesa creada', `La mesa #${num} se ha creado correctamente.`);
      } else {
        mostrarAviso('No se pudo crear la mesa', res.error || 'Ocurrió un error inesperado.');
      }
    } finally {
      setCreando(false);
    }
  };

  const handleAbrirMesa = async (mesa: Mesa) => {
    setAccionEnProgreso(mesa.id_mesa);
    try {
      const res = await abrirMesa(mesa.id_mesa);
      if (res.enCola) {
        mostrarAviso(
          'Cambio guardado en cola',
          'Sin conexión al servidor. El cambio se aplicó localmente y se sincronizará automáticamente al reconectar.'
        );
      } else if (!res.exito) {
        mostrarAviso('Error al abrir mesa', res.error || 'No se pudo abrir la mesa.');
      }
    } finally {
      setAccionEnProgreso(null);
    }
  };

  const handleCerrarMesa = (mesa: Mesa) => {
    if (mesa.estado === 'ocupada') {
      confirmarAccion({
        titulo: 'Mesa con comanda activa',
        mensaje: `La mesa #${mesa.num_mesa} se encuentra actualmente ocupada con un pedido en curso. ¿Deseas forzar el cierre de la mesa?`,
        textoConfirmar: 'Forzar cierre',
        textoCancelar: 'Cancelar',
        destructivo: true,
        alConfirmar: async () => {
          setAccionEnProgreso(mesa.id_mesa);
          try {
            const res = await cerrarMesa(mesa.id_mesa, true);
            if (res.enCola) {
              mostrarAviso(
                'Cambio guardado en cola',
                'Sin conexión al servidor. El cambio se aplicó localmente y se sincronizará automáticamente al reconectar.'
              );
            } else if (!res.exito) {
              mostrarAviso('Error al cerrar mesa', res.error || 'No se pudo cerrar la mesa.');
            }
          } finally {
            setAccionEnProgreso(null);
          }
        },
      });
      return;
    }

    confirmarAccion({
      titulo: 'Cerrar mesa',
      mensaje: `¿Deseas cerrar la mesa #${mesa.num_mesa}? La mesa quedará inactiva y no podrá recibir nuevas órdenes hasta que sea abierta nuevamente.`,
      textoConfirmar: 'Cerrar mesa',
      textoCancelar: 'Cancelar',
      destructivo: false,
      alConfirmar: async () => {
        setAccionEnProgreso(mesa.id_mesa);
        try {
          const res = await cerrarMesa(mesa.id_mesa, false);
          if (res.enCola) {
            mostrarAviso(
              'Cambio guardado en cola',
              'Sin conexión al servidor. El cambio se aplicó localmente y se sincronizará automáticamente al reconectar.'
            );
          } else if (!res.exito) {
            mostrarAviso('Error al cerrar mesa', res.error || 'No se pudo cerrar la mesa.');
          }
        } finally {
          setAccionEnProgreso(null);
        }
      },
    });
  };

  const handleEliminarMesa = (mesa: Mesa) => {
    confirmarAccion({
      titulo: 'Eliminar mesa',
      mensaje: `¿Estás seguro de que deseas eliminar permanentemente la mesa #${mesa.num_mesa}? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      destructivo: true,
      alConfirmar: async () => {
        setAccionEnProgreso(mesa.id_mesa);
        try {
          const res = await eliminarMesa(mesa.id_mesa);
          if (res.enCola) {
            mostrarAviso(
              'Cambio guardado en cola',
              'Sin conexión al servidor. El cambio se aplicó localmente y se sincronizará automáticamente al reconectar.'
            );
          } else if (!res.exito) {
            mostrarAviso('Error al eliminar', res.error || 'No se pudo eliminar la mesa.');
          }
        } finally {
          setAccionEnProgreso(null);
        }
      },
    });
  };

  // Ayudante visual de badges según estado
  const obtenerConfigBadge = (estado: EstadoMesa) => {
    switch (estado) {
      case 'libre':
        return {
          etiqueta: 'Abierta',
          fondo: colores.primary_soft,
          texto: colores.primary_strong,
          borde: colores.primary,
        };
      case 'apartada':
        return {
          etiqueta: 'Apartada',
          fondo: colores.warning_soft,
          texto: colores.warning,
          borde: colores.warning,
        };
      case 'ocupada':
        return {
          etiqueta: 'Ocupada',
          fondo: colores.warning_soft,
          texto: colores.warning,
          borde: colores.warning_border,
        };
      case 'inactiva':
      default:
        return {
          etiqueta: 'Cerrada',
          fondo: colores.surface_muted,
          texto: colores.text_muted,
          borde: colores.border,
        };
    }
  };

  return (
    <SafeAreaView
      style={[estilos.pantalla, { backgroundColor: colores.background }]}
      edges={['top']}
    >
      {/* Cabecera */}
      <ScreenHeader
        titulo="Gestión de mesas"
        onBack={() => router.replace('/(admin)')}
      />

      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando || cargandoMesas}
            onRefresh={handleRefresh}
            tintColor={colores.primary}
            colors={[colores.primary]}
          />
        }
      >
        {/* Banner superior de sincronización offline */}
        {pendientesMesas > 0 && (
          <View
            style={[
              estilos.bannerCola,
              { backgroundColor: colores.warning_soft, borderColor: colores.warning_border },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={20}
              color={colores.warning}
              style={estilos.iconoCola}
            />
            <Text
              style={[
                tipografia.detalle,
                estilos.textoCola,
                { color: colores.warning },
              ]}
            >
              Hay {pendientesMesas} cambio(s) de mesas pendiente(s) de sincronizar
            </Text>
            <TouchableOpacity
              disabled={sincronizandoColaMesas}
              onPress={handleSincronizarCola}
              style={[estilos.botonReintentarCola, { backgroundColor: colores.warning }]}
            >
              {sincronizandoColaMesas ? (
                <ActivityIndicator size="small" color={colores.on_warning} />
              ) : (
                <Text
                  style={[
                    tipografia.detalle,
                    estilos.textoBotonCola,
                    { color: colores.on_warning },
                  ]}
                >
                  Sincronizar ahora
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Barra de KPIs */}
        <View style={estilos.filaKpis}>
          <View
            style={[
              estilos.tarjetaKpi,
              { backgroundColor: colores.surface, borderColor: colores.border },
            ]}
          >
            <Text style={[estilos.kpiValor, { color: colores.text }]}>
              {totalMesas}
            </Text>
            <Text style={[estilos.kpiEtiqueta, { color: colores.text_secondary }]}>
              Total
            </Text>
          </View>

          <View
            style={[
              estilos.tarjetaKpi,
              { backgroundColor: colores.surface, borderColor: colores.border },
            ]}
          >
            <Text style={[estilos.kpiValor, { color: colores.primary_strong }]}>
              {mesasAbiertas}
            </Text>
            <Text style={[estilos.kpiEtiqueta, { color: colores.text_secondary }]}>
              Abiertas
            </Text>
          </View>

          <View
            style={[
              estilos.tarjetaKpi,
              { backgroundColor: colores.surface, borderColor: colores.border },
            ]}
          >
            <Text style={[estilos.kpiValor, { color: colores.warning }]}>
              {mesasOcupadas}
            </Text>
            <Text style={[estilos.kpiEtiqueta, { color: colores.text_secondary }]}>
              Ocupadas
            </Text>
          </View>

          <View
            style={[
              estilos.tarjetaKpi,
              { backgroundColor: colores.surface, borderColor: colores.border },
            ]}
          >
            <Text style={[estilos.kpiValor, { color: colores.text_muted }]}>
              {mesasCerradas}
            </Text>
            <Text style={[estilos.kpiEtiqueta, { color: colores.text_secondary }]}>
              Cerradas
            </Text>
          </View>
        </View>

        {/* Botón principal de agregar mesa */}
        <View style={estilos.contenedorBotonAgregar}>
          <CustomButton
            titulo="+ Nueva mesa"
            variante="primary"
            onPress={() => abrirModalCrear()}
          />
        </View>

        {/* Listado de mesas o Empty State */}
        {mesas.length === 0 ? (
          <View
            style={[
              estilos.emptyStateContenedor,
              { backgroundColor: colores.surface, borderColor: colores.border },
            ]}
          >
            <Ionicons
              name="restaurant-outline"
              size={54}
              color={colores.text_muted}
              style={estilos.emptyStateIcono}
            />
            <Text style={[estilos.emptyStateTitulo, { color: colores.text }]}>
              No hay mesas registradas
            </Text>
            <Text
              style={[
                estilos.emptyStateDescripcion,
                { color: colores.text_secondary },
              ]}
            >
              Comienza agregando la primera mesa para gestionar la atención y los pedidos
              de tu cafetería.
            </Text>
            <CustomButton
              titulo="Crear Mesa 1"
              variante="primary"
              onPress={() => abrirModalCrear(1)}
              estilo={estilos.emptyStateBoton}
            />
          </View>
        ) : (
          <View style={estilos.cuadriculaMesas}>
            {mesas.map((mesa) => {
              const estaCargandoItem = accionEnProgreso === mesa.id_mesa;
              const badge = obtenerConfigBadge(mesa.estado);
              const estaCerrada = mesa.estado === 'inactiva';

              return (
                <View
                  key={mesa.id_mesa}
                  style={[
                    estilos.tarjetaMesa,
                    {
                      backgroundColor: colores.surface,
                      borderColor: colores.border,
                    },
                  ]}
                >
                  {/* Encabezado de la tarjeta: Icono, Número y Botón Eliminar */}
                  <View style={estilos.cabeceraTarjeta}>
                    <View style={estilos.filaIconoNumero}>
                      <View
                        style={[
                          estilos.iconoContenedor,
                          { backgroundColor: colores.surface_muted },
                        ]}
                      >
                        <Ionicons
                          name="restaurant-outline"
                          size={20}
                          color={colores.primary_strong}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            estilos.numeroMesa,
                            { color: colores.text },
                          ]}
                        >
                          Mesa {mesa.num_mesa}
                        </Text>
                      </View>
                    </View>

                    {/* Botón de eliminar */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={estaCargandoItem}
                      onPress={() => handleEliminarMesa(mesa)}
                      style={[
                        estilos.botonEliminar,
                        { backgroundColor: colores.danger_soft },
                      ]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colores.danger}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Badge de estado */}
                  <View style={estilos.contenedorBadge}>
                    <View
                      style={[
                        estilos.badgeEstado,
                        {
                          backgroundColor: badge.fondo,
                          borderColor: badge.borde,
                        },
                      ]}
                    >
                      <View
                        style={[
                          estilos.puntoEstado,
                          { backgroundColor: badge.texto },
                        ]}
                      />
                      <Text
                        style={[
                          estilos.textoBadge,
                          { color: badge.texto },
                        ]}
                      >
                        {badge.etiqueta}
                      </Text>
                    </View>
                  </View>

                  {/* Acciones directas de la mesa */}
                  <View style={estilos.accionesTarjeta}>
                    {estaCargandoItem ? (
                      <View style={estilos.cargadorItem}>
                        <ActivityIndicator size="small" color={colores.primary} />
                      </View>
                    ) : estaCerrada ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleAbrirMesa(mesa)}
                        style={[
                          estilos.botonAccionMesa,
                          {
                            backgroundColor: colores.primary,
                            borderColor: colores.primary,
                          },
                        ]}
                      >
                        <Ionicons
                          name="lock-open-outline"
                          size={16}
                          color={colores.on_primary}
                          style={estilos.iconoAccion}
                        />
                        <Text
                          style={[
                            estilos.textoBotonAccion,
                            { color: colores.on_primary },
                          ]}
                        >
                          Abrir mesa
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleCerrarMesa(mesa)}
                        style={[
                          estilos.botonAccionMesa,
                          {
                            backgroundColor: colores.surface_muted,
                            borderColor: colores.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="lock-closed-outline"
                          size={16}
                          color={colores.text}
                          style={estilos.iconoAccion}
                        />
                        <Text
                          style={[
                            estilos.textoBotonAccion,
                            { color: colores.text },
                          ]}
                        >
                          Cerrar mesa
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal para Crear Nueva Mesa */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!creando) setModalVisible(false);
        }}
      >
        <View
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
        >
          <Pressable
            style={estilos.modalBackdropPressable}
            onPress={() => {
              if (!creando) setModalVisible(false);
            }}
          />
          <View
            style={[
              estilos.modalTarjeta,
              {
                backgroundColor: colores.surface,
                borderColor: colores.border,
              },
            ]}
          >
            <View style={estilos.modalCabecera}>
              <View
                style={[
                  estilos.modalIconoContenedor,
                  { backgroundColor: colores.primary_soft },
                ]}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={24}
                  color={colores.primary_strong}
                />
              </View>
              <Text style={[estilos.modalTitulo, { color: colores.text }]}>
                Nueva mesa
              </Text>
            </View>

            <Text
              style={[
                estilos.modalDescripcion,
                { color: colores.text_secondary },
              ]}
            >
              Ingresa el número identificador para registrar una nueva mesa en la cafetería:
            </Text>

            <View style={estilos.contenedorInput}>
              <Text style={[estilos.etiquetaInput, { color: colores.text }]}>
                Número de mesa
              </Text>
              <TextInput
                value={nuevoNumero}
                onChangeText={setNuevoNumero}
                placeholder="Ej. 12"
                placeholderTextColor={colores.placeholder}
                keyboardType="number-pad"
                editable={!creando}
                style={[
                  estilos.inputNumerico,
                  {
                    backgroundColor: colores.surface_muted,
                    borderColor: colores.border,
                    color: colores.text,
                  },
                ]}
              />
            </View>

            <View style={estilos.modalAcciones}>
              <CustomButton
                titulo="Crear mesa"
                variante="primary"
                cargando={creando}
                onPress={handleCrearMesa}
              />
              <CustomButton
                titulo="Cancelar"
                variante="outline"
                deshabilitado={creando}
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Navegación inferior */}
      <AdminBottomNav activa="inicio" />
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
  },
  bannerCola: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    marginTop: espaciado.sm,
    marginBottom: espaciado.xs,
  },
  iconoCola: {
    marginRight: espaciado.xs,
  },
  textoCola: {
    flex: 1,
    fontFamily: fuentes.semibold,
  },
  botonReintentarCola: {
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: radios.sm,
    marginLeft: espaciado.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  textoBotonCola: {
    fontFamily: fuentes.bold,
  },
  filaKpis: {
    flexDirection: 'row',
    gap: espaciado.sm,
    marginVertical: espaciado.md,
  },
  tarjetaKpi: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radios.lg,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValor: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    lineHeight: 24,
  },
  kpiEtiqueta: {
    fontFamily: fuentes.medium,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  contenedorBotonAgregar: {
    marginBottom: espaciado.lg,
  },
  emptyStateContenedor: {
    borderWidth: 1.5,
    borderRadius: radios.xl,
    padding: espaciado.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: espaciado.md,
  },
  emptyStateIcono: {
    marginBottom: espaciado.sm,
  },
  emptyStateTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    marginBottom: espaciado.xs,
    textAlign: 'center',
  },
  emptyStateDescripcion: {
    fontFamily: fuentes.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: espaciado.lg,
  },
  emptyStateBoton: {
    minWidth: 160,
  },
  cuadriculaMesas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.md,
  },
  tarjetaMesa: {
    width: '47.5%',
    borderWidth: 1.5,
    borderRadius: radios.xl,
    padding: espaciado.md,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  cabeceraTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espaciado.xs,
  },
  filaIconoNumero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    flex: 1,
  },
  iconoContenedor: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroMesa: {
    fontFamily: fuentes.bold,
    fontSize: 16,
  },
  botonEliminar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenedorBadge: {
    marginVertical: espaciado.xs,
  },
  badgeEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radios.pastilla,
    paddingHorizontal: espaciado.sm,
    paddingVertical: 3,
    gap: 5,
  },
  puntoEstado: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textoBadge: {
    fontFamily: fuentes.semibold,
    fontSize: 11,
  },
  accionesTarjeta: {
    marginTop: espaciado.sm,
  },
  cargadorItem: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonAccionMesa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radios.md,
    height: 36,
    paddingHorizontal: espaciado.sm,
  },
  iconoAccion: {
    marginRight: 6,
  },
  textoBotonAccion: {
    fontFamily: fuentes.semibold,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: espaciado.md,
  },
  modalBackdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalTarjeta: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radios.xxl,
    borderWidth: 1.5,
    padding: espaciado.lg,
    zIndex: 1,
  },
  modalCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.xs,
  },
  modalIconoContenedor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
  },
  modalDescripcion: {
    fontFamily: fuentes.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: espaciado.md,
  },
  contenedorInput: {
    marginBottom: espaciado.lg,
  },
  etiquetaInput: {
    fontFamily: fuentes.semibold,
    fontSize: 13,
    marginBottom: espaciado.xs,
  },
  inputNumerico: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: radios.md,
    paddingHorizontal: espaciado.md,
    fontFamily: fuentes.bold,
    fontSize: 18,
  },
  modalAcciones: {
    gap: espaciado.sm,
  },
});
