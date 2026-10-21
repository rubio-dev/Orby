import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components/CustomButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, useTema } from '@/theme';
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)

export default function MeseroOrderSummaryScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const {
    carrito,
    mesaSeleccionada,
    actualizarEspecificaciones,
    quitarDelCarrito,
    enviarComandaACocina,
  } = useOrders();

  const [cargando, setCargando] = useState(false);

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const handleEnviarCocina = async () => {
    if (carrito.length === 0) {
      mostrarAviso('Sin productos', 'El pedido no contiene productos.');
      return;
    }

    setCargando(true);
    const resultado = await enviarComandaACocina();
    setCargando(false);

    if (resultado.exito) {
      mostrarAviso(
        '¡Comanda enviada!',
        `El pedido de la Mesa ${mesaSeleccionada} por un total de $${total} fue enviado exitosamente a la cocina.`,
        [
          {
            text: 'Ver mesas',
            onPress: () => router.replace('/(mesero)/tables'),
          },
        ]
      );
    } else {
      mostrarAviso('Error', resultado.error ?? 'No se pudo enviar la comanda.');
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo={`Mesa ${mesaSeleccionada}`}
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
          {carrito.map((item) => (
            <View
              key={item.id_producto}
              style={[estilos.tarjetaItem, { backgroundColor: colores.surface }]}
            >
              <View style={estilos.filaSuperior}>
                {/* Imagen del platillo */}
                <View style={estilos.imagenContenedor}>
                  {item.imagen_url ? (
                    <Image
                      source={{ uri: item.imagen_url }}
                      style={estilos.imagen}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[estilos.imagenFallback, { backgroundColor: '#E2ECE8' }]}>
                      <Ionicons name="restaurant-outline" size={26} color={colores.primary_strong} />
                    </View>
                  )}
                </View>

                {/* Nombre y precio */}
                <View style={estilos.info}>
                  <View style={estilos.filaNombrePrecio}>
                    <Text style={[estilos.nombre, { color: colores.text }]}>
                      {item.nombre_producto}
                    </Text>
                    <Text style={[estilos.precio, { color: colores.text }]}>
                      ${item.precio * item.cantidad}
                    </Text>
                  </View>
                  <Text style={[estilos.subtexto, { color: colores.text_muted }]}>
                    Descripción
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => quitarDelCarrito(item.id_producto)}
                  style={estilos.botonEliminar}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color={colores.danger} />
                </TouchableOpacity>
              </View>

              {/* Especificaciones */}
              <View style={estilos.seccionEspecificaciones}>
                <Text style={[estilos.labelEspecificaciones, { color: colores.text }]}>
                  Especificaciones
                </Text>
                <TextInput
                  value={item.especificaciones}
                  onChangeText={(texto) => actualizarEspecificaciones(item.id_producto, texto)}
                  placeholder="Descripción (ej. sin cebolla, salsa aparte)"
                  placeholderTextColor="#8C9794"
                  style={estilos.inputEspecificaciones}
                />
              </View>
            </View>
          ))}

          {/* Línea divisoria y total */}
          <View style={estilos.seccionTotal}>
            <View style={estilos.filaTotal}>
              <Text style={estilos.textoTotal}>Total</Text>
              <Text style={estilos.montoTotal}>${total}</Text>
            </View>

            {/* Botón Enviar a cocina */}
            <CustomButton
              titulo="Enviar a cocina"
              variante="primary"
              cargando={cargando}
              onPress={handleEnviarCocina}
              estilo={estilos.botonEnviar}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  tarjetaItem: {
    borderWidth: 1.5,
    borderColor: '#1A1D1C',
    borderRadius: radios.xxl,
    padding: espaciado.md,
  },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagenContenedor: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  },
  filaNombrePrecio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombre: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    lineHeight: 22,
    flex: 1,
    paddingRight: 6,
  },
  precio: {
    fontFamily: fuentes.bold,
    fontSize: 18,
  },
  subtexto: {
    fontSize: 13,
    marginTop: 2,
  },
  botonEliminar: {
    paddingLeft: espaciado.xs,
  },
  seccionEspecificaciones: {
    marginTop: espaciado.sm,
    paddingTop: espaciado.xs,
    borderTopWidth: 1,
    borderTopColor: '#E6EAE8',
  },
  labelEspecificaciones: {
    fontFamily: fuentes.bold,
    fontSize: 14,
    marginBottom: 2,
  },
  inputEspecificaciones: {
    fontSize: 14,
    color: '#1A1D1C',
    paddingVertical: 4,
  },
  seccionTotal: {
    marginTop: espaciado.xl,
    paddingTop: espaciado.md,
    borderTopWidth: 2,
    borderTopColor: '#1A1D1C',
  },
  filaTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espaciado.lg,
  },
  textoTotal: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    color: '#1A1D1C',
  },
  montoTotal: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    color: '#1A1D1C',
  },
  botonEnviar: {
    height: 54,
    borderRadius: 27,
  },
});

