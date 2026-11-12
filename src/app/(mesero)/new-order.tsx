import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomInput } from '@/components/CustomInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { useCatalog } from '@/context/catalog-context';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { Producto } from '@/types';
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)

export default function MeseroNewOrderScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { productos, categorias } = useCatalog();
  const {
    mesas,
    mesaSeleccionada,
    seleccionarMesa,
    tipoServicio,
    nombreCliente,
    seleccionarTipoServicio,
    actualizarNombreCliente,
    carrito,
    agregarAlCarrito,
  } = useOrders();

  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [modalMesaAbierto, setModalMesaAbierto] = useState(false);

  const categoriaElegida = categorias.some((c) => c.nombre_categoria === categoriaFiltro)
    ? categoriaFiltro
    : (categorias[0]?.nombre_categoria ?? '');

  const productosFiltrados = productos.filter(
    (p) => p.nombre_categoria === categoriaElegida && p.estado !== false
  );

  const cantidadTotalEnCarrito = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const handleAgregarProducto = (p: Producto) => {
    agregarAlCarrito({
      id_producto: p.id_producto,
      nombre_producto: p.nombre_producto,
      descripcion: p.descripcion,
      precio: p.precio,
      cantidad: 1,
      especificaciones: '',
      imagen_url: p.imagen_url,
    });
    mostrarAviso('Agregado', `${p.nombre_producto} se agregó al pedido.`);
  };

  const handleIrAlResumen = () => {
    if (carrito.length === 0) {
      mostrarAviso('Pedido vacío', 'Selecciona al menos un producto para continuar.');
      return;
    }
    if (tipoServicio === 'llevar' && !nombreCliente.trim()) {
      mostrarAviso('Falta el nombre', 'Escribe el nombre del cliente para el pedido para llevar.');
      return;
    }
    if (tipoServicio === 'mesa' && mesaSeleccionada <= 0) {
      mostrarAviso('Selecciona una mesa', 'Elige la mesa antes de revisar el pedido.');
      setModalMesaAbierto(true);
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
        accessibilityRole="button"
        accessibilityLabel={`${item.nombre_producto}, ${item.precio} pesos${
          enCarrito ? `, ${enCarrito.cantidad} en el carrito` : ''
        }`}
        accessibilityHint="Agrega una unidad de este producto al pedido"
        style={[estilos.tarjetaProducto, { backgroundColor: colores.surface, borderColor: colores.text }]}
      >
        <View style={estilos.imagenContenedor}>
          {item.imagen_url ? (
            <Image
              source={{ uri: item.imagen_url }}
              style={estilos.imagen}
              contentFit="cover"
            />
          ) : (
            <View style={[estilos.imagenFallback, { backgroundColor: colores.placeholder }]}>
              <Ionicons name="cafe-outline" size={26} color={colores.primary_strong} />
            </View>
          )}
        </View>

        <View style={estilos.info}>
          <Text style={[estilos.nombre, { color: colores.text }]}>
            {item.nombre_producto}
          </Text>
          <View style={estilos.filaPrecio}>
            <Text style={[estilos.desc, { color: colores.text_muted }]} numberOfLines={1}>
              {item.descripcion || 'Sin descripción'}
            </Text>
            <Text style={[estilos.precio, { color: colores.text }]}>
              ${item.precio}
            </Text>
          </View>
        </View>

        {enCarrito && (
          <View style={[estilos.badgeCantidad, { backgroundColor: colores.primary }]}>
            <Text style={[estilos.badgeTexto, { color: colores.on_primary }]}>+{enCarrito.cantidad}</Text>
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
        {/* Tipo de servicio: comer aquí o para llevar */}
        <SegmentedTabs<'mesa' | 'llevar'>
          opciones={[
            { id: 'mesa', etiqueta: 'Comer aquí' },
            { id: 'llevar', etiqueta: 'Para llevar' },
          ]}
          seleccionada={tipoServicio}
          alSeleccionar={seleccionarTipoServicio}
          tipo="tabs"
        />

        {tipoServicio === 'llevar' ? (
          <CustomInput
            label="Nombre del cliente"
            placeholder="Ej. Ana, pedido 12..."
            value={nombreCliente}
            onChangeText={actualizarNombreCliente}
            obligatorio
            autoCapitalize="words"
            accessibilityHint="Se usa para llamar al cliente cuando el pedido esté listo"
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setModalMesaAbierto(true)}
            accessibilityRole="button"
            accessibilityLabel={
              mesaSeleccionada > 0 ? `Mesa seleccionada, ${mesaSeleccionada}` : 'Selecciona una mesa'
            }
            accessibilityHint="Abre la lista de mesas"
            style={[estilos.selectorMesa, { backgroundColor: colores.surface, borderColor: colores.text }]}
          >
            <Text style={[estilos.textoMesa, { color: colores.text }]}>
              {mesaSeleccionada > 0 ? `Mesa ${mesaSeleccionada}` : 'Selecciona una mesa'}
            </Text>
            <Ionicons name="chevron-down" size={24} color={colores.text} />
          </TouchableOpacity>
        )}

        {/* Categorías reales de la cafetería */}
        {categorias.length > 0 && (
          <SegmentedTabs
            opciones={categorias.map((c) => ({
              id: c.nombre_categoria,
              etiqueta: c.nombre_categoria,
            }))}
            seleccionada={categoriaElegida}
            alSeleccionar={setCategoriaFiltro}
            tipo="pills"
          />
        )}

        {/* Lista de productos */}
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id_producto}
          renderItem={renderProducto}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Text style={[tipografia.cuerpo, { color: colores.text_muted }]}>
                No hay productos disponibles. El administrador debe cargar el menú.
              </Text>
            </View>
          }
        />

        {/* Botones inferiores: Agregar pedido y Carrito */}
        <View style={estilos.barraAcciones}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleIrAlResumen}
            accessibilityRole="button"
            accessibilityLabel={`Revisar pedido, ${cantidadTotalEnCarrito} productos`}
            style={[estilos.botonAgregarPedido, { backgroundColor: colores.primary }]}
          >
            <Text style={[estilos.textoBotonAgregar, { color: colores.on_primary }]}>Agregar pedido</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleIrAlResumen}
            accessibilityRole="button"
            accessibilityLabel={`Ver carrito, ${cantidadTotalEnCarrito} productos`}
            style={[estilos.botonCarrito, { backgroundColor: colores.primary }]}
          >
            <Ionicons name="cart" size={28} color={colores.on_primary} />
            {cantidadTotalEnCarrito > 0 && (
              <View style={[estilos.badgeCarrito, { backgroundColor: colores.danger }]}>
                <Text style={[estilos.badgeCarritoTexto, { color: colores.on_danger }]}>{cantidadTotalEnCarrito}</Text>
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
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
          activeOpacity={1}
          onPress={() => setModalMesaAbierto(false)}
        >
          <View
            accessibilityViewIsModal
            style={[estilos.modalContenido, { backgroundColor: colores.surface }]}
          >
            <Text
              accessibilityRole="header"
              style={[tipografia.titulo, { color: colores.text, marginBottom: espaciado.md }]}
            >
              Seleccionar mesa
            </Text>
            <View style={estilos.gridMesasModal}>
              {mesas.map((m) => {
                const noDisponible = m.estado === 'inactiva' || m.estado === 'apartada';
                const seleccionada = m.num_mesa === mesaSeleccionada;

                return (
                  <TouchableOpacity
                    key={m.num_mesa}
                    accessibilityRole="button"
                    accessibilityLabel={`Mesa ${m.num_mesa}, ${m.estado}${
                      m.estado === 'ocupada' ? ', los productos se agregan a la cuenta abierta' : ''
                    }`}
                    accessibilityState={{ selected: seleccionada, disabled: noDisponible }}
                    disabled={noDisponible}
                    style={[
                      estilos.itemMesaModal,
                      seleccionada
                        ? { backgroundColor: colores.primary }
                        : m.estado === 'ocupada'
                          ? { backgroundColor: colores.warning_soft }
                          : { backgroundColor: colores.placeholder },
                      noDisponible ? { opacity: 0.4 } : null,
                    ]}
                    onPress={() => {
                      seleccionarMesa(m.num_mesa);
                      setModalMesaAbierto(false);
                    }}
                  >
                    <Text
                      style={[
                        estilos.itemMesaModalTexto,
                        { color: seleccionada ? colores.on_primary : colores.text },
                      ]}
                    >
                      {m.num_mesa}
                    </Text>
                    <Text
                      style={[
                        estilos.itemMesaModalEstado,
                        {
                          color: seleccionada
                            ? colores.on_primary
                            : m.estado === 'ocupada'
                              ? colores.warning
                              : colores.text_muted,
                        },
                      ]}
                    >
                      {m.estado === 'ocupada' ? 'Cuenta' : m.estado === 'apartada' ? 'Apartada' : m.estado === 'inactiva' ? 'Inactiva' : 'Libre'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {mesas.some((m) => m.estado === 'ocupada') && (
              <Text style={[tipografia.micro, { color: colores.text_muted, marginTop: espaciado.sm }]}>
                Las mesas con cuenta abierta se marcan como “Cuenta”: si las eliges, los productos se agregan a esa cuenta.
              </Text>
            )}
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
    borderRadius: 26,
    paddingHorizontal: espaciado.lg,
    marginBottom: espaciado.sm,
  },
  textoMesa: {
    fontFamily: fuentes.bold,
    fontSize: 20,
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
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeCarritoTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
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
  itemMesaModalEstado: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  vacio: {
    alignItems: 'center',
    paddingTop: espaciado.xl,
    paddingHorizontal: espaciado.lg,
  },
});
