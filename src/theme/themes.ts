// TIPOS
// Todas las paletas deben definir exactamente estos colores; TypeScript avisa si a una le falta alguno
export type ColoresTema = {
  background: string;
  background_auth: string;
  surface: string;
  surface_muted: string;
  placeholder: string;
  primary: string;
  on_primary: string;
  primary_strong: string;
  primary_soft: string;
  primary_subtle: string;
  avatar: string;
  border: string;
  border_strong: string;
  border_dashed: string;
  divider: string;
  text: string;
  text_secondary: string;
  text_muted: string;
  text_subtle: string;
  danger: string;
  on_danger: string;
  danger_soft: string;
  danger_border: string;
  warning: string;
  on_warning: string;
  warning_soft: string;
  warning_border: string;
  success: string;
  info: string;
  info_soft: string;
  info_border: string;
  overlay: string;
  shadow: string;
};

export type NombreTema = 'orby' | 'miami';

export type Modo = 'claro' | 'oscuro';

// Cada tema es una identidad visual con una paleta para cada modo
export type Tema = {
  nombre: NombreTema;
  etiqueta: string; // Nombre visible para el usuario
  paletas: Record<Modo, ColoresTema>;
};

// TEMA ORBY
// Diseño principal; el modo claro es el del mockup docs/design/mockups.html
const orby: Tema = {
  nombre: 'orby',
  etiqueta: 'Orby',
  paletas: {
    claro: {
      background: '#F4F6F5',
      background_auth: '#EEF4F2',
      surface: '#FFFFFF',
      surface_muted: '#EFF2F1',
      placeholder: '#E6EAE8',
      primary: '#2F7D6B',
      on_primary: '#FFFFFF',
      primary_strong: '#1F5A4C',
      primary_soft: '#DCEBE6',
      primary_subtle: '#E6EEEB',
      avatar: '#CFDFD9',
      border: '#DDE2E0',
      border_strong: '#C8D5D0',
      border_dashed: '#B9C2BF',
      divider: '#EEF1F0',
      text: '#1A1D1C',
      text_secondary: '#4F5553',
      text_muted: '#6B7270',
      text_subtle: '#8A918E',
      danger: '#B3261E',
      on_danger: '#FFFFFF',
      danger_soft: '#FBE7E5',
      danger_border: '#E3ADA8',
      warning: '#8A5A00',
      on_warning: '#FFFFFF',
      warning_soft: '#F7EDD8',
      warning_border: '#D8C08A',
      success: '#0E7A5A',
      info: '#1F5A4C',
      info_soft: '#E6EEEB',
      info_border: '#CFDFD9',
      overlay: 'rgba(14, 20, 19, 0.42)',
      shadow: '#000000',
    },
    // Gris verdoso oscuro; el verde se aclara para seguir legible y lleva texto oscuro encima
    oscuro: {
      background: '#101413',
      background_auth: '#0C110F',
      surface: '#1A201E',
      surface_muted: '#222A27',
      placeholder: '#2A3330',
      primary: '#4FB89E',
      on_primary: '#0B1A16',
      primary_strong: '#7FD4BE',
      primary_soft: '#1E3A33',
      primary_subtle: '#17302A',
      avatar: '#24443C',
      border: '#2C3633',
      border_strong: '#3B4844',
      border_dashed: '#4F5D58',
      divider: '#222A27',
      text: '#EEF3F1',
      text_secondary: '#B5C0BC',
      text_muted: '#8D9995',
      text_subtle: '#75817D',
      danger: '#FF8A80',
      on_danger: '#2A0F0C',
      danger_soft: '#2A1215',
      danger_border: '#5C2B2E',
      warning: '#E8B85C',
      on_warning: '#2B1D00',
      warning_soft: '#2B2210',
      warning_border: '#5A4520',
      success: '#5FD3A8',
      info: '#7FD4BE',
      info_soft: '#17302A',
      info_border: '#24443C',
      overlay: 'rgba(0, 0, 0, 0.6)',
      shadow: '#000000',
    },
  },
};

// TEMA MIAMI
// Inspirado en Vice City (GTA VI): de día playa y rosa intenso, de noche morado y neón
const miami: Tema = {
  nombre: 'miami',
  etiqueta: 'Miami',
  paletas: {
    // Rosa más profundo que el de noche para que el texto blanco encima sea legible
    claro: {
      background: '#FFF6FA',
      background_auth: '#FFEAF3',
      surface: '#FFFFFF',
      surface_muted: '#FBEFF5',
      placeholder: '#F6E3EE',
      primary: '#D6246E',
      on_primary: '#FFFFFF',
      primary_strong: '#A3164F',
      primary_soft: '#FFD9E8',
      primary_subtle: '#FFEAF3',
      avatar: '#F9CFE2',
      border: '#F0D9E5',
      border_strong: '#E3BCD0',
      border_dashed: '#CFA3BB',
      divider: '#F7E8F0',
      text: '#2A1033',
      text_secondary: '#5E4A6B',
      text_muted: '#76627F',
      text_subtle: '#9A88A6',
      danger: '#C21F3A',
      on_danger: '#FFFFFF',
      danger_soft: '#FDE4E8',
      danger_border: '#F2B3BE',
      warning: '#8A5300',
      on_warning: '#FFFFFF',
      warning_soft: '#FFF0D6',
      warning_border: '#F0CF8F',
      success: '#0E7A5A',
      info: '#00788A',
      info_soft: '#DDF6F8',
      info_border: '#9EDFE6',
      overlay: 'rgba(42, 16, 51, 0.45)',
      shadow: '#000000',
    },
    // Sobre el rosa neón el texto va oscuro: el blanco no alcanza el contraste mínimo
    oscuro: {
      background: '#1A1033',
      background_auth: '#140B29',
      surface: '#251845',
      surface_muted: '#2F2055',
      placeholder: '#3A2A63',
      primary: '#FF3E9A',
      on_primary: '#1A1033',
      primary_strong: '#FF7AB8',
      primary_soft: '#4A1E4F',
      primary_subtle: '#3A1740',
      avatar: '#4A2C70',
      border: '#3D2C66',
      border_strong: '#5A4390',
      border_dashed: '#6E58A3',
      divider: '#2F2055',
      text: '#FFF5FA',
      text_secondary: '#C9B8E8',
      text_muted: '#9A86C2',
      text_subtle: '#8B78B5',
      danger: '#FF5C5C',
      on_danger: '#2A0A12',
      danger_soft: '#4A1A2A',
      danger_border: '#8A2E45',
      warning: '#FFC145',
      on_warning: '#2B1D00',
      warning_soft: '#3D2E1A',
      warning_border: '#7A5A22',
      success: '#5FE3B0',
      info: '#2DE2E6',
      info_soft: '#12324A',
      info_border: '#1F6F7A',
      overlay: 'rgba(5, 2, 12, 0.6)',
      shadow: '#000000',
    },
  },
};

// CATÁLOGO DE TEMAS
export const temas: Record<NombreTema, Tema> = { orby, miami };
