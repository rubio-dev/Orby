import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useKitchen } from '@/context/kitchen-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';

// AVISO DE CONEXIÓN DE COCINA
// Franja sencilla para las pantallas de cocina. Vive aquí y no en src/components/ porque
// esa carpeta es compartida y esto solo lo usa cocina; Emilio puede moverlo al integrar.
//
// Tiene tres estados (del más grave al más leve) y no ocupa espacio cuando todo está al día:
//   - Sesión no real (rojo, danger): entró como usuario demo, por ejemplo porque el teléfono
//     autollenó una contraseña vieja. Sin sesión, RLS devuelve todo vacío sin error y la cocina
//     creería que no hay pedidos; por eso se avisa y se ofrece cerrar sesión ahí mismo.
//   - Sin conexión (ámbar, warning): los cambios se guardan en el teléfono.
//   - Con conexión pero con cambios por enviar (informativo, info): se están enviando ahora.
// El ámbar es el mismo del "aviso de cocina" del diseño (warning_soft / warning_border),
// para no inventar un estilo nuevo encima del diseño de Abigail.

function textoCambios(cantidad: number) {
  return cantidad === 1 ? '1 cambio pendiente de enviar' : `${cantidad} cambios pendientes de enviar`;
}

export function AvisoSinConexion() {
  const { colores } = useTema();
  const router = useRouter();
  const { cerrarSesion } = useAuth();
  const { sinConexion, sinSesionReal, cambiosPendientes } = useKitchen();
  const [saliendo, setSaliendo] = useState(false);

  if (!sinSesionReal && !sinConexion && cambiosPendientes === 0) return null;

  // Cerrar sesión no borra la cola: está guardada por cafetería y se envía al volver a entrar
  const handleCerrarSesion = async () => {
    setSaliendo(true);
    try {
      await cerrarSesion();
    } finally {
      router.replace('/login');
    }
  };

  const estado = sinSesionReal ? 'sesion' : sinConexion ? 'conexion' : 'enviando';

  const fondo =
    estado === 'sesion' ? colores.danger_soft : estado === 'conexion' ? colores.warning_soft : colores.info_soft;
  const borde =
    estado === 'sesion'
      ? colores.danger_border
      : estado === 'conexion'
        ? colores.warning_border
        : colores.info_border;
  const color =
    estado === 'sesion' ? colores.danger : estado === 'conexion' ? colores.warning : colores.info;

  const icono =
    estado === 'sesion'
      ? 'alert-circle-outline'
      : estado === 'conexion'
        ? 'cloud-offline-outline'
        : 'cloud-upload-outline';

  const titulo =
    estado === 'sesion' ? 'Tu sesión no es real' : estado === 'conexion' ? 'Sin conexión' : 'Enviando cambios…';

  let detalle: string;
  if (estado === 'sesion') {
    detalle = 'Cierra sesión y vuelve a entrar con tu cuenta de cocina.';
    if (cambiosPendientes > 0) {
      detalle += ` Tienes ${textoCambios(cambiosPendientes)}: se enviarán al volver a entrar.`;
    }
  } else if (estado === 'conexion') {
    detalle =
      cambiosPendientes > 0
        ? `${textoCambios(cambiosPendientes)}. Se envían solos al volver la conexión.`
        : 'Puede que la lista no esté al día. Desliza hacia abajo para reintentar.';
  } else {
    detalle = textoCambios(cambiosPendientes);
  }

  return (
    <View
      // Lectores de pantalla: se anuncia cuando aparece o cambia el texto
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[estilos.franja, { backgroundColor: fondo, borderColor: borde }]}
    >
      <Ionicons name={icono} size={20} color={color} />
      <View style={estilos.textos}>
        <Text style={[tipografia.cuerpo_fuerte, { color }]}>{titulo}</Text>
        <Text style={[tipografia.detalle, { color }]}>{detalle}</Text>
      </View>

      {estado === 'sesion' && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          activeOpacity={0.8}
          disabled={saliendo}
          onPress={handleCerrarSesion}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          style={[estilos.boton, { backgroundColor: colores.danger, opacity: saliendo ? 0.6 : 1 }]}
        >
          <Text style={[estilos.textoBoton, { color: colores.on_danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      )}
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
  // Con el hitSlop, el área táctil llega a los 44 px mínimos del diseño
  boton: {
    minHeight: 36,
    paddingHorizontal: espaciado.md,
    borderRadius: radios.pastilla,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBoton: {
    fontFamily: fuentes.semibold,
    fontSize: 13,
  },
});
