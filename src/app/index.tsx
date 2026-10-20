import { Link } from 'expo-router'; // Enlaces entre pantallas
import { useEffect, useState } from 'react'; // Estado y efectos de React
import { StyleSheet, Text, View } from 'react-native'; // Componentes base de React Native

import { supabase_configurado, supabase_llave, supabase_url } from '@/lib/env'; // Datos de conexión del proyecto
import { espaciado, tipografia, useTema } from '@/theme'; // Tema activo y tokens

// FUNCIONES
// Consulta el endpoint de salud de Auth para saber si el teléfono alcanza a Supabase
async function verificar_conexion() {
  // Sin variables de entorno no hay a dónde conectarse
  if (!supabase_configurado) {
    return 'Falta configurar .env';
  }

  try {
    const respuesta = await fetch(`${supabase_url}/auth/v1/health`, { headers: { apikey: supabase_llave } });

    return respuesta.ok ? 'Conectado a Supabase' : `Supabase respondió ${respuesta.status}`;
  } catch {
    return `Sin conexión con ${supabase_url}`;
  }
}

// PANTALLA DE INICIO
// Pantalla temporal: muestra si la app logra conectarse a Supabase
export default function InicioScreen() {
  const { colores } = useTema();
  const [estado_conexion, set_estado_conexion] = useState('Verificando conexión...');

  // Verificar la conexión una sola vez al abrir la pantalla
  useEffect(() => {
    verificar_conexion().then(set_estado_conexion);
  }, []);

  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.background_auth }]}>
      <Text style={[tipografia.display, { color: colores.text }]}>Orby</Text>
      <Text style={[tipografia.cuerpo, { color: colores.text_secondary }]}>{estado_conexion}</Text>

      {/* Acceso al laboratorio visual, solo en desarrollo */}
      {__DEV__ && (
        <Link href="/lab" style={[tipografia.boton, estilos.enlace, { color: colores.primary_strong }]}>Abrir laboratorio</Link>
      )}
    </View>
  );
}

// ESTILOS
const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  enlace: {
    marginTop: espaciado.xl,
    padding: espaciado.md,
  },
});
