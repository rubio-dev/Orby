import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { espaciado, fuentes, tipografia, useTema } from '@/theme';

type UserHeaderProps = {
  nombre: string;
  rol: string;
  tamanoAvatar?: number;
};

export function UserHeader({ nombre, rol, tamanoAvatar = 100 }: UserHeaderProps) {
  const { colores } = useTema();

  return (
    <View style={estilos.contenedor}>
      {/* Círculo de Avatar */}
      <View
        style={[
          estilos.avatarContainer,
          {
            width: tamanoAvatar,
            height: tamanoAvatar,
            borderRadius: tamanoAvatar / 2,
            backgroundColor: '#2F5245',
          },
        ]}
      >
        <Ionicons name="person" size={tamanoAvatar * 0.65} color="#8DA99E" style={estilos.iconoAvatar} />
      </View>

      {/* Saludo y Nombre */}
      <Text style={[tipografia.titulo, estilos.saludo, { color: colores.text }]}>
        Hola, {nombre}
      </Text>

      {/* Rol */}
      <Text style={[tipografia.cuerpo, estilos.rol, { color: colores.text_muted }]}>
        {rol}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: espaciado.md,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: espaciado.md,
  },
  iconoAvatar: {
    marginBottom: -4,
  },
  saludo: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  rol: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 2,
  },
});

