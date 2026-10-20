// Fuentes: se importan peso por peso para no meter en la app todos los archivos de cada paquete
import { JosefinSans_300Light } from '@expo-google-fonts/josefin-sans/300Light';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font'; // Carga de fuentes en tiempo de ejecución
import { Stack } from 'expo-router'; // Navegación en pila de Expo Router
import * as SplashScreen from 'expo-splash-screen'; // Pantalla de arranque mientras cargan las fuentes
import { StatusBar } from 'expo-status-bar'; // Barra de estado del sistema
import { useEffect } from 'react'; // Efectos de React

import { TemaProvider, useTema } from '@/theme'; // Tema activo de la app

// Mantener la pantalla de arranque hasta que las fuentes estén listas
SplashScreen.preventAutoHideAsync();

// NAVEGACIÓN
// Pila principal; vive dentro de TemaProvider para leer los colores del tema activo
function Navegacion() {
  const { colores, modo } = useTema();

  return (
    <>
      <StatusBar style={modo === 'oscuro' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.background } }} />
    </>
  );
}

// LAYOUT RAÍZ
// Carga las fuentes y monta el proveedor de tema; las pantallas viven en src/app/
export default function RootLayout() {
  const [fuentes_cargadas, error_fuentes] = useFonts({
    JosefinSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Ocultar la pantalla de arranque al terminar la carga (si falla, se sigue con la fuente del sistema)
  useEffect(() => {
    if (fuentes_cargadas || error_fuentes) {
      SplashScreen.hideAsync();
    }
  }, [fuentes_cargadas, error_fuentes]);

  if (!fuentes_cargadas && !error_fuentes) {
    return null;
  }

  return (
    <TemaProvider>
      <Navegacion />
    </TemaProvider>
  );
}
