import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { useCatalog } from '@/context/catalog-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { Producto } from '@/types';

export default function MeseroMenuViewScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { productos, categorias } = useCatalog();

  const [categoria, setCategoria] = useState<string>('');
  const categoriaElegida = categorias.some((c) => c.nombre_categoria === categoria)
    ? categoria
    : (categorias[0]?.nombre_categoria ?? '');

  const productosFiltrados = productos.filter(
    (p) => p.nombre_categoria === categoriaElegida && p.estado !== false
  );

  const renderItem = ({ item }: { item: Producto }) => (
    <View
      accessible
      accessibilityLabel={`${item.nombre_producto}, ${item.precio} pesos, ${
        item.descripcion || 'sin descripción'
      }`}
      style={[estilos.tarjeta, { backgroundColor: colores.surface, borderColor: colores.text }]}
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
    </View>
  );

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Ver menú"
        onBack={() => router.push('/(mesero)' as any)}
      />

      <View style={estilos.contenido}>
        {/* Categorías reales de la cafetería */}
        {categorias.length > 0 && (
          <SegmentedTabs
            opciones={categorias.map((c) => ({
              id: c.nombre_categoria,
              etiqueta: c.nombre_categoria,
            }))}
            seleccionada={categoriaElegida}
            alSeleccionar={setCategoria}
            tipo="pills"
          />
        )}

        {/* Lista de platillos */}
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id_producto}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Text style={[tipografia.cuerpo, { color: colores.text_muted }]}>
                No hay productos en esta sección
              </Text>
            </View>
          }
        />
      </View>
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
  vacio: {
    padding: espaciado.xxl,
    alignItems: 'center',
  },
});

