// VARIABLES DE ENTORNO
// Se leen desde .env (ver .env.example); el prefijo EXPO_PUBLIC_ las incluye en la app, por eso solo van datos públicos
// Expo solo las reemplaza si se escriben completas (process.env.NOMBRE), no con acceso dinámico
export const supabase_url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabase_llave = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

// Indica si hay datos suficientes para conectarse a Supabase
export const supabase_configurado = supabase_url !== '' && supabase_llave !== '';
