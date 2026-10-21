import { Ionicons } from '@expo/vector-icons'; // Íconos
import React, { useEffect, useState, type ReactNode } from 'react'; // Estado y efectos de React
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // Componentes base

import { ejecutarBoton, registrarPresentador, type BotonAviso, type DatosAviso } from '@/lib/confirm'; // Avisos de la app
import { espaciado, fuentes, radios, useTema } from '@/theme'; // Tema activo y tokens

// PROVEEDOR DE DIÁLOGOS
// Se monta una sola vez en el layout raíz y dibuja la ventana con el diseño de Orby
// cada vez que alguien llama a mostrarAviso() o confirmarAccion() (src/lib/confirm.ts).
export function DialogoProvider({ children }: { children: ReactNode }) {
  const { colores } = useTema();
  const [aviso, setAviso] = useState<DatosAviso | null>(null); // null = no hay aviso abierto

  // Al montarse, se registra como el encargado de mostrar los avisos; al desmontarse, se quita
  useEffect(() => {
    registrarPresentador(setAviso);
    return () => registrarPresentador(null);
  }, []);

  // Cierra la ventana y después ejecuta la acción del botón
  const alPresionar = (boton: BotonAviso) => {
    setAviso(null);
    ejecutarBoton(boton);
  };

  // Tocar fuera de la ventana equivale a "Cancelar" (si existe ese botón)
  const alCerrar = () => {
    const cancelar = aviso?.botones.find((boton) => boton.style === 'cancel');
    setAviso(null);
    if (cancelar) {
      ejecutarBoton(cancelar);
    }
  };

  // Ícono según el tipo de aviso: rojo si hay una acción destructiva (cerrar sesión, eliminar)
  const esDestructivo = aviso?.botones.some((boton) => boton.style === 'destructive') ?? false;
  const icono: keyof typeof Ionicons.glyphMap = esDestructivo ? 'log-out-outline' : 'information-circle-outline';

  return (
    <>
      {children}

      <Modal visible={aviso !== null} transparent animationType="fade" onRequestClose={alCerrar}>
        {/* Fondo oscuro detrás de la ventana */}
        <Pressable style={[estilos.fondo, { backgroundColor: colores.overlay }]} onPress={alCerrar}>
          {/* Ventana: se detiene el toque para que no cierre al tocar dentro */}
          <Pressable style={[estilos.tarjeta, { backgroundColor: colores.surface }]} onPress={() => {}}>
            <View
              style={[
                estilos.iconoCirculo,
                { backgroundColor: esDestructivo ? colores.danger_soft : colores.primary_soft },
              ]}
            >
              <Ionicons name={icono} size={30} color={esDestructivo ? colores.danger : colores.primary_strong} />
            </View>

            <Text style={[estilos.titulo, { color: colores.text }]}>{aviso?.titulo}</Text>

            {aviso?.mensaje ? (
              <Text style={[estilos.mensaje, { color: colores.text_secondary }]}>{aviso.mensaje}</Text>
            ) : null}

            {/* Botones: con 2 van lado a lado; con 1 o 3+ van uno debajo de otro */}
            <View style={[estilos.botones, aviso?.botones.length === 2 && estilos.botonesFila]}>
              {aviso?.botones.map((boton) => {
                const esCancelar = boton.style === 'cancel';
                const esPeligro = boton.style === 'destructive';

                return (
                  <TouchableOpacity
                    key={boton.text}
                    activeOpacity={0.8}
                    onPress={() => alPresionar(boton)}
                    accessibilityRole="button"
                    style={[
                      estilos.boton,
                      aviso.botones.length === 2 && estilos.botonMitad,
                      esCancelar
                        ? { backgroundColor: colores.surface, borderColor: colores.border_strong, borderWidth: 1.5 }
                        : { backgroundColor: esPeligro ? colores.danger : colores.primary },
                    ]}
                  >
                    <Text style={[estilos.textoBoton, { color: esCancelar ? colores.text : colores.on_primary }]}>
                      {boton.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ESTILOS
const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.pantalla,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 340, // Tamaño de celular aunque se abra en una pantalla grande
    borderRadius: radios.xxl,
    padding: espaciado.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  iconoCirculo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espaciado.md,
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  mensaje: {
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: espaciado.sm,
  },
  botones: {
    width: '100%',
    gap: espaciado.sm,
    marginTop: espaciado.xl,
  },
  botonesFila: {
    flexDirection: 'row',
  },
  boton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
  },
  botonMitad: {
    flex: 1,
  },
  textoBoton: {
    fontFamily: fuentes.bold,
    fontSize: 16,
  },
});
