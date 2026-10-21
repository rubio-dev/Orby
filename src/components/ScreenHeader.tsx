import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { espaciado, fuentes, tipografia, useTema } from '@/theme';

type ScreenHeaderProps = {
  titulo: string;
  onBack?: () => void;
  derecha?: ReactNode;
  mostrarAtras?: boolean;
};

export function ScreenHeader({
  titulo,
  onBack,
  derecha,
  mostrarAtras = true,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colores } = useTema();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={estilos.contenedor}>
      {mostrarAtras ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={estilos.botonAtras}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={28} color={colores.text} />
        </TouchableOpacity>
      ) : (
        <View style={estilos.espaciador} />
      )}

      <Text style={[tipografia.titulo, estilos.titulo, { color: colores.text }]}>
        {titulo}
      </Text>

      {derecha ? (
        <View style={estilos.derecha}>{derecha}</View>
      ) : (
        <View style={estilos.espaciador} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.pantalla,
    marginBottom: espaciado.sm,
  },
  botonAtras: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    flex: 1,
  },
  derecha: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  espaciador: {
    width: 44,
  },
});

