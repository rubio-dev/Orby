import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { confirmarAccion, mostrarAviso } from '@/lib/confirm';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { Categoria, Producto } from '@/types';

export default function AdminMenuScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const {
    productos,
    categorias,
    pendientesSincronizar,
    sincronizandoCola,
    cambiarEstadoProducto,
    eliminarProducto,
    agregarCategoria,
    editarCategoria,
    eliminarCategoria,
    recargarProductos,
    sincronizarColaPendiente,
  } = useCatalog();

  const [tabActual, setTabActual] = useState<'productos' | 'categorias'>('productos');
  const [busqueda, setBusqueda] = useState('');
  const [mensajeReintento, setMensajeReintento] = useState<string | null>(null);

  // Estados para modal de crear / editar categoría
  const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState<Categoria | null>(null);
  const [nombreCategoriaInput, setNombreCategoriaInput] = useState('');
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);

  // Recarga al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      void recargarProductos();
    }, [recargarProductos])
  );

  const productosFiltrados = productos.filter((p) =>
    p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSincronizarCola = async () => {
    try {
      const res = await sincronizarColaPendiente((n, max) =>
        setMensajeReintento(`Sincronizando cola (intento ${n} de ${max})...`)
      );
      if (res.pendientes === 0) {
        mostrarAviso('Sincronización completa', 'Todos los cambios pendientes se aplicaron con éxito.');
      } else {
        mostrarAviso(
          'Sincronización parcial',
          `Se aplicaron ${res.sincronizados} cambio(s), pero aún quedan ${res.pendientes} pendientes.`
        );
      }
    } catch {
      mostrarAviso('Error', 'No se pudo sincronizar la cola.');
    } finally {
      setMensajeReintento(null);
    }
  };

  const handleCambiarEstado = async (idProducto: string, nuevoValor: boolean) => {
    try {
      const resultado = await cambiarEstadoProducto(idProducto, nuevoValor, (n, max) =>
        setMensajeReintento(`Actualizando estado (intento ${n} de ${max})...`)
      );
      if (resultado.enCola) {
        mostrarAviso(
          'Cambio en cola',
          'Sin conexión al servidor. El cambio de estado se guardó en cola y se sincronizará al reconectar.'
        );
      } else if (!resultado.exito) {
        mostrarAviso('Error', resultado.error ?? 'No se pudo cambiar el estado.');
      }
    } catch {
      mostrarAviso('Error', 'No se pudo actualizar el estado del producto.');
    } finally {
      setMensajeReintento(null);
    }
  };

  const handleEliminarProducto = (item: Producto) => {
    confirmarAccion({
      titulo: 'Eliminar producto',
      mensaje: `¿Estás seguro de que deseas eliminar "${item.nombre_producto}" del catálogo?`,
      textoConfirmar: 'Eliminar',
      destructivo: true,
      alConfirmar: async () => {
        try {
          const resultado = await eliminarProducto(item.id_producto, (n, max) =>
            setMensajeReintento(`Eliminando producto (intento ${n} de ${max})...`)
          );
          if (resultado.enCola) {
            mostrarAviso(
              'Guardado en cola',
              'El servidor no respondió. La eliminación quedó en cola y se aplicará al reconectar.'
            );
          } else if (!resultado.exito) {
            mostrarAviso('Error', resultado.error ?? 'No se pudo eliminar el producto.');
          }
        } catch {
          mostrarAviso('Error', 'No se pudo eliminar el producto.');
        } finally {
          setMensajeReintento(null);
        }
      },
    });
  };

  const abrirModalCrearCategoria = () => {
    setCategoriaEnEdicion(null);
    setNombreCategoriaInput('');
    setModalCategoriaVisible(true);
  };

  const abrirModalEditarCategoria = (cat: Categoria) => {
    setCategoriaEnEdicion(cat);
    setNombreCategoriaInput(cat.nombre_categoria);
    setModalCategoriaVisible(true);
  };

  const handleGuardarCategoria = async () => {
    const nombreLimpio = nombreCategoriaInput.trim();
    if (!nombreLimpio) {
      mostrarAviso('Nombre requerido', 'Por favor ingresa un nombre para la categoría.');
      return;
    }

    setGuardandoCategoria(true);
    try {
      const callbackReintento = (n: number, max: number) =>
        setMensajeReintento(
          categoriaEnEdicion
            ? `Editando categoría (intento ${n} de ${max})...`
            : `Guardando categoría (intento ${n} de ${max})...`
        );

      const resultado = categoriaEnEdicion
        ? await editarCategoria(categoriaEnEdicion.id_categoria, nombreLimpio, callbackReintento)
        : await agregarCategoria(nombreLimpio, callbackReintento);

      if (resultado.enCola) {
        mostrarAviso(
          'Guardado en cola',
          'El cambio se guardó en cola y se sincronizará automáticamente cuando vuelva la conexión.'
        );
        setModalCategoriaVisible(false);
      } else if (resultado.exito) {
        setModalCategoriaVisible(false);
      } else {
        mostrarAviso('No se pudo completar', resultado.error ?? 'Ocurrió un error al guardar la categoría.');
      }
    } catch {
      mostrarAviso('No se pudo completar', 'Ocurrió un error inesperado al guardar la categoría.');
    } finally {
      setGuardandoCategoria(false);
      setMensajeReintento(null);
    }
  };

  const handleEliminarCategoria = (cat: Categoria) => {
    confirmarAccion({
      titulo: 'Eliminar categoría',
      mensaje: `¿Estás seguro de que deseas eliminar la categoría "${cat.nombre_categoria}"?`,
      textoConfirmar: 'Eliminar',
      destructivo: true,
      alConfirmar: async () => {
        try {
          const resultado = await eliminarCategoria(cat.id_categoria, (n, max) =>
            setMensajeReintento(`Eliminando categoría (intento ${n} de ${max})...`)
          );
          if (resultado.enCola) {
            mostrarAviso(
              'Guardado en cola',
              'El cambio se guardó en cola y se sincronizará automáticamente cuando vuelva la conexión.'
            );
          } else if (!resultado.exito) {
            mostrarAviso('No se pudo completar', resultado.error ?? 'No se pudo eliminar la categoría.');
          }
        } catch {
          mostrarAviso('No se pudo completar', 'Ocurrió un error inesperado al eliminar la categoría.');
        } finally {
          setMensajeReintento(null);
        }
      },
    });
  };

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
          <Text
            style={[estilos.descripcionProducto, { color: colores.text_muted }]}
            numberOfLines={1}
          >
            {item.descripcion || 'Sin descripción'}
          </Text>
          <Text style={[estilos.precioProducto, { color: colores.text }]}>
            ${item.precio}
          </Text>
        </View>
      </View>

      {/* Botones de acción y Switch */}
      <View style={estilos.accionesProducto}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(admin)/new-product',
              params: { id: item.id_producto },
            } as any)
          }
          style={[estilos.botonAccion, { backgroundColor: colores.primary_soft }]}
          accessibilityLabel="Editar producto"
        >
          <Ionicons name="create-outline" size={19} color={colores.primary_strong} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleEliminarProducto(item)}
          style={[estilos.botonAccion, { backgroundColor: colores.danger_soft }]}
          accessibilityLabel="Eliminar producto"
        >
          <Ionicons name="trash-outline" size={19} color={colores.danger} />
        </TouchableOpacity>

        <View style={estilos.switchContenedor}>
          <Switch
            value={item.estado}
            onValueChange={(nuevoValor) => void handleCambiarEstado(item.id_producto, nuevoValor)}
            trackColor={{ false: colores.border_strong, true: colores.primary }}
            thumbColor={Platform.OS === 'ios' ? undefined : colores.surface}
          />
        </View>
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
        {/* Banner de reintentos activos */}
        {mensajeReintento ? (
          <View style={[estilos.bannerReintento, { backgroundColor: colores.primary_soft, borderColor: colores.primary }]}>
            <ActivityIndicator size="small" color={colores.primary} style={estilos.iconoReintento} />
            <Text style={[tipografia.detalle, { color: colores.text_secondary, flex: 1 }]}>
              {mensajeReintento}
            </Text>
          </View>
        ) : null}

        {/* Banner de cola offline */}
        {pendientesSincronizar > 0 && (
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
            <Text style={[tipografia.detalle, { color: colores.warning, flex: 1, fontWeight: '600' }]}>
              {pendientesSincronizar} cambio(s) en cola esperando conexión al servidor
            </Text>
            <TouchableOpacity
              disabled={sincronizandoCola}
              onPress={handleSincronizarCola}
              style={[estilos.botonReintentarCola, { backgroundColor: colores.warning }]}
            >
              {sincronizandoCola ? (
                <ActivityIndicator size="small" color={colores.on_warning} />
              ) : (
                <Text style={[tipografia.detalle, { color: colores.on_warning, fontWeight: '700' }]}>
                  Reintentar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

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
            <Text style={[tipografia.cuerpo, { color: colores.text_secondary, marginBottom: espaciado.xs }]}>
              Categorías activas en el menú de la cafetería:
            </Text>

            <FlatList
              data={categorias}
              keyExtractor={(cat) => cat.id_categoria}
              contentContainerStyle={estilos.listaCategorias}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: cat, index }: { item: Categoria; index: number }) => (
                <View
                  style={[
                    estilos.tarjetaCategoria,
                    { backgroundColor: colores.surface, borderColor: colores.text },
                  ]}
                >
                  <View style={estilos.infoCategoria}>
                    <Text style={[tipografia.cuerpo_fuerte, { color: colores.text }]}>
                      {index + 1}. {cat.nombre_categoria}
                    </Text>
                    <View style={[estilos.chipActivo, { backgroundColor: colores.primary }]}>
                      <Text style={[estilos.textoChipActivo, { color: colores.on_primary }]}>Activa</Text>
                    </View>
                  </View>

                  <View style={estilos.accionesCategoria}>
                    <TouchableOpacity
                      onPress={() => abrirModalEditarCategoria(cat)}
                      style={[estilos.botonAccion, { backgroundColor: colores.primary_soft }]}
                      accessibilityLabel="Editar categoría"
                    >
                      <Ionicons name="create-outline" size={19} color={colores.primary_strong} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleEliminarCategoria(cat)}
                      style={[estilos.botonAccion, { backgroundColor: colores.danger_soft }]}
                      accessibilityLabel="Eliminar categoría"
                    >
                      <Ionicons name="trash-outline" size={19} color={colores.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={estilos.vacioContenedor}>
                  <Text style={[tipografia.cuerpo, { color: colores.text_muted }]}>
                    No hay categorías registradas
                  </Text>
                </View>
              }
            />

            {/* Botón Agregar categoría */}
            <View style={estilos.pieBoton}>
              <CustomButton
                titulo="Agregar categoría"
                variante="primary"
                onPress={abrirModalCrearCategoria}
                estilo={estilos.botonAgregar}
              />
            </View>
          </View>
        )}
      </View>

      {/* Modal para Agregar / Editar categoría */}
      <Modal
        visible={modalCategoriaVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!guardandoCategoria) setModalCategoriaVisible(false);
        }}
      >
        <TouchableOpacity
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
          activeOpacity={1}
          onPress={() => {
            if (!guardandoCategoria) setModalCategoriaVisible(false);
          }}
        >
          <View
            style={[estilos.modalContenido, { backgroundColor: colores.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[tipografia.titulo, { color: colores.text, marginBottom: espaciado.md }]}>
              {categoriaEnEdicion ? 'Editar categoría' : 'Nueva categoría'}
            </Text>

            <TextInput
              value={nombreCategoriaInput}
              onChangeText={setNombreCategoriaInput}
              placeholder="Ej. Cafés de especialidad"
              placeholderTextColor={colores.text_muted}
              autoFocus
              style={[
                estilos.inputBorde,
                {
                  backgroundColor: colores.surface,
                  borderColor: colores.text,
                  color: colores.text,
                  marginBottom: espaciado.lg,
                },
              ]}
            />

            <View style={estilos.modalBotonesFila}>
              <TouchableOpacity
                onPress={() => setModalCategoriaVisible(false)}
                disabled={guardandoCategoria}
                style={[estilos.botonModal, { borderColor: colores.border_strong, borderWidth: 1 }]}
              >
                <Text style={[tipografia.cuerpo_fuerte, { color: colores.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleGuardarCategoria}
                disabled={guardandoCategoria}
                style={[estilos.botonModal, { backgroundColor: colores.primary }]}
              >
                {guardandoCategoria ? (
                  <ActivityIndicator size="small" color={colores.on_primary} />
                ) : (
                  <Text style={[tipografia.cuerpo_fuerte, { color: colores.on_primary }]}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
  bannerReintento: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs,
    borderRadius: radios.md,
    borderWidth: 1,
    marginBottom: espaciado.xs,
  },
  iconoReintento: {
    marginRight: espaciado.xs,
  },
  bannerCola: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs,
    borderRadius: radios.md,
    borderWidth: 1,
    marginBottom: espaciado.xs,
  },
  iconoCola: {
    marginRight: espaciado.xs,
  },
  botonReintentarCola: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radios.sm,
    marginLeft: espaciado.xs,
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
    flex: 1,
    marginRight: espaciado.xs,
  },
  precioProducto: {
    fontFamily: fuentes.bold,
    fontSize: 16,
  },
  accionesProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botonAccion: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchContenedor: {
    marginLeft: 2,
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
    flex: 1,
    marginTop: espaciado.md,
  },
  listaCategorias: {
    paddingBottom: 80,
    gap: espaciado.md,
    marginTop: espaciado.xs,
  },
  tarjetaCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1.5,
  },
  infoCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: espaciado.sm,
  },
  accionesCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
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
    elevation: 5,
  },
  inputBorde: {
    borderWidth: 1.5,
    borderRadius: radios.lg,
    minHeight: 48,
    paddingHorizontal: espaciado.md,
    fontSize: 16,
  },
  modalBotonesFila: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: espaciado.sm,
  },
  botonModal: {
    minWidth: 90,
    height: 44,
    borderRadius: radios.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
  },
});
