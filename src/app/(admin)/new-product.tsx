import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';

export default function AdminNewProductScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { categorias, agregarProducto } = useCatalog();

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(categorias[0]?.id_categoria ?? 'cat-1');
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState(true);
  const [cargando, setCargando] = useState(false);

  const categoriaObj = categorias.find((c) => c.id_categoria === categoriaSeleccionada) ?? categorias[0];

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del producto.');
      return;
    }

    const precioNumero = parseFloat(precio.replace(/[^0-9.]/g, ''));
    if (isNaN(precioNumero) || precioNumero < 0) {
      Alert.alert('Precio inválido', 'Por favor ingresa un precio numérico válido.');
      return;
    }

    setCargando(true);
    try {
      await agregarProducto({
        id_categoria: categoriaSeleccionada,
        nombre_categoria: categoriaObj?.nombre_categoria,
        nombre_producto: nombre.trim(),
        descripcion: descripcion.trim(),
        precio: precioNumero,
        estado,
        imagen_url: null,
      });

      Alert.alert('Éxito', 'Producto guardado correctamente en el catálogo.', [
        {
          text: 'Aceptar',
          onPress: () => router.back(),
        },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el producto. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarImagen = () => {
    Alert.alert(
      'Subir imagen',
      'Aquí puedes seleccionar una foto de tu galería o cámara para el producto.',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Agregar producto"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Caja para subir imagen */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSeleccionarImagen}
            style={[estilos.cajaImagen, { backgroundColor: colores.surface, borderColor: colores.text }]}
          >
            <Ionicons name="add" size={44} color={colores.text_muted} />
            <Text style={[estilos.textoAgregarImagen, { color: colores.text_muted }]}>
              Agregar imagen
            </Text>
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
              style={[estilos.inputBorde, { backgroundColor: colores.surface, borderColor: colores.text, color: colores.text }]}
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
              style={[estilos.inputBorde, { backgroundColor: colores.surface, borderColor: colores.text, color: colores.text }]}
            />
          </View>

          {/* Campo: Categoría (dropdown selector) */}
          <View style={estilos.grupoCampo}>
            <Text style={[estilos.label, { color: colores.text }]}>
              Categoria: <Text style={{ color: colores.danger }}>*</Text>
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setModalCategoriaAbierto(true)}
              style={[estilos.inputBorde, estilos.selectorDropdown, { backgroundColor: colores.surface, borderColor: colores.text }]}
            >
              <Text style={{ fontSize: 16, color: colores.text }}>
                {categoriaObj ? `Ej. ${categoriaObj.nombre_categoria}` : 'Seleccionar categoría'}
              </Text>
              <Ionicons name="chevron-down" size={22} color={colores.text} />
            </TouchableOpacity>
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
              style={[estilos.inputBorde, estilos.textArea, { backgroundColor: colores.surface, borderColor: colores.text, color: colores.text }]}
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

          {/* Botón Guardar producto */}
          <View style={estilos.seccionBoton}>
            <CustomButton
              titulo="Guardar producto"
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
          <View style={[estilos.modalContenido, { backgroundColor: colores.surface }]}>
            <Text style={[tipografia.titulo, { color: colores.text, marginBottom: espaciado.md }]}>
              Selecciona una categoría
            </Text>
            {categorias.map((cat) => (
              <TouchableOpacity
                key={cat.id_categoria}
                style={[
                  estilos.opcionCategoria,
                  cat.id_categoria === categoriaSeleccionada
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
                      fontWeight: cat.id_categoria === categoriaSeleccionada ? '700' : '400',
                      color: colores.text,
                    },
                  ]}
                >
                  {cat.nombre_categoria}
                </Text>
                {cat.id_categoria === categoriaSeleccionada && (
                  <Ionicons name="checkmark" size={20} color={colores.primary} />
                )}
              </TouchableOpacity>
            ))}
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
  cajaImagen: {
    height: 140,
    borderWidth: 1.5,
    borderRadius: radios.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: espaciado.md,
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
    maxWidth: 320,
    borderRadius: radios.xl,
    padding: espaciado.lg,
    elevation: 5,
  },
  opcionCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.sm,
    borderRadius: radios.sm,
  },
});

