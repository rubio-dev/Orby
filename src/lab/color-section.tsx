import { StyleSheet, Text, View } from 'react-native'; // Componentes base de React Native

import { calcular_contraste } from '@/lab/contrast'; // Relación de contraste WCAG
import { espaciado, radios, tipografia, useTema, type ColoresTema } from '@/theme'; // Tema activo y tokens

// VARIABLES
// Agrupación de los tokens de color para mostrarlos ordenados
const grupos_colores: { titulo: string; tokens: (keyof ColoresTema)[] }[] = [
  { titulo: 'Fondos', tokens: ['background', 'background_auth', 'surface', 'surface_muted', 'placeholder', 'avatar', 'overlay'] },
  { titulo: 'Primario', tokens: ['primary', 'on_primary', 'primary_strong', 'primary_soft', 'primary_subtle'] },
  { titulo: 'Bordes', tokens: ['border', 'border_strong', 'border_dashed', 'divider'] },
  { titulo: 'Texto', tokens: ['text', 'text_secondary', 'text_muted', 'text_subtle'] },
  { titulo: 'Estados', tokens: ['danger', 'danger_soft', 'danger_border', 'warning', 'warning_soft', 'warning_border', 'info', 'info_soft', 'info_border'] },
];

// Pares texto/fondo que usa el diseño, con el contraste mínimo que deben cumplir
// 4.5 = texto normal (WCAG AA); 3 = texto grande, cifras o elementos gráficos
const pares_contraste: { frente: keyof ColoresTema; fondo: keyof ColoresTema; minimo: number }[] = [
  { frente: 'text', fondo: 'background', minimo: 4.5 },
  { frente: 'text', fondo: 'surface', minimo: 4.5 },
  { frente: 'text_secondary', fondo: 'surface', minimo: 4.5 },
  { frente: 'text_muted', fondo: 'surface', minimo: 4.5 },
  { frente: 'text_subtle', fondo: 'surface', minimo: 3 },
  { frente: 'on_primary', fondo: 'primary', minimo: 4.5 },
  { frente: 'primary', fondo: 'surface', minimo: 3 },
  { frente: 'primary_strong', fondo: 'primary_soft', minimo: 4.5 },
  { frente: 'danger', fondo: 'surface', minimo: 4.5 },
  { frente: 'danger', fondo: 'danger_soft', minimo: 4.5 },
  { frente: 'warning', fondo: 'warning_soft', minimo: 4.5 },
  { frente: 'info', fondo: 'info_soft', minimo: 4.5 },
];

// SECCIÓN DE COLORES
// Muestra cada token del tema activo y valida los contrastes del diseño
export function SeccionColores() {
  const { colores } = useTema();

  return (
    <View style={estilos.seccion}>
      <Text style={[tipografia.titulo, { color: colores.text }]}>Colores</Text>

      {/* Muestras de color por grupo */}
      {grupos_colores.map((grupo_iter) => (
        <View key={grupo_iter.titulo} style={estilos.grupo}>
          <Text style={[tipografia.etiqueta, { color: colores.text_secondary }]}>{grupo_iter.titulo}</Text>

          <View style={estilos.cuadricula}>
            {grupo_iter.tokens.map((token_iter) => (
              <View key={token_iter} style={[estilos.muestra, { backgroundColor: colores.surface, borderColor: colores.border }]}>
                <View style={[estilos.color, { backgroundColor: colores[token_iter], borderColor: colores.border }]} />
                <Text style={[tipografia.detalle, { color: colores.text }]} numberOfLines={1}>{token_iter}</Text>
                <Text style={[tipografia.micro, { color: colores.text_muted }]} numberOfLines={1}>{colores[token_iter]}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Validación de contrastes */}
      <View style={estilos.grupo}>
        <Text style={[tipografia.etiqueta, { color: colores.text_secondary }]}>Contrastes</Text>

        {pares_contraste.map((par_iter) => {
          const contraste_val = calcular_contraste(colores[par_iter.frente], colores[par_iter.fondo]);
          const aprobado = contraste_val >= par_iter.minimo;

          return (
            <View key={`${par_iter.frente}-${par_iter.fondo}`} style={[estilos.fila_contraste, { backgroundColor: colores[par_iter.fondo], borderColor: colores.border }]}>
              <Text style={[tipografia.cuerpo_fuerte, estilos.texto_contraste, { color: colores[par_iter.frente] }]} numberOfLines={1}>
                {par_iter.frente} / {par_iter.fondo}
              </Text>
              <Text style={[tipografia.etiqueta, { color: aprobado ? colores.text : colores.danger, backgroundColor: colores.surface }, estilos.resultado]}>
                {contraste_val.toFixed(2)} {aprobado ? '✓' : `✗ mín. ${par_iter.minimo}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ESTILOS
const estilos = StyleSheet.create({
  seccion: {
    gap: espaciado.lg,
  },
  grupo: {
    gap: espaciado.sm,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  muestra: {
    width: '31%',
    padding: espaciado.sm,
    borderWidth: 1,
    borderRadius: radios.md,
    gap: espaciado.xxs,
  },
  color: {
    height: 40,
    borderWidth: 1,
    borderRadius: radios.sm,
    marginBottom: espaciado.xs,
  },
  fila_contraste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderWidth: 1,
    borderRadius: radios.lg,
  },
  texto_contraste: {
    flex: 1,
  },
  resultado: {
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xxs,
    borderRadius: radios.pastilla,
    overflow: 'hidden',
  },
});
