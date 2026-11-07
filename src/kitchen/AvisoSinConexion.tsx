import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useKitchen } from '@/context/kitchen-context';
import { espaciado, radios, tipografia, useTema } from '@/theme';

// AVISO DE CONEXIÓN DE COCINA
// Franja sencilla para las pantallas de cocina. Vive aquí y no en src/components/ porque
// esa carpeta es compartida y esto solo lo usa cocina; Emilio puede moverlo al integrar.
//
// Tiene dos estados, y no ocupa espacio cuando todo está al día:
//   - Sin conexión (ámbar, warning): avisa que los cambios se guardan en el teléfono.
//   - Con conexión pero con cambios por enviar (informativo, info): se están enviando ahora.
// Usa los mismos colores que el "aviso de cocina" del diseño (warning_soft / warning_border),
// para no inventar un estilo nuevo encima del diseño de Abigail.

function textoCambios(cantidad: number) {
  return cantidad === 1 ? '1 cambio pendiente de enviar' : `${cantidad} cambios pendientes de enviar`;
}

export function AvisoSinConexion() {
  const { colores } = useTema();
  const { sinConexion, cambiosPendientes } = useKitchen();

  if (!sinConexion && cambiosPendientes === 0) return null;

  const fondo = sinConexion ? colores.warning_soft : colores.info_soft;
  const borde = sinConexion ? colores.warning_border : colores.info_border;
  const color = sinConexion ? colores.warning : colores.info;

  const titulo = sinConexion ? 'Sin conexión' : 'Enviando cambios…';
  const detalle = sinConexion
    ? cambiosPendientes > 0
      ? `${textoCambios(cambiosPendientes)}. Se envían solos al volver la conexión.`
      : 'Puede que la lista no esté al día. Desliza hacia abajo para reintentar.'
    : textoCambios(cambiosPendientes);

  return (
    <View
      // Lectores de pantalla: se anuncia cuando aparece o cambia el texto
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[estilos.franja, { backgroundColor: fondo, borderColor: borde }]}
    >
      <Ionicons
        name={sinConexion ? 'cloud-offline-outline' : 'cloud-upload-outline'}
        size={20}
        color={color}
      />
      <View style={estilos.textos}>
        <Text style={[tipografia.cuerpo_fuerte, { color }]}>{titulo}</Text>
        <Text style={[tipografia.detalle, { color }]}>{detalle}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  franja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
    marginHorizontal: espaciado.pantalla,
    marginBottom: espaciado.sm,
    borderWidth: 1,
    borderRadius: radios.lg,
  },
  textos: {
    flex: 1,
  },
});
