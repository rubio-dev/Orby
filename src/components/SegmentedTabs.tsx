import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { espaciado, radios, tipografia } from '@/theme';

type OpcionTab<T extends string> = {
  id: T;
  etiqueta: string;
};

type SegmentedTabsProps<T extends string> = {
  opciones: OpcionTab<T>[];
  seleccionada: T;
  alSeleccionar: (id: T) => void;
  tipo?: 'pills' | 'tabs';
};

export function SegmentedTabs<T extends string>({
  opciones,
  seleccionada,
  alSeleccionar,
  tipo = 'pills',
}: SegmentedTabsProps<T>) {
  return (
    <View style={estilos.contenedor}>
      {opciones.map((opcion) => {
        const estaActiva = seleccionada === opcion.id;

        return (
          <TouchableOpacity
            key={opcion.id}
            activeOpacity={0.8}
            onPress={() => alSeleccionar(opcion.id)}
            style={[
              estilos.boton,
              tipo === 'tabs' ? estilos.tabGrande : estilos.pill,
              {
                backgroundColor: estaActiva ? '#419582' : '#C7DFD7',
              },
            ]}
          >
            <Text
              style={[
                tipografia.boton,
                estilos.texto,
                {
                  color: estaActiva ? '#FFFFFF' : '#2D4E45',
                  fontWeight: estaActiva ? '700' : '600',
                },
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginVertical: espaciado.sm,
  },
  boton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: radios.pastilla,
    paddingHorizontal: espaciado.md,
  },
  tabGrande: {
    flex: 1,
    height: 44,
    borderRadius: radios.pastilla,
    paddingHorizontal: espaciado.md,
  },
  texto: {
    fontSize: 16,
    textAlign: 'center',
  },
});
