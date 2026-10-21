import { Alert, Platform } from 'react-native';

/**
 * Muestra un diálogo de confirmación que funciona de forma confiable
 * tanto en Web (con window.confirm) como en iOS y Android (con Alert.alert).
 */
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
  if (Platform.OS === 'web') {
    let acepto = true;
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      try {
        acepto = window.confirm(`${titulo}\n\n${mensaje}`);
      } catch {
        acepto = true;
      }
    }
    if (acepto) {
      try {
        const resultado = alConfirmar();
        if (resultado && typeof (resultado as any).catch === 'function') {
          (resultado as Promise<void>).catch((err) => {
            console.error('Error al ejecutar alConfirmar:', err);
          });
        }
      } catch (err) {
        console.error('Error sincrónico en alConfirmar:', err);
      }
    }
  } else {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: textoCancelar, style: 'cancel' },
        {
          text: textoConfirmar,
          style: destructivo ? 'destructive' : 'default',
          onPress: () => {
            try {
              const resultado = alConfirmar();
              if (resultado && typeof (resultado as any).catch === 'function') {
                (resultado as Promise<void>).catch((err) => {
                  console.error('Error al ejecutar alConfirmar:', err);
                });
              }
            } catch (err) {
              console.error('Error sincrónico en alConfirmar:', err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }
}

