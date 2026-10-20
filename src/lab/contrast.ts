// FUNCIONES
// Luminancia relativa de un color #RRGGBB según WCAG 2.x
function calcular_luminancia(color_hex: string) {
  // Convertir cada canal a lineal (fórmula sRGB de WCAG)
  const canales = [1, 3, 5].map((inicio) => {
    const canal_val = parseInt(color_hex.slice(inicio, inicio + 2), 16) / 255;

    return canal_val <= 0.03928 ? canal_val / 12.92 : ((canal_val + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

// Relación de contraste entre dos colores #RRGGBB (de 1 a 21)
export function calcular_contraste(color_frente: string, color_fondo: string) {
  const luminancia_a = calcular_luminancia(color_frente);
  const luminancia_b = calcular_luminancia(color_fondo);

  return (Math.max(luminancia_a, luminancia_b) + 0.05) / (Math.min(luminancia_a, luminancia_b) + 0.05);
}
