import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components/CustomButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCatalog } from '@/context/catalog-context';
import { mostrarAviso } from '@/lib/confirm';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';

const MINIATURAS_SUGERIDAS = [
  {
    etiqueta: 'Espresso',
    url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=80',
  },
  {
    etiqueta: 'Capuchino',
    url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80',
  },
  {
    etiqueta: 'Postre',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80',
  },
  {
    etiqueta: 'Bebida Fría',
    url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&q=80',
  },
];

export default function AdminNewProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const esEdicion = Boolean(id);

  const { colores } = useTema();
  const { productos, categorias, agregarProducto, editarProducto } = useCatalog();

  const productoExistente = id ? productos.find((p) => p.id_producto === id) : undefined;

  const [nombre, setNombre] = useState(productoExistente?.nombre_producto ?? '');
  const [precio, setPrecio] = useState(productoExistente ? String(productoExistente.precio) : '');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(
    productoExistente?.id_categoria ?? ''
  );
  const [descripcion, setDescripcion] = useState(productoExistente?.descripcion ?? '');
  const [estado, setEstado] = useState(productoExistente?.estado ?? true);
  const [imagenUrl, setImagenUrl] = useState(productoExistente?.imagen_url ?? '');

  // Sincronizar estado cuando el producto se encuentra tras la carga
  const [prevIdSincronizado, setPrevIdSincronizado] = useState(productoExistente?.id_producto);
  if (productoExistente && productoExistente.id_producto !== prevIdSincronizado) {
    setPrevIdSincronizado(productoExistente.id_producto);
    setNombre(productoExistente.nombre_producto);
    setPrecio(String(productoExistente.precio));
    setCategoriaSeleccionada(productoExistente.id_categoria);
    setDescripcion(productoExistente.descripcion);
    setEstado(productoExistente.estado);
    setImagenUrl(productoExistente.imagen_url ?? '');
  }

  // Modal para seleccionar categoría
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);

  // Modal para configurar imagen
  const [modalImagenAbierto, setModalImagenAbierto] = useState(false);
  const [inputUrlImagen, setInputUrlImagen] = useState('');

  // Reintentos y estado de guardado
  const [cargando, setCargando] = useState(false);
  const [mensajeReintento, setMensajeReintento] = useState<string | null>(null);

  // Determinar la categoría activa válida
  const categoriaIdValida =
    categoriaSeleccionada && categorias.some((c) => c.id_categoria === categoriaSeleccionada)
      ? categoriaSeleccionada
      : (categorias[0]?.id_categoria ?? '');

  const categoriaObj =
    categorias.find((c) => c.id_categoria === categoriaIdValida) ?? categorias[0];

  const handleAbrirModalImagen = () => {
    setInputUrlImagen(imagenUrl.startsWith('data:') ? '' : imagenUrl);
    setModalImagenAbierto(true);
  };

  const handleElegirDeGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      mostrarAviso(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para seleccionar una foto del producto.'
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
      const asset = resultado.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const uri = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;
      setImagenUrl(uri);
      setInputUrlImagen('');
      setModalImagenAbierto(false);
    }
  };

  const handleTomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      mostrarAviso(
        'Permiso requerido',
        'Necesitamos acceso a tu cámara para tomar una foto del producto.'
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
      const asset = resultado.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const uri = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;
      setImagenUrl(uri);
      setInputUrlImagen('');
      setModalImagenAbierto(false);
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      mostrarAviso('Campo requerido', 'Por favor ingresa el nombre del producto.');
      return;
    }

    const precioNumero = parseFloat(precio.replace(/[^0-9.]/g, ''));
    if (isNaN(precioNumero) || precioNumero < 0) {
      mostrarAviso('Precio inválido', 'Por favor ingresa un precio numérico válido.');
      return;
    }

    const idCategoriaFinal = categoriaIdValida;
    if (!idCategoriaFinal) {
      mostrarAviso('Categoría requerida', 'Por favor selecciona una categoría válida.');
      return;
    }

    setCargando(true);
    setMensajeReintento(null);

    const datosProducto = {
      id_categoria: idCategoriaFinal,
      nombre_categoria: categoriaObj?.nombre_categoria,
      nombre_producto: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: precioNumero,
      estado,
      imagen_url: imagenUrl.trim() || null,
    };

    const callbackReintento = (intento: number, max: number) => {
      setMensajeReintento(`Reintentando conexión con el servidor (intento ${intento} de ${max})...`);
    };

    try {
      const resultado =
        esEdicion && id
          ? await editarProducto(id, datosProducto, callbackReintento)
          : await agregarProducto(datosProducto, callbackReintento);

      if (resultado.exito && resultado.enCola) {
        mostrarAviso(
          'Guardado en cola',
          'No se pudo conectar al servidor tras 3 intentos. El producto se guardó en cola en tu dispositivo y se sincronizará automáticamente cuando vuelva la conexión.',
          [{ text: 'Aceptar', onPress: () => router.back() }]
        );
      } else if (resultado.exito && !resultado.enCola) {
        mostrarAviso(
          'Éxito',
          esEdicion
            ? 'Producto actualizado correctamente.'
            : 'Producto guardado correctamente en el catálogo.',
          [{ text: 'Aceptar', onPress: () => router.back() }]
        );
      } else {
        mostrarAviso('Error', resultado.error ?? 'No se pudo guardar el producto.');
      }
    } catch {
      mostrarAviso('Error', 'No se pudo guardar el producto. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
      setMensajeReintento(null);
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo={esEdicion ? 'Editar producto' : 'Agregar producto'}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.flexUno}
      >
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Caja para subir imagen / vista previa */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAbrirModalImagen}
            style={[estilos.cajaImagen, { backgroundColor: colores.surface, borderColor: colores.text }]}
          >
            {imagenUrl.trim() ? (
              <View style={estilos.imagenPreviewContenedor}>
                <Image
                  source={{ uri: imagenUrl.trim() }}
                  style={estilos.imagenPreview}
                  contentFit="cover"
                />
                <View style={[estilos.badgeCambiarImagen, { backgroundColor: colores.surface, borderColor: colores.border }]}>
                  <Ionicons name="camera-outline" size={16} color={colores.text} />
                  <Text style={[tipografia.detalle, { color: colores.text, marginLeft: 4, fontWeight: '600' }]}>
                    Cambiar
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Ionicons name="add" size={44} color={colores.text_muted} />
                <Text style={[estilos.textoAgregarImagen, { color: colores.text_muted }]}>
                  Agregar imagen
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Campo: Nombre del producto */}
          <View style={estilos.grupoCampo}>
            <Text style={[estilos.label, { color: colores.text }]}>
              Nombre del producto: <Text style={{ color: colores.danger }}>*</Text>
            </Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Latte"
              placeholderTextColor={colores.text_muted}
              style={[
                estilos.inputBorde,
                { backgroundColor: colores.surface, borderColor: colores.text, color: colores.text },
              ]}
            />
          </View>

          {/* Campo: Precio */}
          <View style={estilos.grupoCampo}>
            <Text style={[estilos.label, { color: colores.text }]}>
              Precio: <Text style={{ color: colores.danger }}>*</Text>
            </Text>
            <TextInput
              value={precio}
              onChangeText={setPrecio}
              placeholder="Ej. $80"
              placeholderTextColor={colores.text_muted}
              keyboardType="numeric"
              style={[
                estilos.inputBorde,
                { backgroundColor: colores.surface, borderColor: colores.text, color: colores.text },
              ]}
            />
          </View>

          {/* Campo: Categoría (dropdown selector) */}
          <View style={estilos.grupoCampo}>
            <Text style={[estilos.label, { color: colores.text }]}>
              Categoría: <Text style={{ color: colores.danger }}>*</Text>
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setModalCategoriaAbierto(true)}
              style={[
                estilos.inputBorde,
                estilos.selectorDropdown,
                { backgroundColor: colores.surface, borderColor: colores.text },
              ]}
            >
              <Text style={[tipografia.cuerpo, { color: colores.text }]}>
                {categoriaObj ? categoriaObj.nombre_categoria : 'Seleccionar categoría'}
              </Text>
              <Ionicons name="chevron-down" size={22} color={colores.text} />
            </TouchableOpacity>
            {categorias.length === 0 && (
              <Text style={[tipografia.detalle, { color: colores.warning, marginTop: espaciado.xs }]}>
                No hay categorías. Créalas en Menú → Categorías antes de agregar productos.
              </Text>
            )}
          </View>

          {/* Campo: Descripción del producto */}
          <View style={estilos.grupoCampo}>
            <Text style={[estilos.label, { color: colores.text }]}>
              Descripción del producto: <Text style={{ color: colores.danger }}>*</Text>
            </Text>
            <TextInput
              value={descripcion}
              onChangeText={(text) => {
                if (text.length <= 200) {
                  setDescripcion(text);
                }
              }}
              multiline
              numberOfLines={4}
              maxLength={200}
              placeholder="Ej. bebida de café hecha con una dosis de espresso y una gran porción de leche vaporizada, coronada con una capa fina de microespuma."
              placeholderTextColor={colores.text_muted}
              style={[
                estilos.inputBorde,
                estilos.textArea,
                { backgroundColor: colores.surface, borderColor: colores.text, color: colores.text },
              ]}
            />
            <Text style={[estilos.contadorCaracteres, { color: colores.text_muted }]}>
              {descripcion.length}/200
            </Text>
          </View>

          {/* Campo: Estado */}
          <View style={estilos.grupoEstado}>
            <Text style={[estilos.label, { color: colores.text, marginBottom: 0 }]}>
              Estado: <Text style={{ color: colores.danger }}>*</Text>
            </Text>
            <Switch
              value={estado}
              onValueChange={setEstado}
              trackColor={{ false: colores.border_strong, true: colores.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : colores.surface}
            />
          </View>

          {/* Botón Guardar producto / Cambios */}
          <View style={estilos.seccionBoton}>
            {mensajeReintento ? (
              <View
                style={[
                  estilos.bannerReintento,
                  { backgroundColor: colores.primary_soft, borderColor: colores.border },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={colores.primary}
                  style={estilos.iconoReintento}
                />
                <Text style={[tipografia.detalle, { color: colores.text_secondary, flex: 1 }]}>
                  {mensajeReintento}
                </Text>
              </View>
            ) : null}

            <CustomButton
              titulo={esEdicion ? 'Guardar cambios' : 'Guardar producto'}
              variante="primary"
              cargando={cargando}
              onPress={handleGuardar}
              estilo={estilos.botonGuardar}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para selección de categoría */}
      <Modal
        visible={modalCategoriaAbierto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalCategoriaAbierto(false)}
      >
        <TouchableOpacity
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
          activeOpacity={1}
          onPress={() => setModalCategoriaAbierto(false)}
        >
          <View
            style={[estilos.modalContenido, { backgroundColor: colores.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[tipografia.titulo, { color: colores.text, marginBottom: espaciado.md }]}>
              Selecciona una categoría
            </Text>
            {categorias.map((cat) => (
              <TouchableOpacity
                key={cat.id_categoria}
                style={[
                  estilos.opcionCategoria,
                  cat.id_categoria === categoriaIdValida
                    ? { backgroundColor: colores.primary_soft }
                    : null,
                ]}
                onPress={() => {
                  setCategoriaSeleccionada(cat.id_categoria);
                  setModalCategoriaAbierto(false);
                }}
              >
                <Text
                  style={[
                    tipografia.cuerpo,
                    {
                      fontWeight: cat.id_categoria === categoriaIdValida ? '700' : '400',
                      color: colores.text,
                    },
                  ]}
                >
                  {cat.nombre_categoria}
                </Text>
                {cat.id_categoria === categoriaIdValida && (
                  <Ionicons name="checkmark" size={20} color={colores.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal para configurar imagen del producto */}
      <Modal
        visible={modalImagenAbierto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalImagenAbierto(false)}
      >
        <TouchableOpacity
          style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}
          activeOpacity={1}
          onPress={() => setModalImagenAbierto(false)}
        >
          <View
            style={[estilos.modalContenido, { backgroundColor: colores.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[tipografia.titulo, { color: colores.text, marginBottom: espaciado.md }]}>
              Imagen del producto
            </Text>

            {/* Opciones de captura o selección de fotos reales */}
            <View style={estilos.accionesImagenContenedor}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleElegirDeGaleria}
                style={[
                  estilos.botonAccionImagen,
                  {
                    backgroundColor: colores.primary_soft,
                    borderColor: colores.border_strong,
                  },
                ]}
              >
                <Ionicons name="images-outline" size={20} color={colores.primary_strong} />
                <Text style={[tipografia.cuerpo_fuerte, { color: colores.primary_strong }]}>
                  Elegir de la galería
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleTomarFoto}
                style={[
                  estilos.botonAccionImagen,
                  {
                    backgroundColor: colores.primary_soft,
                    borderColor: colores.border_strong,
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={20} color={colores.primary_strong} />
                <Text style={[tipografia.cuerpo_fuerte, { color: colores.primary_strong }]}>
                  Tomar foto con la cámara
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[tipografia.detalle, { color: colores.text_secondary, marginBottom: espaciado.xs }]}>
              O pega una URL web o elige una sugerida:
            </Text>

            <TextInput
              value={inputUrlImagen}
              onChangeText={setInputUrlImagen}
              placeholder="https://ejemplo.com/foto.jpg"
              placeholderTextColor={colores.text_muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                estilos.inputBorde,
                {
                  backgroundColor: colores.surface,
                  borderColor: colores.text,
                  color: colores.text,
                  marginBottom: espaciado.md,
                },
              ]}
            />

            <Text style={[tipografia.detalle, { color: colores.text_secondary, marginBottom: espaciado.xs, fontWeight: '600' }]}>
              Miniaturas sugeridas:
            </Text>
            <View style={estilos.miniaturasFila}>
              {MINIATURAS_SUGERIDAS.map((item) => (
                <TouchableOpacity
                  key={item.etiqueta}
                  onPress={() => setInputUrlImagen(item.url)}
                  style={[
                    estilos.chipMiniatura,
                    {
                      backgroundColor: inputUrlImagen === item.url ? colores.primary_soft : colores.surface,
                      borderColor: inputUrlImagen === item.url ? colores.primary : colores.border_strong,
                    },
                  ]}
                >
                  <Text
                    style={[
                      tipografia.detalle,
                      {
                        color: inputUrlImagen === item.url ? colores.primary_strong : colores.text,
                        fontWeight: inputUrlImagen === item.url ? '700' : '500',
                      },
                    ]}
                  >
                    {item.etiqueta}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {inputUrlImagen.length > 0 ? (
              <TouchableOpacity
                onPress={() => setInputUrlImagen('')}
                style={[estilos.botonQuitarImagen, { borderColor: colores.danger_border }]}
              >
                <Ionicons name="trash-outline" size={16} color={colores.danger} />
                <Text style={[tipografia.detalle, { color: colores.danger, marginLeft: 4, fontWeight: '600' }]}>
                  Quitar imagen
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={estilos.modalBotonesFila}>
              <TouchableOpacity
                onPress={() => setModalImagenAbierto(false)}
                style={[estilos.botonModal, { borderColor: colores.border_strong, borderWidth: 1 }]}
              >
                <Text style={[tipografia.cuerpo_fuerte, { color: colores.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setImagenUrl(inputUrlImagen.trim());
                  setModalImagenAbierto(false);
                }}
                style={[estilos.botonModal, { backgroundColor: colores.primary }]}
              >
                <Text style={[tipografia.cuerpo_fuerte, { color: colores.on_primary }]}>Aplicar</Text>
              </TouchableOpacity>
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
  flexUno: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.xxl,
  },
  cajaImagen: {
    height: 140,
    borderWidth: 1.5,
    borderRadius: radios.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: espaciado.md,
    overflow: 'hidden',
  },
  imagenPreviewContenedor: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagenPreview: {
    width: '100%',
    height: '100%',
  },
  badgeCambiarImagen: {
    position: 'absolute',
    bottom: espaciado.sm,
    right: espaciado.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.sm,
    paddingVertical: 4,
    borderRadius: radios.pastilla,
    borderWidth: 1,
  },
  textoAgregarImagen: {
    fontFamily: fuentes.bold,
    fontSize: 16,
    marginTop: 4,
  },
  grupoCampo: {
    marginBottom: espaciado.md,
  },
  label: {
    fontFamily: fuentes.bold,
    fontSize: 17,
    marginBottom: espaciado.xs,
  },
  inputBorde: {
    borderWidth: 1.5,
    borderRadius: radios.lg,
    minHeight: 48,
    paddingHorizontal: espaciado.md,
    fontSize: 16,
  },
  selectorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textArea: {
    minHeight: 90,
    paddingTop: espaciado.sm,
    paddingBottom: espaciado.sm,
    textAlignVertical: 'top',
  },
  contadorCaracteres: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
    fontFamily: fuentes.medium,
  },
  grupoEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: espaciado.sm,
  },
  seccionBoton: {
    marginTop: espaciado.lg,
  },
  bannerReintento: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs,
    borderRadius: radios.md,
    borderWidth: 1,
    marginBottom: espaciado.sm,
  },
  iconoReintento: {
    marginRight: espaciado.xs,
  },
  botonGuardar: {
    borderRadius: 26,
    height: 52,
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
  accionesImagenContenedor: {
    gap: espaciado.sm,
    marginBottom: espaciado.md,
  },
  botonAccionImagen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1,
  },
  opcionCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.sm,
    borderRadius: radios.sm,
  },
  miniaturasFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.xs,
    marginBottom: espaciado.md,
  },
  chipMiniatura: {
    paddingHorizontal: espaciado.sm,
    paddingVertical: 6,
    borderRadius: radios.pastilla,
    borderWidth: 1,
  },
  botonQuitarImagen: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: espaciado.sm,
    paddingVertical: 4,
    borderRadius: radios.sm,
    borderWidth: 1,
    marginBottom: espaciado.md,
  },
  modalBotonesFila: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: espaciado.sm,
    marginTop: espaciado.xs,
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
