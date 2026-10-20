import { StyleSheet, Text, View } from 'react-native'; // Componentes base de React Native

import { espaciado, radios, tipografia, useTema, type VarianteTipografia } from '@/theme'; // Tema activo y tokens

// VARIABLES
// Texto de ejemplo por variante, con contenido real de la app
const ejemplos: Record<VarianteTipografia, string> = {
  display: 'Orby',
  titulo: 'Mesa 4 · Orden #1',
  cifra: '$20,500',
  boton_grande: 'Tomar pedido',
  boton: 'Enviar a cocina',
  cuerpo: 'Espresso con leche vaporizada',
  cuerpo_fuerte: 'Chilaquiles verdes',
  etiqueta: 'Correo electrónico',
  detalle: 'Sin cebolla · salsa aparte',
  micro: 'Pedidos hoy',
};

// SECCIÓN DE TIPOGRAFÍA
// Muestra cada variante tipográfica con su tamaño y peso
export function SeccionTipografia() {
  const { colores } = useTema();

  return (
    <View style={estilos.seccion}>
      <Text style={[tipografia.titulo, { color: colores.text }]}>Tipografía</Text>

      {/* Una tarjeta por variante */}
      {(Object.keys(tipografia) as VarianteTipografia[]).map((variante_iter) => (
        <View key={variante_iter} style={[estilos.tarjeta, { backgroundColor: colores.surface, borderColor: colores.border }]}>
          <Text style={[tipografia[variante_iter], { color: colores.text }]}>{ejemplos[variante_iter]}</Text>
          <Text style={[tipografia.micro, { color: colores.text_muted }]}>
            {variante_iter} · {tipografia[variante_iter].fontSize} px · {tipografia[variante_iter].fontFamily.replace('_', ' ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ESTILOS
const estilos = StyleSheet.create({
  seccion: {
    gap: espaciado.sm,
  },
  tarjeta: {
    padding: espaciado.md,
    borderWidth: 1,
    borderRadius: radios.lg,
    gap: espaciado.xs,
  },
});
