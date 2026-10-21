import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { useCatalog } from '@/context/catalog-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { Producto } from '@/types';

export default function AdminMenuScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { productos, cambiarEstadoProducto } = useCatalog();

  const [tabActual, setTabActual] = useState<'productos' | 'categorias'>('productos');
  const [busqueda, setBusqueda] = useState('');

  const productosFiltrados = productos.filter((p) =>
    p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const renderItemProducto = ({ item }: { item: Producto }) => (
    <View style={[estilos.tarjetaProducto, { backgroundColor: colores.surface, borderColor: colores.text }]}>
      {/* Imagen o miniatura */}
      <View style={estilos.imagenContenedor}>
        {item.imagen_url ? (
          <Image
            source={{ uri: item.imagen_url }}
            style={estilos.imagenProducto}
            contentFit="cover"
          />
        ) : (
          <View style={[estilos.imagenFallback, { backgroundColor: colores.placeholder }]}>
            <Ionicons name="cafe-outline" size={28} color={colores.primary_strong} />
          </View>
        )}
      </View>

      {/* Información del producto */}
      <View style={estilos.infoProducto}>
        <Text style={[estilos.nombreProducto, { color: colores.text }]}>
          {item.nombre_producto}
        </Text>
        <View style={estilos.filaPrecio}>
          <Text style={[estilos.descripcionProducto, { color: colores.text_muted }]}>
            Descripción
          </Text>
          <Text style={[estilos.precioProducto, { color: colores.text }]}>
            ${item.precio}
          </Text>
        </View>
      </View>

      {/* Interruptor de activación */}
      <View style={estilos.switchContenedor}>
        <Switch
          value={item.estado}
          onValueChange={(nuevoValor) => cambiarEstadoProducto(item.id_producto, nuevoValor)}
          trackColor={{ false: colores.border_strong, true: colores.primary }}
          thumbColor={Platform.OS === 'ios' ? undefined : colores.surface}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Menú"
        onBack={() => router.push('/(admin)' as any)}
      />

      <View style={estilos.contenido}>
        {/* Pestañas: Productos | Categorías */}
        <SegmentedTabs
          opciones={[
            { id: 'productos', etiqueta: 'Productos' },
            { id: 'categorias', etiqueta: 'Categorías' },
          ]}
          seleccionada={tabActual}
          alSeleccionar={setTabActual}
          tipo="tabs"
        />

        {tabActual === 'productos' ? (
          <>
            {/* Buscador de producto */}
            <View style={[estilos.buscadorContenedor, { backgroundColor: colores.surface, borderColor: colores.text }]}>
              <Ionicons name="search" size={22} color={colores.text} style={estilos.iconoBuscar} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar producto"
                placeholderTextColor={colores.text_muted}
                style={[estilos.inputBuscar, { color: colores.text }]}
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <Ionicons name="close-circle" size={18} color={colores.text_muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de productos */}
            <FlatList
              data={productosFiltrados}
              keyExtractor={(item) => item.id_producto}
              renderItem={renderItemProducto}
              contentContainerStyle={estilos.lista}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={estilos.vacioContenedor}>
                  <Text style={[tipografia.cuerpo, { color: colores.text_muted }]}>
                    No se encontraron productos
                  </Text>
                </View>
              }
            />

            {/* Botón Agregar producto */}
            <View style={estilos.pieBoton}>
              <CustomButton
                titulo="Agregar producto"
                variante="primary"
                onPress={() => router.push('/(admin)/new-product')}
                estilo={estilos.botonAgregar}
              />
            </View>
          </>
        ) : (
          /* Vista de Categorías */
          <View style={estilos.categoriasVista}>
            <Text style={[tipografia.cuerpo, { color: colores.text_secondary, marginBottom: espaciado.md }]}>
              Categorías activas en el menú de la cafetería:
            </Text>
            {['Bebidas', 'Comida', 'Postres'].map((cat, index) => (
              <View
                key={cat}
                style={[
                  estilos.tarjetaCategoria,
                  { backgroundColor: colores.surface, borderColor: colores.text },
                ]}
              >
                <Text style={[tipografia.cuerpo_fuerte, { color: colores.text }]}>
                  {index + 1}. {cat}
                </Text>
                <View style={[estilos.chipActivo, { backgroundColor: colores.primary }]}>
                  <Text style={[estilos.textoChipActivo, { color: colores.on_primary }]}>Activa</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <AdminBottomNav activa="menu" />
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
  buscadorContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: espaciado.md,
    marginTop: espaciado.xs,
    marginBottom: espaciado.md,
  },
  iconoBuscar: {
    marginRight: espaciado.sm,
  },
  inputBuscar: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  lista: {
    paddingBottom: 80,
    gap: espaciado.md,
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
  imagenProducto: {
    width: '100%',
    height: '100%',
  },
  imagenFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoProducto: {
    flex: 1,
    justifyContent: 'center',
  },
  nombreProducto: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: espaciado.sm,
    marginTop: 4,
  },
  descripcionProducto: {
    fontSize: 14,
  },
  precioProducto: {
    fontFamily: fuentes.bold,
    fontSize: 16,
  },
  switchContenedor: {
    marginLeft: espaciado.xs,
  },
  pieBoton: {
    position: 'absolute',
    bottom: espaciado.sm,
    left: espaciado.pantalla,
    right: espaciado.pantalla,
  },
  botonAgregar: {
    borderRadius: 26,
    height: 52,
  },
  vacioContenedor: {
    padding: espaciado.xl,
    alignItems: 'center',
  },
  categoriasVista: {
    marginTop: espaciado.md,
    gap: espaciado.md,
  },
  tarjetaCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1.5,
  },
  chipActivo: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoChipActivo: {
    fontSize: 12,
    fontWeight: '700',
  },
});
