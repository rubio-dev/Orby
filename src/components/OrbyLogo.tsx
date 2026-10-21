import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Ellipse, Circle, G } from 'react-native-svg';
import { fuentes } from '@/theme';

type OrbyLogoProps = {
  size?: number;
  showText?: boolean;
  textColor?: string;
};

export function OrbyLogo({ size = 180, showText = true, textColor = '#3E2312' }: OrbyLogoProps) {
  const iconHeight = size;
  const iconWidth = size * 1.05;

  return (
    <View style={estilos.contenedor}>
      <Svg width={iconWidth} height={iconHeight} viewBox="0 0 200 190" fill="none">
        {/* Destellos / Estrellas superiores */}
        {/* Estrella izquierda lima */}
        <Path
          d="M96 22C96 16 93 13 88 13C93 13 96 10 96 4C96 10 99 13 104 13C99 13 96 16 96 22Z"
          fill="#A4D867"
        />
        {/* Estrella derecha turquesa */}
        <Path
          d="M124 23C124 15 120 11 114 11C120 11 124 7 124 0C124 7 128 11 134 11C128 11 124 15 124 23Z"
          fill="#44B99D"
        />
        {/* Destello pequeño */}
        <Circle cx="110" cy="27" r="3" fill="#388D79" />

        {/* Parte posterior del anillo orbital */}
        <G transform="rotate(-18 100 95)">
          <Path
            d="M 12 95 A 88 32 0 0 1 188 95"
            stroke="#4ABFA5"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </G>

        {/* Taza de café */}
        {/* Asa de la taza */}
        <Path
          d="M 145 68 C 168 70 168 104 140 108"
          stroke="#4A2612"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cuerpo de la taza */}
        <Path
          d="M 52 64 C 55 106 72 135 100 135 C 128 135 145 106 148 64 Z"
          fill="#FFFFFF"
          stroke="#4A2612"
          strokeWidth="7"
          strokeLinejoin="round"
        />

        {/* Borde superior y líquido de café */}
        <Ellipse cx="100" cy="64" rx="48" ry="17" fill="#FFFFFF" stroke="#4A2612" strokeWidth="7" />
        <Ellipse cx="100" cy="64" rx="38" ry="11" fill="#4A2612" />
        {/* Brillo en el café */}
        <Path
          d="M 78 61 C 84 57 104 57 116 60"
          stroke="#8A512D"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Parte frontal del anillo orbital que cruza la taza */}
        <G transform="rotate(-18 100 95)">
          <Path
            d="M 188 95 A 88 32 0 0 1 12 95"
            stroke="#4ABFA5"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Planeta / Esfera en el anillo */}
          <Circle cx="32" cy="98" r="8" fill="#52C4AA" stroke="#3A9F88" strokeWidth="2.5" />
        </G>
      </Svg>

      {showText && (
        <Text style={[estilos.textoLogo, { color: textColor }]}>
          Orby
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLogo: {
    fontFamily: fuentes.bold,
    fontSize: 54,
    lineHeight: 60,
    letterSpacing: -1,
    marginTop: -8,
  },
});

