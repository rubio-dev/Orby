import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { ScreenHeader } from '@/components/ScreenHeader';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, useTema } from '@/theme';
import type { EstadoMesa, Mesa } from '@/types';

export default function MeseroTablesScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { mesas, cambiarEstadoMesa, seleccionarMesa } = useOrders();

  const [mesaParaModificar, setMesaParaModificar] = useState<Mesa | null>(null);

  const handleSeleccionarEstado = async (nuevoEstado: EstadoMesa) => {
    if (mesaParaModificar) {
      await cambiarEstadoMesa(mesaParaModificar.num_mesa, nuevoEstado);
      setMesaParaModificar(null);
    }
  };

  const handleTomarPedidoMesa = () => {
    if (mesaParaModificar) {
      seleccionarMesa(mesaParaModificar.num_mesa);
      setMesaParaModificar(null);
      router.push('/(mesero)/new-order');
    }
  };

  const obtenerColorTextoEstado = (estado: EstadoMesa) => {
    if (estado === 'ocupada') return colores.danger; // Rojo pág. 7
    if (estado === 'apartada') return colores.warning; // Amarillo pág. 7
    return colores.text; // Libre
  };

  const capitalizar = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Ver mesas"
        onBack={() => router.push('/(mesero)' as any)}
      />

      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
        <View style={estilos.grid}>
          {mesas.map((mesa) => {
            const colorTexto = obtenerColorTextoEstado(mesa.estado);

            return (
              <TouchableOpacity
                key={mesa.id_mesa}
                activeOpacity={0.8}
                onPress={() => setMesaParaModificar(mesa)}
                style={[
                  estilos.tarjetaMesa,
                  {
                    backgroundColor: colores.primary_soft,
                  },
                ]}
              >
                <Text style={[estilos.numeroMesa, { color: colorTexto }]}>
                  {mesa.num_mesa}
                </Text>
                <Text style={[estilos.estadoMesa, { color: colorTexto }]}>
                  {capitalizar(mesa.estado)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal / Popup de cambio de estado (Página 8) */}
      <Modal
        visible={!!mesaParaModificar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMesaParaModificar(null)}
      >
        <TouchableOpacity
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
          activeOpacity={1}
          onPress={() => setMesaParaModificar(null)}
        >
          <View style={[estilos.modalPopup, { backgroundColor: colores.primary, shadowColor: colores.shadow }]}>
            <Text style={[estilos.modalTitulo, { color: colores.on_primary }]}>
              Mesa {mesaParaModificar?.num_mesa}
            </Text>

            {/* Opción: Ocupada */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSeleccionarEstado('ocupada')}
              style={[estilos.opcionEstadoBoton, { borderColor: colores.on_primary }]}
            >
              <View style={estilos.iconoEstadoBox}>
                <Ionicons name="lock-closed-outline" size={20} color={colores.on_primary} />
              </View>
              <Text style={[estilos.textoOpcionEstado, { color: colores.on_primary }]}>Ocupada</Text>
            </TouchableOpacity>

            {/* Opción: Apartada */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSeleccionarEstado('apartada')}
              style={[estilos.opcionEstadoBoton, { borderColor: colores.on_primary }]}
            >
              <View style={estilos.iconoEstadoBox}>
                <Ionicons name="bookmark-outline" size={20} color={colores.on_primary} />
              </View>
              <Text style={[estilos.textoOpcionEstado, { color: colores.on_primary }]}>Apartada</Text>
            </TouchableOpacity>

            {/* Opción: Libre */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSeleccionarEstado('libre')}
              style={[estilos.opcionEstadoBoton, { borderColor: colores.on_primary }]}
            >
              <View style={estilos.iconoEstadoBox}>
                <Ionicons name="sparkles-outline" size={20} color={colores.on_primary} />
              </View>
              <Text style={[estilos.textoOpcionEstado, { color: colores.on_primary }]}>Libre</Text>
            </TouchableOpacity>

            {/* Botón rápido para tomar pedido en esta mesa */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleTomarPedidoMesa}
              style={[estilos.botonTomarPedidoDirecto, { backgroundColor: colores.surface }]}
            >
              <Ionicons name="clipboard-outline" size={20} color={colores.primary} />
              <Text style={[estilos.textoTomarPedidoDirecto, { color: colores.primary }]}>Tomar pedido en esta mesa</Text>
            </TouchableOpacity>
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
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: espaciado.sm,
  },
  tarjetaMesa: {
    width: '31%',
    aspectRatio: 0.88,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.sm,
  },
  numeroMesa: {
    fontFamily: fuentes.bold,
    fontSize: 34,
    lineHeight: 40,
  },
  estadoMesa: {
    fontFamily: fuentes.semibold,
    fontSize: 16,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  modalPopup: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    padding: espaciado.lg,
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: espaciado.sm,
  },
  modalTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 22,
    marginBottom: espaciado.xs,
  },
  opcionEstadoBoton: {
    width: '100%',
    height: 54,
    borderWidth: 2,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconoEstadoBox: {
    position: 'absolute',
    left: 18,
  },
  textoOpcionEstado: {
    fontFamily: fuentes.bold,
    fontSize: 20,
  },
  botonTomarPedidoDirecto: {
    marginTop: espaciado.sm,
    width: '100%',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  textoTomarPedidoDirecto: {
    fontFamily: fuentes.bold,
    fontSize: 15,
  },
});
