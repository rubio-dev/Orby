import { Redirect, Stack } from 'expo-router'; // Navegación y redirección de Expo Router

// LAYOUT DEL LABORATORIO
// El laboratorio visual solo existe en desarrollo; en producción redirige al inicio
export default function LabLayout() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
