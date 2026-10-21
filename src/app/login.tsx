import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components/CustomButton';
import { CustomInput } from '@/components/CustomInput';
import { OrbyLogo } from '@/components/OrbyLogo';
import { useAuth } from '@/context/auth-context';
import { espaciado, fuentes, tipografia, useTema } from '@/theme';
import type { RolUsuario } from '@/types';

type ModoPantalla = 'iniciar_sesion' | 'registrar_admin';

export default function LoginScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { iniciarSesion, registrarAdministrador, seleccionarUsuarioDemo } = useAuth();

  const [modo, setModo] = useState<ModoPantalla>('iniciar_sesion');

  // Campos de inicio de sesión
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

  // Campos de registro de Administrador y Cafetería
  const [nombreAdmin, setNombreAdmin] = useState('');
  const [nombreCafeteria, setNombreCafeteria] = useState('');
  const [correoAdmin, setCorreoAdmin] = useState('');
  const [contrasenaAdmin, setContrasenaAdmin] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // Iniciar sesión compartido para todos los roles
  const handleIniciarSesion = async () => {
    if (!correo.trim() || !contrasena.trim()) {
      setErrorMensaje('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setErrorMensaje(null);
    setCargando(true);

    try {
      const resultado = await iniciarSesion(correo, contrasena);

      if (resultado.exito && resultado.rol) {
        // Redirigir según el rol real obtenido del perfil autenticado
        if (resultado.rol === 'administrador') {
          router.replace('/(admin)' as any);
        } else if (resultado.rol === 'cocina') {
          router.replace('/(cocina)' as any);
        } else if (resultado.rol === 'mesero') {
          router.replace('/(mesero)' as any);
        }
      } else {
        setErrorMensaje(resultado.error ?? 'Credenciales incorrectas');
      }
    } catch {
      setErrorMensaje('Ocurrió un error al intentar iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  // Registro real del Administrador y Cafetería en Supabase
  const handleRegistrarAdministrador = async () => {
    if (
      !nombreAdmin.trim() ||
      !nombreCafeteria.trim() ||
      !correoAdmin.trim() ||
      !contrasenaAdmin.trim() ||
      !confirmarContrasena.trim()
    ) {
      setErrorMensaje('Por favor completa todos los campos del registro.');
      return;
    }

    if (contrasenaAdmin.length < 6) {
      setErrorMensaje('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (contrasenaAdmin !== confirmarContrasena) {
      setErrorMensaje('Las contraseñas no coinciden.');
      return;
    }

    setErrorMensaje(null);
    setCargando(true);

    try {
      const resultado = await registrarAdministrador({
        nombre: nombreAdmin,
        nombreCafeteria: nombreCafeteria,
        correo: correoAdmin,
        contrasena: contrasenaAdmin,
      });

      if (resultado.exito) {
        Alert.alert(
          '¡Registro exitoso!',
          `Bienvenido a Orby. Tu cafetería "${nombreCafeteria.trim()}" y cuenta de Administrador han sido registradas.`,
          [
            {
              text: 'Entrar al panel',
              onPress: () => router.replace('/(admin)' as any),
            },
          ]
        );
      } else {
        setErrorMensaje(resultado.error ?? 'No se pudo completar el registro del administrador.');
      }
    } catch (err: any) {
      setErrorMensaje(err?.message ?? 'Ocurrió un error al procesar el registro.');
    } finally {
      setCargando(false);
    }
  };

  const handleAccesoRapido = async (rol: RolUsuario) => {
    setCargando(true);
    await seleccionarUsuarioDemo(rol);
    setCargando(false);

    if (rol === 'administrador') {
      router.replace('/(admin)' as any);
    } else if (rol === 'mesero') {
      router.replace('/(mesero)' as any);
    } else if (rol === 'cocina') {
      router.replace('/(cocina)' as any);
    }
  };

  const handleOlvidoContrasena = () => {
    Alert.alert(
      '¿Olvidaste tu contraseña?',
      'Por favor contacta al administrador de tu cafetería para restablecer tu contraseña.',
      [{ text: 'Entendido' }]
    );
  };

  const handleContactarAdmin = () => {
    Alert.alert(
      'Acceso de personal',
      'Las cuentas para meseros y cocineros son dadas de alta directamente por el Administrador desde el apartado "Personal" en su panel.',
      [{ text: 'Aceptar' }]
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: '#EEF4F2' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo compacto superior */}
          <View style={estilos.logoContenedor}>
            <OrbyLogo size={130} showText={false} />
          </View>

          {/* Título de bienvenida */}
          <View style={estilos.encabezado}>
            <Text style={[estilos.titulo, { color: '#0F1412' }]}>
              {modo === 'iniciar_sesion' ? 'Bienvenido a Orby' : 'Nueva Cafetería'}
            </Text>
            <Text style={[estilos.subtitulo, { color: colores.text_secondary }]}>
              {modo === 'iniciar_sesion'
                ? 'Tu cafetería en órbita'
                : 'Registra tu cuenta de administrador'}
            </Text>
          </View>

          {/* Selector de modo: Iniciar sesión vs Registrar Administrador */}
          <View style={estilos.pestañasContenedor}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setModo('iniciar_sesion');
                setErrorMensaje(null);
              }}
              style={[
                estilos.pestañaBoton,
                modo === 'iniciar_sesion' && estilos.pestañaActiva,
              ]}
            >
              <Text
                style={[
                  estilos.pestañaTexto,
                  {
                    color:
                      modo === 'iniciar_sesion' ? '#FFFFFF' : colores.text_secondary,
                    fontWeight: modo === 'iniciar_sesion' ? '700' : '500',
                  },
                ]}
              >
                Iniciar sesión
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setModo('registrar_admin');
                setErrorMensaje(null);
              }}
              style={[
                estilos.pestañaBoton,
                modo === 'registrar_admin' && estilos.pestañaActiva,
              ]}
            >
              <Text
                style={[
                  estilos.pestañaTexto,
                  {
                    color:
                      modo === 'registrar_admin' ? '#FFFFFF' : colores.text_secondary,
                    fontWeight: modo === 'registrar_admin' ? '700' : '500',
                  },
                ]}
              >
                Registrar Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={estilos.formulario}>
            {errorMensaje && (
              <View style={estilos.cajaError}>
                <Ionicons name="alert-circle" size={18} color="#D93838" style={{ marginRight: 6 }} />
                <Text style={[estilos.errorTexto, { color: '#D93838' }]}>
                  {errorMensaje}
                </Text>
              </View>
            )}

            {modo === 'iniciar_sesion' ? (
              // VISTA 1: INICIAR SESIÓN (COMPARTIDO)
              <>
                <CustomInput
                  label="Correo electrónico"
                  placeholder="usuario@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={correo}
                  onChangeText={(t) => {
                    setCorreo(t);
                    setErrorMensaje(null);
                  }}
                  variante="relleno"
                />

                <CustomInput
                  label="Contraseña"
                  placeholder="••••••••"
                  esContrasena={true}
                  value={contrasena}
                  onChangeText={(t) => {
                    setContrasena(t);
                    setErrorMensaje(null);
                  }}
                  variante="relleno"
                />

                <CustomButton
                  titulo="Iniciar sesión"
                  variante="dark"
                  cargando={cargando}
                  onPress={handleIniciarSesion}
                  estilo={estilos.botonAccion}
                />

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleOlvidoContrasena}
                  style={estilos.enlaceOlvido}
                >
                  <Text style={[estilos.textoOlvido, { color: '#1A1D1C' }]}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>

                {/* Accesos rápidos de demostración */}
                <View style={estilos.seccionDemo}>
                  <Text style={[tipografia.micro, { color: colores.text_muted, textAlign: 'center', marginBottom: 8 }]}>
                    ACCESO RÁPIDO PARA PRUEBAS:
                  </Text>
                  <View style={estilos.filaDemo}>
                    <TouchableOpacity
                      onPress={() => handleAccesoRapido('administrador')}
                      style={[estilos.chipDemo, { backgroundColor: '#388D7A' }]}
                    >
                      <Text style={estilos.textoChipDemo}>Admin</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleAccesoRapido('mesero')}
                      style={[estilos.chipDemo, { backgroundColor: '#388D7A' }]}
                    >
                      <Text style={estilos.textoChipDemo}>Mesero</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleAccesoRapido('cocina')}
                      style={[estilos.chipDemo, { backgroundColor: '#388D7A' }]}
                    >
                      <Text style={estilos.textoChipDemo}>Cocinero</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Enlace para administradores nuevos */}
                <View style={estilos.pie}>
                  <Text style={[estilos.textoPie, { color: colores.text_secondary }]}>
                    ¿Deseas registrar una nueva cafetería?{' '}
                    <Text
                      onPress={() => {
                        setModo('registrar_admin');
                        setErrorMensaje(null);
                      }}
                      style={[estilos.enlaceAdmin, { color: '#2F7D6B' }]}
                    >
                      Regístrate como Administrador
                    </Text>
                  </Text>

                  <Text style={[estilos.textoPie, { color: colores.text_muted, marginTop: 10 }]}>
                    ¿Eres empleado sin cuenta?{' '}
                    <Text
                      onPress={handleContactarAdmin}
                      style={[estilos.enlaceAdmin, { color: '#2F7D6B' }]}
                    >
                      Contacta al administrador
                    </Text>
                  </Text>
                </View>
              </>
            ) : (
              // VISTA 2: REGISTRO DE ADMINISTRADOR Y CAFETERÍA
              <>
                <CustomInput
                  label="Nombre del Administrador"
                  placeholder="Ej. Gael Guzmán"
                  autoCapitalize="words"
                  value={nombreAdmin}
                  onChangeText={(t) => {
                    setNombreAdmin(t);
                    setErrorMensaje(null);
                  }}
                  variante="relleno"
                />

                <CustomInput
                  label="Nombre de la Cafetería"
                  placeholder="Ej. Orby Cafetería"
                  autoCapitalize="words"
                  value={nombreCafeteria}
                  onChangeText={(t) => {
                    setNombreCafeteria(t);
                    setErrorMensaje(null);
                  }}
                  variante="relleno"
                />

                <CustomInput
                  label="Correo electrónico"
                  placeholder="admin@cafeteria.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={correoAdmin}
                  onChangeText={(t) => {
                    setCorreoAdmin(t);
                    setErrorMensaje(null);
                  }}
                  variante="relleno"
                />

                <CustomInput
                  label="Contraseña"
                  placeholder="Mínimo 6 caracteres"
                  esContrasena={true}
                  value={contrasenaAdmin}
                  onChangeText={(t) => {
                    setContrasenaAdmin(t);
                    setErrorMensaje(null);
                  }}
                  variante="relleno"
                />

                <CustomInput
                  label="Confirmar contraseña"
                  placeholder="Repite la contraseña"
                  esContrasena={true}
                  value={confirmarContrasena}
                  onChangeText={(t) => {
                    setConfirmarContrasena(t);
                    setErrorMensaje(null);
                  }}
                  variante="relleno"
                />

                <CustomButton
                  titulo="Registrar Administrador"
                  variante="primary"
                  cargando={cargando}
                  onPress={handleRegistrarAdministrador}
                  estilo={estilos.botonAccion}
                />

                <View style={estilos.pie}>
                  <Text style={[estilos.textoPie, { color: colores.text_secondary }]}>
                    ¿Ya tienes una cuenta registrada?{' '}
                    <Text
                      onPress={() => {
                        setModo('iniciar_sesion');
                        setErrorMensaje(null);
                      }}
                      style={[estilos.enlaceAdmin, { color: '#2F7D6B' }]}
                    >
                      Inicia sesión
                    </Text>
                  </Text>
                </View>
              </>
            )}
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
    marginTop: 6,
    marginBottom: espaciado.xs,
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
  pestañasContenedor: {
    flexDirection: 'row',
    backgroundColor: '#D7E3DF',
    borderRadius: 24,
    padding: 4,
    width: '100%',
    maxWidth: 360,
    marginBottom: espaciado.lg,
  },
  pestañaBoton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pestañaActiva: {
    backgroundColor: '#2F7D6B',
  },
  pestañaTexto: {
    fontFamily: fuentes.semibold,
    fontSize: 14,
  },
  formulario: {
    width: '100%',
    maxWidth: 360,
  },
  cajaError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEC',
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
  seccionDemo: {
    width: '100%',
    maxWidth: 360,
    marginTop: espaciado.lg,
    paddingTop: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: '#D3DDD9',
  },
  filaDemo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  chipDemo: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  textoChipDemo: {
    fontFamily: fuentes.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  pie: {
    marginTop: espaciado.lg,
    marginBottom: espaciado.sm,
    alignItems: 'center',
  },
  textoPie: {
    fontFamily: fuentes.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  enlaceAdmin: {
    fontFamily: fuentes.bold,
  },
});
