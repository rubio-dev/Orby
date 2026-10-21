import { Ionicons } from '@expo/vector-icons'; // Íconos
import { useRouter } from 'expo-router'; // Navegación de Expo Router
import React, { useState } from 'react'; // Estado de React
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // Componentes base
import { SafeAreaView } from 'react-native-safe-area-context'; // Respeta el notch y la barra del sistema

import { CustomButton } from '@/components/CustomButton'; // Botón del diseño Orby
import { CustomInput } from '@/components/CustomInput'; // Campo con etiqueta y ojito para contraseña
import { ScreenHeader } from '@/components/ScreenHeader'; // Encabezado con flecha de regreso
import { useAuth } from '@/context/auth-context'; // Registro de personal
import { LARGO_MINIMO_CONTRASENA, validar_contrasena, validar_correo } from '@/lib/auth'; // Validaciones
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme'; // Tema activo y tokens

// TIPOS
type RolEmpleado = 'mesero' | 'cocina';
type ErroresFormulario = Partial<Record<'nombre' | 'correo' | 'contrasena', string>>;

// OPCIONES DE ROL (tarjetas seleccionables)
const OPCIONES_ROL: {
  rol: RolEmpleado;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  fondo: string;
}[] = [
  {
    rol: 'mesero',
    titulo: 'Mesero',
    descripcion: 'Toma pedidos y atiende mesas',
    icono: 'receipt-outline',
    color: '#388D7A',
    fondo: '#E8F5F1',
  },
  {
    rol: 'cocina',
    titulo: 'Cocina / Barra',
    descripcion: 'Prepara las comandas',
    icono: 'restaurant-outline',
    color: '#C27803',
    fondo: '#FDF7EB',
  },
];

// PANTALLA PARA REGISTRAR EMPLEADOS ("/(admin)/new-staff")
// El administrador da de alta a un mesero o a cocina/barra de SU cafetería.
// La cuenta se crea en Supabase con la función handle_new_user, ligada a la cafetería del administrador.
export default function NuevoEmpleadoScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { registrarPersonal } = useAuth();

  // Datos del formulario
  const [rol, setRol] = useState<RolEmpleado>('mesero');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  // Estado de la pantalla
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Revisa cada campo y devuelve los errores encontrados
  const validar = (): ErroresFormulario => {
    const encontrados: ErroresFormulario = {};

    if (nombre.trim().length < 3) {
      encontrados.nombre = 'Escribe el nombre completo del empleado.';
    }

    if (!validar_correo(correo)) {
      encontrados.correo = 'Escribe un correo válido.';
    }

    const errorContrasena = validar_contrasena(contrasena, confirmacion);
    if (errorContrasena) {
      encontrados.contrasena = errorContrasena;
    }

    return encontrados;
  };

  // Valida y registra al empleado en Supabase
  const handleRegistrar = async () => {
    setErrorGeneral(null);
    setMensajeExito(null);

    const encontrados = validar();
    setErrores(encontrados);

    if (Object.keys(encontrados).length > 0) {
      return;
    }

    setCargando(true);
    const resultado = await registrarPersonal({ nombre, correo, contrasena, rol });
    setCargando(false);

    if (!resultado.exito) {
      setErrorGeneral(resultado.error ?? 'No se pudo registrar al empleado.');
      return;
    }

    // Éxito: se avisa y se limpia el formulario para registrar a otra persona
    const etiqueta = OPCIONES_ROL.find((opcion) => opcion.rol === rol)?.titulo ?? rol;
    setMensajeExito(
      `${nombre.trim()} quedó registrado como ${etiqueta}. Ya puede iniciar sesión con ${correo.trim().toLowerCase()}.`
    );
    setNombre('');
    setCorreo('');
    setContrasena('');
    setConfirmacion('');
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader titulo="Registrar empleado" onBack={() => router.push('/(admin)/staff' as any)} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[tipografia.cuerpo, { color: colores.text_secondary, marginBottom: espaciado.md }]}>
            Se agregará a tu cafetería. Comparte el correo y la contraseña con tu empleado.
          </Text>

          {/* Selector de rol: la tarjeta elegida se pinta con el color del rol */}
          <Text style={[estilos.label, { color: colores.text }]}>
            Rol <Text style={{ color: colores.danger }}>*</Text>
          </Text>
          <View style={estilos.filaRoles}>
            {OPCIONES_ROL.map((opcion) => {
              const elegido = opcion.rol === rol;

              return (
                <TouchableOpacity
                  key={opcion.rol}
                  activeOpacity={0.8}
                  onPress={() => setRol(opcion.rol)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: elegido }}
                  style={[
                    estilos.cardRol,
                    elegido
                      ? { borderColor: opcion.color, backgroundColor: opcion.fondo }
                      : { borderColor: colores.border_strong, backgroundColor: colores.surface },
                  ]}
                >
                  <Ionicons name={opcion.icono} size={26} color={elegido ? opcion.color : colores.text} />
                  <Text style={[estilos.textoRol, { color: elegido ? opcion.color : colores.text }]}>{opcion.titulo}</Text>
                  <Text style={[tipografia.micro, { color: colores.text_muted, textAlign: 'center' }]}>
                    {opcion.descripcion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <CustomInput
            label="Nombre completo"
            obligatorio
            placeholder="Ej. Juan Pérez"
            autoCapitalize="words"
            value={nombre}
            onChangeText={setNombre}
            error={errores.nombre}
            variante="relleno"
          />

          <CustomInput
            label="Correo electrónico"
            obligatorio
            placeholder="empleado@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
            autoComplete="off" // Que el navegador no la guarde como contraseña del administrador
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
            autoComplete="off"
            value={confirmacion}
            onChangeText={setConfirmacion}
            variante="relleno"
          />

          {/* Error (correo repetido, sin conexión, etc.) */}
          {errorGeneral && (
            <View style={[estilos.caja, { backgroundColor: colores.danger_soft }]}>
              <Ionicons name="alert-circle" size={18} color={colores.danger} style={{ marginRight: 6 }} />
              <Text style={[estilos.textoCaja, { color: colores.danger }]}>{errorGeneral}</Text>
            </View>
          )}

          {/* Confirmación de registro */}
          {mensajeExito && (
            <View style={[estilos.caja, { backgroundColor: colores.primary_soft }]}>
              <Ionicons name="checkmark-circle" size={18} color={colores.primary_strong} style={{ marginRight: 6 }} />
              <Text style={[estilos.textoCaja, { color: colores.primary_strong }]}>{mensajeExito}</Text>
            </View>
          )}

          <CustomButton
            titulo="Registrar empleado"
            variante="primary"
            cargando={cargando}
            onPress={handleRegistrar}
            estilo={estilos.boton}
          />
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
    paddingBottom: espaciado.xxl,
  },
  label: {
    fontFamily: fuentes.bold,
    fontSize: 16,
    marginBottom: espaciado.sm,
  },
  filaRoles: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginBottom: espaciado.lg,
  },
  cardRol: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radios.lg,
    padding: espaciado.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  textoRol: {
    fontFamily: fuentes.bold,
    fontSize: 17,
    marginVertical: 4,
  },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: espaciado.sm,
  },
  textoCaja: {
    fontFamily: fuentes.medium,
    fontSize: 13,
    flex: 1,
  },
  boton: {
    marginTop: espaciado.xs,
    height: 52,
    borderRadius: 12,
  },
});
