// TOKENS COMPARTIDOS
// Medidas, radios y tipografía comunes a todos los temas (fuente: docs/design-system.md)
// Los colores de la interfaz viven en themes.ts porque son lo que cambia entre temas

// COLORES DE MARCA
// El logotipo de Orby es una ilustración fija: no cambia con el tema ni con el modo.
// Por eso no son tokens semánticos de las paletas, sino constantes de la marca.
export const coloresMarca = {
  lima: '#A4D867',
  turquesa: '#44B99D',
  verde: '#388D79',
  anillo: '#4ABFA5',
  cafe_oscuro: '#4A2612',
  blanco: '#FFFFFF',
  cafe_claro: '#8A512D',
  planeta: '#52C4AA',
  planeta_borde: '#3A9F88',
  texto: '#3E2312',
} as const;

// ESPACIADO
// Escala base de 4 px; 'pantalla' es el margen lateral de todas las vistas
export const espaciado = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pantalla: 20,
  xl: 24,
  xxl: 32,
} as const;

// RADIOS
export const radios = {
  sm: 8, // Selects pequeños
  md: 10, // Inputs y miniaturas
  lg: 12, // Tarjetas y botones
  xl: 14, // Mesas
  xxl: 18, // Diálogos
  pastilla: 999, // Pestañas, chips y etiquetas
} as const;

// MEDIDAS TÁCTILES
// Alturas mínimas para uso con el dedo; ningún elemento tocable baja de 'minimo'
export const medidas = {
  minimo: 44,
  input: 48,
  boton: 52,
  accion_rapida: 60,
} as const;

// FUENTES
// En React Native cada peso es una familia distinta (cargadas en src/app/_layout.tsx)
// Títulos en Josefin Sans Light (delgada); texto e interfaz en Plus Jakarta Sans
export const fuentes = {
  titulos: 'JosefinSans_300Light',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

// TIPOGRAFÍA
// Variantes tomadas del mockup; letterSpacing en px
// Regla: la fuente delgada solo en 20 px o más; debajo de eso se pierde en modo oscuro y a distancia
export const tipografia = {
  display: { fontFamily: fuentes.titulos, fontSize: 34, lineHeight: 40, letterSpacing: 0.5 }, // Bienvenida
  titulo: { fontFamily: fuentes.titulos, fontSize: 22, lineHeight: 28, letterSpacing: 0.2 }, // Título de pantalla
  cifra: { fontFamily: fuentes.titulos, fontSize: 28, lineHeight: 34 }, // Indicadores
  boton_grande: { fontFamily: fuentes.semibold, fontSize: 17, lineHeight: 22 }, // Accesos rápidos
  boton: { fontFamily: fuentes.semibold, fontSize: 16, lineHeight: 20 },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 15, lineHeight: 21 },
  cuerpo_fuerte: { fontFamily: fuentes.semibold, fontSize: 15, lineHeight: 21 }, // Nombre de producto
  etiqueta: { fontFamily: fuentes.medium, fontSize: 13, lineHeight: 18 }, // Labels de formulario
  detalle: { fontFamily: fuentes.regular, fontSize: 12, lineHeight: 17 }, // Descripciones y ayudas
  micro: { fontFamily: fuentes.medium, fontSize: 11, lineHeight: 14 }, // Etiquetas de indicadores y barra inferior
} as const;

export type VarianteTipografia = keyof typeof tipografia;
