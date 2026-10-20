import { Pressable, StyleSheet, Text, View } from 'react-native'; // Componentes base de React Native

import { espaciado, medidas, radios, tipografia, useTema } from '@/theme'; // Tema activo y tokens

// TIPOS
type PropsSelector<Valor extends string> = {
  opciones: { valor: Valor; etiqueta: string }[];
  valor: Valor;
  al_cambiar: (valor: Valor) => void;
};

// SELECTOR DEL LABORATORIO
// Grupo de pastillas para los controles del laboratorio (provisional hasta tener el componente SegmentedTabs)
export function SelectorLab<Valor extends string>({ opciones, valor, al_cambiar }: PropsSelector<Valor>) {
  const { colores } = useTema();

  return (
    <View style={[estilos.selector, { backgroundColor: colores.surface, borderColor: colores.border }]}>
      {opciones.map((opcion_iter) => {
        const activo = opcion_iter.valor === valor;

        return (
          <Pressable
            key={opcion_iter.valor}
            onPress={() => al_cambiar(opcion_iter.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            style={[estilos.opcion, { backgroundColor: activo ? colores.primary : 'transparent' }]}
          >
            <Text style={[tipografia.boton, { color: activo ? colores.on_primary : colores.text_secondary }]}>{opcion_iter.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ESTILOS
const estilos = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    padding: espaciado.xs,
    borderWidth: 1,
    borderRadius: radios.pastilla,
  },
  opcion: {
    flex: 1,
    minHeight: medidas.minimo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radios.pastilla,
  },
});
