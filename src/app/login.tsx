import { Ionicons } from '@expo/vector-icons'; // Íconos (alerta de error)
import { useRouter } from 'expo-router'; // Navegación de Expo Router
import React, { useState } from 'react'; // Estado de React
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'; // Componentes base de React Native
import { SafeAreaView } from 'react-native-safe-area-context'; // Respeta el notch y la barra del sistema

import { CustomButton } from '@/components/CustomButton'; // Botón del diseño Orby
import { CustomInput } from '@/components/CustomInput'; // Campo con etiqueta y ojito para contraseña
import { OrbyLogo } from '@/components/OrbyLogo'; // Logo de la taza en órbita
import { useAuth } from '@/context/auth-context'; // Sesión y roles
import { validar_correo } from '@/lib/auth'; // Validación de correo
import { espaciado, fuentes, tipografia, useTema } from '@/theme'; // Tema activo y tokens
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)

// PANTALLA DE INICIO DE SESIÓN ("/login")
// Un solo login para los 3 roles. Al entrar, se lee el rol en public.usuario
// y se manda a cada quien a su panel: administrador, mesero o cocina.
// El registro de cafeterías nuevas está en otra pantalla: src/app/registro.tsx
export default function LoginScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { iniciarSesion } = useAuth();

  // Datos del formulario
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

  // Estado de la pantalla
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // Valida los campos, inicia sesión y redirige según el rol
  const handleIniciarSesion = async () => {
    if (!validar_correo(correo)) {
      setErrorMensaje('Escribe un correo válido, por ejemplo nombre@ejemplo.com.');
      return;
    }

    if (!contrasena) {
      setErrorMensaje('Escribe tu contraseña.');
      return;
    }

    setErrorMensaje(null);
    setCargando(true);

    try {
      const resultado = await iniciarSesion(correo, contrasena);

      if (resultado.exito && resultado.rol) {
        // Redirigir según el rol real obtenido del perfil (tabla usuario -> id_rol)
        if (resultado.rol === 'administrador') {
          router.replace('/(admin)' as any);
        } else if (resultado.rol === 'cocina') {
          router.replace('/(cocina)' as any);
        } else if (resultado.rol === 'mesero') {
          router.replace('/(mesero)' as any);
        }
      } else {
        setErrorMensaje(resultado.error ?? 'Correo o contraseña incorrectos.');
      }
    } catch {
      setErrorMensaje('Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  // La contraseña la restablece el administrador (no hay recuperación por correo todavía)
  const handleOlvidoContrasena = () => {
    mostrarAviso(
      '¿Olvidaste tu contraseña?',
      'Por favor contacta al administrador de tu cafetería para restablecer tu contraseña.',
      [{ text: 'Entendido' }]
    );
  };

  // Explica cómo obtienen su cuenta los meseros y cocina
  const handleContactarAdmin = () => {
    mostrarAviso(
      'Acceso de personal',
      'Las cuentas para meseros y cocina las da de alta el Administrador desde el apartado "Personal" de su panel.',
      [{ text: 'Aceptar' }]
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background_auth }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled" // Permite tocar botones sin cerrar antes el teclado
          showsVerticalScrollIndicator={false}
        >
          {/* Logo de Orby */}
          <View style={estilos.logoContenedor}>
            <OrbyLogo size={130} showText={false} />
          </View>

          {/* Bienvenida */}
          <View style={estilos.encabezado}>
            <Text style={[estilos.titulo, { color: colores.text }]}>Bienvenido a Orby</Text>
            <Text style={[estilos.subtitulo, { color: colores.text_secondary }]}>Tu cafetería en órbita</Text>
          </View>

          <View style={estilos.formulario}>
            {/* Mensaje de error */}
            {errorMensaje && (
              <View style={[estilos.cajaError, { backgroundColor: colores.danger_soft }]}>
                <Ionicons name="alert-circle" size={18} color={colores.danger} style={{ marginRight: 6 }} />
                <Text style={[estilos.errorTexto, { color: colores.danger }]}>{errorMensaje}</Text>
              </View>
            )}

            <CustomInput
              label="Correo electrónico"
              placeholder="usuario@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none" // Evita la mayúscula automática al inicio del correo
              autoCorrect={false}
              autoComplete="email"
              value={correo}
              onChangeText={(texto) => {
                setCorreo(texto);
                setErrorMensaje(null);
              }}
              variante="relleno"
            />

            <CustomInput
              label="Contraseña"
              placeholder="••••••••"
              esContrasena // Agrega el ojito para mostrar u ocultar
              autoCapitalize="none"
              autoComplete="current-password"
              value={contrasena}
              onChangeText={(texto) => {
                setContrasena(texto);
                setErrorMensaje(null);
              }}
              onSubmitEditing={handleIniciarSesion} // Enter en el teclado también inicia sesión
              variante="relleno"
            />

            <CustomButton
              titulo="Iniciar sesión"
              variante="dark"
              cargando={cargando}
              onPress={handleIniciarSesion}
              estilo={estilos.botonAccion}
            />

            <TouchableOpacity activeOpacity={0.7} onPress={handleOlvidoContrasena} style={estilos.enlaceOlvido}>
              <Text style={[estilos.textoOlvido, { color: colores.text }]}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Separador */}
            <View style={[estilos.separador, { backgroundColor: colores.border }]} />

            {/* Registro de cafetería nueva (solo para dueños / administradores) */}
            <Text style={[estilos.textoPie, { color: colores.text_secondary }]}>
              ¿Tienes una cafetería y aún no tienes cuenta?
            </Text>

            <CustomButton
              titulo="Registrar mi cafetería"
              variante="outline"
              onPress={() => router.push('/registro' as any)}
              estilo={estilos.botonRegistro}
            />

            {/* Empleados: su cuenta la crea el administrador */}
            <Text style={[estilos.textoPie, { color: colores.text_muted, marginTop: espaciado.md }]}>
              ¿Eres empleado sin cuenta?{' '}
              <Text onPress={handleContactarAdmin} style={[estilos.enlace, { color: colores.primary }]}>
                Contacta al administrador
              </Text>
            </Text>

            {/* Acceso al laboratorio visual, solo en desarrollo */}
            {__DEV__ && (
              <TouchableOpacity onPress={() => router.push('/lab')} style={estilos.enlaceLab}>
                <Text style={[tipografia.micro, { color: colores.text_muted }]}>Abrir laboratorio de diseño (/lab)</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ESTILOS
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
    marginTop: 6,
    marginBottom: espaciado.xs,
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: espaciado.lg,
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: fuentes.medium,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  formulario: {
    width: '100%',
    maxWidth: 360, // En el navegador o en tableta no se estira de lado a lado
  },
  cajaError: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: espaciado.sm,
  },
  errorTexto: {
    fontFamily: fuentes.medium,
    fontSize: 13,
    flex: 1,
  },
  botonAccion: {
    marginTop: espaciado.xs,
    height: 52,
    borderRadius: 12,
  },
  enlaceOlvido: {
    alignItems: 'center',
    marginTop: espaciado.md,
    paddingVertical: espaciado.xs,
  },
  textoOlvido: {
    fontFamily: fuentes.medium,
    fontSize: 14,
  },
  separador: {
    height: 1,
    marginVertical: espaciado.lg,
  },
  textoPie: {
    fontFamily: fuentes.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  botonRegistro: {
    marginTop: espaciado.sm,
    height: 52,
    borderRadius: 12,
  },
  enlace: {
    fontFamily: fuentes.bold,
  },
  enlaceLab: {
    alignItems: 'center',
    marginTop: espaciado.md,
    padding: espaciado.xs,
  },
});
