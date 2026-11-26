import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components/CustomButton';
import { CustomInput } from '@/components/CustomInput';
import { OrbyLogo } from '@/components/OrbyLogo';
import { useAuth } from '@/context/auth-context';
import {
  LARGO_MAXIMO_CONTRASENA,
  MENSAJE_SIN_CONEXION,
  traducir_error,
  validar_contrasena,
} from '@/lib/auth';
import { mostrarAviso } from '@/lib/confirm';
import { supabase_configurado } from '@/lib/env';
import { obtener_supabase } from '@/lib/supabase';
import { espaciado, fuentes, useTema } from '@/theme';

type EstadoEnlace = 'verificando' | 'listo' | 'invalido';

// Los enlaces de recuperación de Supabase traen los tokens en el fragmento (#) de la URL.
// En web el navegador los conserva; en el teléfono llegan por el deep link orby://restablecer.
function leerParametros(url: string | null) {
  if (!url) return new URLSearchParams();

  const fragmento = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  if (fragmento) {
    return new URLSearchParams(fragmento);
  }

  const consulta = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  return new URLSearchParams(consulta);
}

async function urlActual() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.href;
  }
  return await Linking.getInitialURL();
}

export default function RestablecerContrasenaScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { cerrarSesion } = useAuth();

  const [estado, setEstado] = useState<EstadoEnlace>('verificando');
  const [mensajeEnlace, setMensajeEnlace] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Toma los tokens del enlace y abre una sesión temporal solo para cambiar la contraseña.
  useEffect(() => {
    let activo = true;

    async function prepararSesion(urlRecibida?: string) {
      if (!supabase_configurado) {
        if (!activo) return;
        setMensajeEnlace('Supabase no está configurado en esta instalación.');
        setEstado('invalido');
        return;
      }

      try {
        const supabase = obtener_supabase();
        const url = urlRecibida ?? (await urlActual());
        const parametros = leerParametros(url);
        const errorDescripcion = parametros.get('error_description') ?? parametros.get('error');
        const accessToken = parametros.get('access_token');
        const refreshToken = parametros.get('refresh_token');

        if (errorDescripcion) {
          if (!activo) return;
          setMensajeEnlace('El enlace ya se usó o caducó. Solicita uno nuevo desde el inicio de sesión.');
          setEstado('invalido');
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!activo) return;

          if (error) {
            setMensajeEnlace(traducir_error(error));
            setEstado('invalido');
            return;
          }

          // Se limpia el hash para que recargar la página no reutilice un token ya gastado.
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }

          setEstado('listo');
          return;
        }

        // Si no viene token, puede ser que la sesión ya esté abierta en este dispositivo.
        const { data } = await supabase.auth.getSession();
        if (!activo) return;

        if (data.session) {
          setEstado('listo');
        } else {
          setMensajeEnlace('Abre el enlace del correo de recuperación para crear una contraseña nueva.');
          setEstado('invalido');
        }
      } catch (error) {
        if (!activo) return;
        console.warn('No se pudo preparar el enlace de recuperación:', error);
        setMensajeEnlace('No se pudo validar el enlace. Revisa tu conexión e inténtalo de nuevo.');
        setEstado('invalido');
      }
    }

    prepararSesion();

    // Si la app ya estaba abierta, el deep link llega por este evento.
    const suscripcion =
      Platform.OS === 'web'
        ? null
        : Linking.addEventListener('url', ({ url }) => {
            prepararSesion(url);
          });

    return () => {
      activo = false;
      suscripcion?.remove();
    };
  }, []);

  const handleGuardar = async () => {
    const errorValidacion = validar_contrasena(nuevaContrasena, confirmacion);
    if (errorValidacion) {
      setErrorContrasena(errorValidacion);
      return;
    }

    setErrorContrasena(null);
    setGuardando(true);

    try {
      const supabase = obtener_supabase();
      const { error } = await supabase.auth.updateUser({ password: nuevaContrasena });

      if (error) {
        mostrarAviso('No se pudo cambiar', traducir_error(error));
        return;
      }

      await cerrarSesion();
      mostrarAviso(
        'Contraseña actualizada',
        'Ya puedes iniciar sesión con tu contraseña nueva.',
        [
          {
            text: 'Ir a iniciar sesión',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error) {
      console.warn('Error al guardar la contraseña nueva:', error);
      mostrarAviso('No se pudo cambiar', MENSAJE_SIN_CONEXION);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background_auth }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.logoContenedor}>
            <OrbyLogo size={110} showText={false} />
          </View>

          <View style={estilos.formulario}>
            <Text accessibilityRole="header" style={[estilos.titulo, { color: colores.text }]}>
              Nueva contraseña
            </Text>
            <Text style={[estilos.subtitulo, { color: colores.text_secondary }]}>
              Crea una contraseña de al menos 8 caracteres, con una letra y un número.
            </Text>

            {estado === 'verificando' && (
              <View style={estilos.estadoContenedor}>
                <ActivityIndicator size="large" color={colores.primary} />
                <Text style={[estilos.estadoTexto, { color: colores.text_secondary }]}>
                  Validando el enlace…
                </Text>
              </View>
            )}

            {estado === 'invalido' && (
              <View style={[estilos.cajaAviso, { backgroundColor: colores.warning_soft }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colores.warning} />
                <Text style={[estilos.textoAviso, { color: colores.warning }]}>
                  {mensajeEnlace || 'El enlace no es válido o ya caducó.'}
                </Text>
              </View>
            )}

            {estado === 'listo' && (
              <>
                <CustomInput
                  label="Contraseña nueva"
                  obligatorio
                  placeholder="Mínimo 8 caracteres"
                  esContrasena
                  autoCapitalize="none"
                  autoComplete="new-password"
                  maxLength={LARGO_MAXIMO_CONTRASENA}
                  value={nuevaContrasena}
                  onChangeText={(texto) => {
                    setNuevaContrasena(texto);
                    setErrorContrasena(null);
                  }}
                  error={errorContrasena ?? undefined}
                  variante="relleno"
                />

                <CustomInput
                  label="Confirmar contraseña"
                  obligatorio
                  placeholder="Escríbela otra vez"
                  esContrasena
                  autoCapitalize="none"
                  autoComplete="new-password"
                  maxLength={LARGO_MAXIMO_CONTRASENA}
                  value={confirmacion}
                  onChangeText={setConfirmacion}
                  variante="relleno"
                />

                <CustomButton
                  titulo="Guardar contraseña"
                  variante="primary"
                  cargando={guardando}
                  onPress={handleGuardar}
                  estilo={estilos.boton}
                />
              </>
            )}

            <CustomButton
              titulo="Volver a iniciar sesión"
              variante="outline"
              deshabilitado={guardando}
              onPress={async () => {
                // Si el enlace abrió una sesión de recuperación, no se deja abierta al salir.
                await cerrarSesion();
                router.replace('/login');
              }}
              estilo={estilos.boton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: espaciado.pantalla,
    paddingVertical: espaciado.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoContenedor: {
    alignItems: 'center',
    marginBottom: espaciado.sm,
  },
  formulario: {
    width: '100%',
    maxWidth: 360,
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: fuentes.medium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: espaciado.lg,
    textAlign: 'center',
  },
  estadoContenedor: {
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.lg,
  },
  estadoTexto: {
    fontFamily: fuentes.medium,
    fontSize: 14,
  },
  cajaAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderRadius: 10,
    marginBottom: espaciado.md,
  },
  textoAviso: {
    flex: 1,
    fontFamily: fuentes.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  boton: {
    height: 52,
    borderRadius: 12,
  },
});
