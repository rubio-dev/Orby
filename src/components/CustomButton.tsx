import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { espaciado, fuentes, tipografia, useTema } from '@/theme';

type CustomButtonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primary' | 'dark' | 'outline' | 'secondary' | 'danger';
  cargando?: boolean;
  deshabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
  estiloTexto?: StyleProp<TextStyle>;
  iconoIzquierda?: React.ReactNode;
};

export function CustomButton({
  titulo,
  onPress,
  variante = 'primary',
  cargando = false,
  deshabilitado = false,
  estilo,
  estiloTexto,
  iconoIzquierda,
}: CustomButtonProps) {
  const { colores } = useTema();

  let backgroundColor = colores.primary;
  let textColor = '#FFFFFF';
  let borderWidth = 0;
  let borderColor = 'transparent';

  if (variante === 'dark') {
    backgroundColor = '#101413';
    textColor = '#FFFFFF';
  } else if (variante === 'primary') {
    backgroundColor = '#388D7A';
    textColor = '#FFFFFF';
  } else if (variante === 'secondary') {
    backgroundColor = colores.primary_soft;
    textColor = colores.primary_strong;
  } else if (variante === 'outline') {
    backgroundColor = 'transparent';
    borderWidth = 1.5;
    borderColor = '#1A1D1C';
    textColor = '#1A1D1C';
  } else if (variante === 'danger') {
    backgroundColor = colores.danger;
    textColor = '#FFFFFF';
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={deshabilitado || cargando}
      style={[
        estilos.boton,
        {
          backgroundColor,
          borderWidth,
          borderColor,
          opacity: deshabilitado ? 0.6 : 1,
        },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {iconoIzquierda}
          <Text
            style={[
              tipografia.boton,
              estilos.texto,
              { color: textColor },
              iconoIzquierda ? { marginLeft: espaciado.sm } : null,
              estiloTexto,
            ]}
          >
            {titulo}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  boton: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.lg,
    marginVertical: espaciado.xs,
  },
  texto: {
    fontFamily: fuentes.bold,
    fontSize: 18,
    lineHeight: 22,
  },
});

