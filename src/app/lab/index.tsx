import { Link } from 'expo-router'; // Enlaces entre pantallas
import { ScrollView, StyleSheet, Text, View } from 'react-native'; // Componentes base de React Native
import { SafeAreaView } from 'react-native-safe-area-context'; // Respeta la muesca y la barra de estado

import { SeccionColores } from '@/lab/color-section'; // Muestras de color y contrastes
import { SelectorLab } from '@/lab/lab-selector'; // Controles del laboratorio
import { SeccionTipografia } from '@/lab/typography-section'; // Variantes tipográficas
import { espaciado, temas, tipografia, useTema, type NombreTema, type PreferenciaModo } from '@/theme'; // Tema activo y tokens

// VARIABLES
// Opciones de los selectores del laboratorio
const opciones_tema = (Object.keys(temas) as NombreTema[]).map((nombre_iter) => ({ valor: nombre_iter, etiqueta: temas[nombre_iter].etiqueta }));

const opciones_modo: { valor: PreferenciaModo; etiqueta: string }[] = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

// PANTALLA DEL LABORATORIO
// Banco de pruebas visual: cada pieza del sistema de diseño se revisa aquí en todos los temas y modos antes de usarse en la app
export default function LabScreen() {
  const { tema, modo, colores, preferencia_modo, cambiar_tema, cambiar_modo } = useTema();

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        {/* Encabezado */}
        <View style={estilos.encabezado}>
          <Link href="/" style={[tipografia.etiqueta, { color: colores.primary_strong }]}>← Volver</Link>
          <Text style={[tipografia.display, { color: colores.text }]}>Laboratorio</Text>
          <Text style={[tipografia.detalle, { color: colores.text_muted }]}>
            Solo visible en desarrollo · {tema.etiqueta} {modo}
          </Text>
        </View>

        {/* Controles de tema y modo */}
        <View style={estilos.controles}>
          <SelectorLab opciones={opciones_tema} valor={tema.nombre} al_cambiar={cambiar_tema} />
          <SelectorLab opciones={opciones_modo} valor={preferencia_modo} al_cambiar={cambiar_modo} />
        </View>

        <SeccionColores />
        <SeccionTipografia />
      </ScrollView>
    </SafeAreaView>
  );
}

// ESTILOS
const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    padding: espaciado.pantalla,
    paddingBottom: espaciado.xxl * 2,
    gap: espaciado.xl,
  },
  encabezado: {
    gap: espaciado.xs,
  },
  controles: {
    gap: espaciado.sm,
  },
});
