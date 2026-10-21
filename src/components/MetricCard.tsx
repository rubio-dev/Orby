import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { espaciado, radios, tipografia, useTema } from '@/theme';

type MetricCardProps = {
  titulo: string;
  valor: string | number;
  cambioPorcentual?: number;
  sufijo?: string;
  anchoFijo?: boolean;
};

export function MetricCard({
  titulo,
  valor,
  cambioPorcentual,
  sufijo,
  anchoFijo = false,
}: MetricCardProps) {
  const { colores } = useTema();

  return (
    <View
      style={[
        estilos.tarjeta,
        {
          backgroundColor: colores.surface,
          borderColor: '#1A1D1C',
        },
        anchoFijo && estilos.tarjetaAnchoFijo,
      ]}
    >
      <Text style={[tipografia.etiqueta, estilos.titulo, { color: colores.text_secondary }]}>
        {titulo}
      </Text>

      <Text style={[tipografia.cifra, estilos.valor, { color: colores.text }]}>
        {valor}
        {sufijo && <Text style={[tipografia.cuerpo, { color: colores.text }]}> {sufijo}</Text>}
      </Text>

      {cambioPorcentual !== undefined && (
        <View style={estilos.filaCambio}>
          <Ionicons
            name={cambioPorcentual >= 0 ? 'arrow-up' : 'arrow-down'}
            size={14}
            color={cambioPorcentual >= 0 ? '#10B981' : colores.danger}
          />
          <Text
            style={[
              tipografia.etiqueta,
              {
                color: cambioPorcentual >= 0 ? '#10B981' : colores.danger,
                fontWeight: '600',
              },
            ]}
          >
            {' '}{Math.abs(cambioPorcentual)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flex: 1,
    minHeight: 120,
    borderWidth: 1.5,
    borderRadius: radios.xxl,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaAnchoFijo: {
    flex: undefined,
    width: '31%',
  },
  titulo: {
    textAlign: 'center',
    marginBottom: espaciado.xs,
  },
  valor: {
    textAlign: 'center',
    fontWeight: '700',
    marginVertical: espaciado.xxs,
  },
  filaCambio: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: espaciado.xxs,
  },
});

