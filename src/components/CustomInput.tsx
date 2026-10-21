import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';

import { espaciado, radios, tipografia, useTema } from '@/theme';

type CustomInputProps = TextInputProps & {
  label?: string;
  obligatorio?: boolean;
  esContrasena?: boolean;
  variante?: 'relleno' | 'borde';
  error?: string;
  iconoDerecha?: keyof typeof Ionicons.glyphMap;
  onPressIconoDerecha?: () => void;
};

export function CustomInput({
  label,
  obligatorio = false,
  esContrasena = false,
  variante = 'relleno',
  error,
  iconoDerecha,
  onPressIconoDerecha,
  style,
  onFocus,
  onBlur,
  ...props
}: CustomInputProps) {
  const { colores } = useTema();
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  // Si el campo está seleccionado (escribiendo); se usa para pintar el borde verde
  const [enfocado, setEnfocado] = useState(false);

  const esCampoSeguro = esContrasena && !mostrarContrasena;

  return (
    <View style={estilos.contenedor}>
      {label && (
        <Text style={[tipografia.etiqueta, estilos.label, { color: colores.text }]}>
          {label}
          {obligatorio && <Text style={{ color: colores.danger }}> *</Text>}
        </Text>
      )}

      <View
        style={[
          estilos.campoContenedor,
          variante === 'relleno'
            ? {
                backgroundColor: '#DFE5E2',
                borderRadius: radios.lg,
                borderWidth: 1.5, // Borde invisible: así el campo no "brinca" al aparecer el borde verde
                borderColor: 'transparent',
              }
            : {
                backgroundColor: colores.surface,
                borderColor: '#1A1D1C',
                borderWidth: 1.5,
                borderRadius: radios.lg,
              },
          // Al escribir: borde verde suave en lugar del recuadro negro del navegador
          enfocado ? { borderColor: colores.primary, borderWidth: 1.5 } : null,
          error ? { borderColor: colores.danger, borderWidth: 1.5 } : null,
        ]}
      >
        <TextInput
          placeholderTextColor="#7E8582"
          secureTextEntry={esCampoSeguro}
          style={[
            estilos.input,
            { color: colores.text },
            // En el navegador se quita el recuadro negro que aparece al escribir
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            esContrasena || iconoDerecha ? { paddingRight: 40 } : null,
            style,
          ]}
          {...props}
          onFocus={(evento) => {
            setEnfocado(true);
            onFocus?.(evento); // Respeta el onFocus que mande la pantalla, si existe
          }}
          onBlur={(evento) => {
            setEnfocado(false);
            onBlur?.(evento);
          }}
        />

        {esContrasena && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={estilos.iconoAccion}
            onPress={() => setMostrarContrasena(!mostrarContrasena)}
          >
            <Ionicons
              name={mostrarContrasena ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color="#1A1D1C"
            />
          </TouchableOpacity>
        )}

        {!esContrasena && iconoDerecha && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={estilos.iconoAccion}
            onPress={onPressIconoDerecha}
            disabled={!onPressIconoDerecha}
          >
            <Ionicons name={iconoDerecha} size={22} color="#1A1D1C" />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[tipografia.micro, { color: colores.danger, marginTop: espaciado.xxs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    width: '100%',
    marginBottom: espaciado.md,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: espaciado.xs,
  },
  campoContenedor: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.md,
    position: 'relative',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingVertical: espaciado.sm,
  },
  iconoAccion: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

