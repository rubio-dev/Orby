import { Alert } from 'react-native'; // Diálogo del sistema (solo como respaldo)

// TIPOS
// Mismo formato de botón que Alert.alert, para poder cambiar uno por otro sin reescribir pantallas
export type BotonAviso = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive'; // cancel = botón con borde; destructive = botón rojo
  onPress?: () => void | Promise<void>;
};

export type DatosAviso = {
  titulo: string;
  mensaje?: string;
  botones: BotonAviso[];
};

// VARIABLES
// Función que muestra el aviso con diseño. La registra <DialogoProvider> (src/components/DialogoProvider.tsx)
// al montarse en el layout raíz; mientras no exista, se usa el diálogo del sistema.
let presentador: ((datos: DatosAviso) => void) | null = null;

export function registrarPresentador(funcion: ((datos: DatosAviso) => void) | null) {
  presentador = funcion;
}

// Ejecuta la acción de un botón y muestra en consola si falla (sin trabar la app)
export function ejecutarBoton(boton: BotonAviso) {
  try {
    const resultado = boton.onPress?.();
    if (resultado && typeof (resultado as Promise<void>).catch === 'function') {
      (resultado as Promise<void>).catch((err) => console.error('Error en el botón del aviso:', err));
    }
  } catch (err) {
    console.error('Error en el botón del aviso:', err);
  }
}

// AVISO (reemplaza a Alert.alert)
// Recibe lo mismo que Alert.alert: título, mensaje y botones. Si no hay botones, muestra "Aceptar".
// Funciona en web, Android e iOS con el diseño de Orby (Alert.alert no hace nada en el navegador).
export function mostrarAviso(titulo: string, mensaje?: string, botones?: BotonAviso[], _opciones?: unknown) {
  const lista = botones && botones.length > 0 ? botones : [{ text: 'Aceptar' }];

  if (presentador) {
    presentador({ titulo, mensaje, botones: lista });
    return;
  }

  // Respaldo: si el proveedor aún no está montado, se usa el diálogo del sistema
  Alert.alert(
    titulo,
    mensaje,
    lista.map((boton) => ({ text: boton.text, style: boton.style, onPress: () => ejecutarBoton(boton) }))
  );
}

// CONFIRMACIÓN (Cancelar / Confirmar)
// La usan las barras inferiores y los perfiles para cerrar sesión
export function confirmarAccion({
  titulo,
  mensaje,
  textoConfirmar = 'Aceptar',
  textoCancelar = 'Cancelar',
  destructivo = false,
  alConfirmar,
}: {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destructivo?: boolean;
  alConfirmar: () => void | Promise<void>;
}) {
  mostrarAviso(titulo, mensaje, [
    { text: textoCancelar, style: 'cancel' },
    { text: textoConfirmar, style: destructivo ? 'destructive' : 'default', onPress: alConfirmar },
  ]);
}
