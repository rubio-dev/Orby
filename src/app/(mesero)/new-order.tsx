import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { useCatalog } from '@/context/catalog-context';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { Producto } from '@/types';

export default function MeseroNewOrderScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { productos } = useCatalog();
  const { mesas, mesaSeleccionada, seleccionarMesa, carrito, agregarAlCarrito } = useOrders();

  const [categoriaFiltro, setCategoriaFiltro] = useState<'Bebidas' | 'Comida' | 'Postres'>('Bebidas');
  const [modalMesaAbierto, setModalMesaAbierto] = useState(false);

  const productosFiltrados = productos.filter(
    (p) => p.nombre_categoria === categoriaFiltro && p.estado !== false
  );

  const cantidadTotalEnCarrito = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const handleAgregarProducto = (p: Producto) => {
    agregarAlCarrito({
      id_producto: p.id_producto,
      nombre_producto: p.nombre_producto,
      precio: p.precio,
      cantidad: 1,
      especificaciones: '',
      imagen_url: p.imagen_url,
    });
    Alert.alert('Agregado', `${p.nombre_producto} se agregó al pedido de la Mesa ${mesaSeleccionada}.`);
  };

  const handleIrAlResumen = () => {
    if (carrito.length === 0) {
      Alert.alert('Pedido vacío', 'Selecciona al menos un producto para continuar.');
      return;
    }
    router.push('/(mesero)/order-summary');
  };

  const renderProducto = ({ item }: { item: Producto }) => {
    const enCarrito = carrito.find((c) => c.id_producto === item.id_producto);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleAgregarProducto(item)}
        style={[estilos.tarjetaProducto, { backgroundColor: colores.surface }]}
      >
        <View style={estilos.imagenContenedor}>
          {item.imagen_url ? (
            <Image
              source={{ uri: item.imagen_url }}
              style={estilos.imagen}
              contentFit="cover"
            />
          ) : (
            <View style={[estilos.imagenFallback, { backgroundColor: '#E2ECE8' }]}>
              <Ionicons name="cafe-outline" size={26} color={colores.primary_strong} />
            </View>
          )}
        </View>

        <View style={estilos.info}>
          <Text style={[estilos.nombre, { color: colores.text }]}>
            {item.nombre_producto}
          </Text>
          <View style={estilos.filaPrecio}>
            <Text style={[estilos.desc, { color: colores.text_muted }]}>
              Descripción
            </Text>
            <Text style={[estilos.precio, { color: colores.text }]}>
              ${item.precio}
            </Text>
          </View>
        </View>

        {enCarrito && (
          <View style={[estilos.badgeCantidad, { backgroundColor: '#388D7A' }]}>
            <Text style={estilos.badgeTexto}>+{enCarrito.cantidad}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Nuevo pedido"
        onBack={() => router.push('/(mesero)' as any)}
      />

      <View style={estilos.contenido}>
        {/* Selector de Mesa (Mesa 5 con flecha) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setModalMesaAbierto(true)}
          style={[estilos.selectorMesa, { backgroundColor: colores.surface }]}
        >
          <Text style={estilos.textoMesa}>Mesa {mesaSeleccionada}</Text>
          <Ionicons name="chevron-down" size={24} color="#1A1D1C" />
        </TouchableOpacity>

        {/* Pastillas de Categorías: Bebidas | Comida | Postres */}
        <SegmentedTabs
          opciones={[
            { id: 'Bebidas', etiqueta: 'Bebidas' },
            { id: 'Comida', etiqueta: 'Comida' },
            { id: 'Postres', etiqueta: 'Postres' },
          ]}
          seleccionada={categoriaFiltro}
          alSeleccionar={setCategoriaFiltro}
          tipo="pills"
        />

        {/* Lista de productos */}
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id_producto}
          renderItem={renderProducto}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
        />

        {/* Botones inferiores: Agregar pedido y Carrito */}
        <View style={estilos.barraAcciones}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleIrAlResumen}
            style={[estilos.botonAgregarPedido, { backgroundColor: '#388D7A' }]}
          >
            <Text style={estilos.textoBotonAgregar}>Agregar pedido</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleIrAlResumen}
            style={[estilos.botonCarrito, { backgroundColor: '#388D7A' }]}
          >
            <Ionicons name="cart" size={28} color="#FFFFFF" />
            {cantidadTotalEnCarrito > 0 && (
              <View style={estilos.badgeCarrito}>
                <Text style={estilos.badgeCarritoTexto}>{cantidadTotalEnCarrito}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal para seleccionar mesa */}
      <Modal
        visible={modalMesaAbierto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalMesaAbierto(false)}
      >
        <TouchableOpacity
          style={estilos.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalMesaAbierto(false)}
        >
          <View style={[estilos.modalContenido, { backgroundColor: colores.surface }]}>
            <Text style={[tipografia.titulo, { marginBottom: espaciado.md }]}>
              Seleccionar mesa
            </Text>
            <View style={estilos.gridMesasModal}>
              {mesas.map((m) => (
                <TouchableOpacity
                  key={m.num_mesa}
                  style={[
                    estilos.itemMesaModal,
                    m.num_mesa === mesaSeleccionada
                      ? { backgroundColor: '#388D7A' }
                      : { backgroundColor: '#E2ECE8' },
                  ]}
                  onPress={() => {
                    seleccionarMesa(m.num_mesa);
                    setModalMesaAbierto(false);
                  }}
                >
                  <Text
                    style={[
                      estilos.itemMesaModalTexto,
                      { color: m.num_mesa === mesaSeleccionada ? '#FFFFFF' : '#1A1D1C' },
                    ]}
                  >
                    {m.num_mesa}
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
  contenido: {
    flex: 1,
    paddingHorizontal: espaciado.pantalla,
  },
  selectorMesa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#1A1D1C',
    borderRadius: 26,
    paddingHorizontal: espaciado.lg,
    marginBottom: espaciado.sm,
  },
  textoMesa: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    color: '#1A1D1C',
  },
  lista: {
    paddingBottom: 90,
    gap: espaciado.md,
    marginTop: espaciado.xs,
  },
  tarjetaProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espaciado.md,
    borderRadius: radios.xxl,
    borderWidth: 1.5,
    borderColor: '#1A1D1C',
    minHeight: 84,
  },
  imagenContenedor: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: espaciado.md,
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  imagenFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  nombre: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: espaciado.md,
    marginTop: 4,
  },
  desc: {
    fontSize: 14,
  },
  precio: {
    fontFamily: fuentes.bold,
    fontSize: 17,
  },
  badgeCantidad: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: espaciado.xs,
  },
  badgeTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  barraAcciones: {
    position: 'absolute',
    bottom: espaciado.md,
    left: espaciado.pantalla,
    right: espaciado.pantalla,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  botonAgregarPedido: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonAgregar: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  botonCarrito: {
    width: 54,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCarrito: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#B3261E',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeCarritoTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  modalContenido: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radios.xl,
    padding: espaciado.lg,
  },
  gridMesasModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    justifyContent: 'center',
  },
  itemMesaModal: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMesaModalTexto: {
    fontFamily: fuentes.bold,
    fontSize: 20,
  },
});
