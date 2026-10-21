import { Ionicons } from '@expo/vector-icons'; // Íconos (alerta de error)
import { useRouter } from 'expo-router'; // Navegación de Expo Router
import React, { useState } from 'react'; // Estado de React
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'; // Componentes base
import { SafeAreaView } from 'react-native-safe-area-context'; // Respeta el notch y la barra del sistema

import { CustomButton } from '@/components/CustomButton'; // Botón del diseño Orby
import { CustomInput } from '@/components/CustomInput'; // Campo con etiqueta y ojito para contraseña
import { OrbyLogo } from '@/components/OrbyLogo'; // Logo de la taza en órbita
import { useAuth } from '@/context/auth-context'; // Registro del administrador
import { LARGO_MINIMO_CONTRASENA, validar_contrasena, validar_correo } from '@/lib/auth'; // Validaciones
import { espaciado, fuentes, useTema } from '@/theme'; // Tema activo y tokens

// TIPOS
// Un mensaje de error por campo; vacío = sin errores
type ErroresFormulario = Partial<Record<'nombre' | 'nombre_cafeteria' | 'correo' | 'contrasena', string>>;

// PANTALLA DE REGISTRO DEL ADMINISTRADOR ("/registro")
// El dueño crea su cuenta de administrador y su cafetería al mismo tiempo.
// La función handle_new_user de la base de datos recibe los datos y:
//   1. Guarda el correo y la contraseña cifrada en auth.users
//   2. Crea la cafetería en public.cafeteria
//   3. Crea el perfil en public.usuario con rol administrador y el mismo UUID
export default function RegistroScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { registrarAdministrador } = useAuth();

  // Datos del formulario
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [nombreCafeteria, setNombreCafeteria] = useState('');

  // Estado de la pantalla
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Revisa cada campo y devuelve los errores encontrados
  const validar = (): ErroresFormulario => {
    const encontrados: ErroresFormulario = {};

    if (nombre.trim().length < 3) {
      encontrados.nombre = 'Escribe tu nombre completo.';
    }

    if (!validar_correo(correo)) {
      encontrados.correo = 'Escribe un correo válido.';
    }

    const errorContrasena = validar_contrasena(contrasena, confirmacion);
    if (errorContrasena) {
      encontrados.contrasena = errorContrasena;
    }

    if (nombreCafeteria.trim().length < 2) {
      encontrados.nombre_cafeteria = 'Escribe el nombre de tu cafetería.';
    }

    return encontrados;
  };

  // Valida y manda el registro a Supabase
  const handleRegistrar = async () => {
    setErrorGeneral(null);

    const encontrados = validar();
    setErrores(encontrados);

    // Si hay al menos un error, no se envía nada
    if (Object.keys(encontrados).length > 0) {
      return;
    }

    setCargando(true);
    const resultado = await registrarAdministrador({
      nombre,
      nombreCafeteria,
      correo,
      contrasena,
    });
    setCargando(false);

    if (!resultado.exito) {
      setErrorGeneral(resultado.error ?? 'No se pudo completar el registro.');
      return;
    }

    // La sesión del administrador ya quedó iniciada: directo a su panel
    router.replace('/(admin)' as any);
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background_auth }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo de Orby (más pequeño que en el login) */}
          <View style={estilos.logoContenedor}>
            <OrbyLogo size={100} showText={false} />
          </View>

          <View style={estilos.formulario}>
            {/* Encabezado */}
            <View style={estilos.encabezado}>
              <Text style={[estilos.titulo, { color: colores.text }]}>Registra tu cafetería</Text>
              <Text style={[estilos.subtitulo, { color: colores.text_secondary }]}>
                Crearás la cuenta de administrador. Después podrás dar de alta a tus meseros y a cocina.
              </Text>
            </View>

            {/* Sección 1: datos del administrador */}
            <Text style={[estilos.seccion, { color: colores.primary_strong }]}>Tus datos</Text>

            <CustomInput
              label="Nombre completo"
              obligatorio
              placeholder="Ej. Ana López"
              autoCapitalize="words"
              autoComplete="name"
              value={nombre}
              onChangeText={setNombre}
              error={errores.nombre}
              variante="relleno"
            />

            <CustomInput
              label="Correo electrónico"
              obligatorio
              placeholder="nombre@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={correo}
              onChangeText={setCorreo}
              error={errores.correo}
              variante="relleno"
            />

            <CustomInput
              label="Contraseña"
              obligatorio
              placeholder={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres`}
              esContrasena
              autoCapitalize="none"
              autoComplete="new-password"
              value={contrasena}
              onChangeText={setContrasena}
              error={errores.contrasena}
              variante="relleno"
            />

            <CustomInput
              label="Confirmar contraseña"
              obligatorio
              placeholder="Escríbela otra vez"
              esContrasena
              autoCapitalize="none"
              autoComplete="new-password"
              value={confirmacion}
              onChangeText={setConfirmacion}
              variante="relleno"
            />

            {/* Sección 2: datos de la cafetería */}
            <Text style={[estilos.seccion, { color: colores.primary_strong }]}>Tu cafetería</Text>

            <CustomInput
              label="Nombre de la cafetería"
              obligatorio
              placeholder="Ej. Café Orbital"
              autoCapitalize="words"
              value={nombreCafeteria}
              onChangeText={setNombreCafeteria}
              error={errores.nombre_cafeteria}
              variante="relleno"
            />

            {/* Error general (por ejemplo, correo ya registrado o sin conexión) */}
            {errorGeneral && (
              <View style={[estilos.cajaError, { backgroundColor: colores.danger_soft }]}>
                <Ionicons name="alert-circle" size={18} color={colores.danger} style={{ marginRight: 6 }} />
                <Text style={[estilos.errorTexto, { color: colores.danger }]}>{errorGeneral}</Text>
              </View>
            )}

            <CustomButton
              titulo="Crear cuenta y cafetería"
              variante="primary"
              cargando={cargando}
              onPress={handleRegistrar}
              estilo={estilos.boton}
            />

            <CustomButton
              titulo="Ya tengo cuenta"
              variante="outline"
              onPress={() => router.replace('/login')}
              estilo={estilos.boton}
            />
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
    flexGrow: 1,
  },
  logoContenedor: {
    alignItems: 'center',
    marginTop: 6,
  },
  formulario: {
    width: '100%',
    maxWidth: 360,
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: espaciado.md,
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
  seccion: {
    fontFamily: fuentes.bold,
    fontSize: 17,
    marginTop: espaciado.sm,
    marginBottom: espaciado.sm,
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
  boton: {
    height: 52,
    borderRadius: 12,
  },
});
