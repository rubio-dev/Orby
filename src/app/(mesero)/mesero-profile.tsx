import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { MeseroBottomNav } from '@/components/MeseroBottomNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/auth-context';
import { validar_contrasena } from '@/lib/auth';
import { confirmarAccion, mostrarAviso } from '@/lib/confirm';
import { espaciado, fuentes, tipografia, useTema } from '@/theme';

export default function MeseroProfileScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario, cerrarSesion, cambiarContrasena } = useAuth();

  const correo = usuario?.correo ?? '';
  const nombreMesero = usuario?.nombre ?? 'Mesero';

  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeReintento, setMensajeReintento] = useState<string | null>(null);

  const handleCambiarContrasena = async () => {
    const errorValidacion = validar_contrasena(nuevaContrasena, confirmarContrasena);
    if (errorValidacion) {
      setErrorContrasena(errorValidacion);
      mostrarAviso('Contraseña inválida', errorValidacion);
      return;
    }

    setErrorContrasena(null);
    setMensajeReintento(null);
    setGuardando(true);

    try {
      const resultado = await cambiarContrasena(nuevaContrasena, (intentoActual, maxIntentos) => {
        setMensajeReintento(
          `Reintentando conexión con el servidor (intento ${intentoActual} de ${maxIntentos})...`
        );
      });

      if (resultado.exito) {
        setNuevaContrasena('');
        setConfirmarContrasena('');
        mostrarAviso('Éxito', 'Contraseña actualizada correctamente.');
      } else {
        mostrarAviso(
          'No se pudo actualizar',
          resultado.error ??
            'No se pudo conectar al servidor. Verifica tu conexión a internet e inténtalo de nuevo.'
        );
      }
    } finally {
      setGuardando(false);
      setMensajeReintento(null);
    }
  };

  const handleCerrarSesion = () => {
    confirmarAccion({
      titulo: 'Cerrar sesión',
      mensaje: '¿Estás seguro de que deseas salir del panel de mesero?',
      textoConfirmar: 'Salir',
      destructivo: true,
      alConfirmar: async () => {
        try {
          await cerrarSesion();
        } finally {
          router.replace('/login');
        }
      },
    });
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader titulo="Mi cuenta" onBack={() => router.push('/(mesero)' as any)} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar circular */}
          <View style={estilos.avatarContenedor}>
            <View style={[estilos.avatarCirculo, { backgroundColor: colores.primary }]}>
              <Ionicons name="person" size={100} color={colores.on_primary} style={estilos.iconoAvatar} />
            </View>
          </View>

          {/* Nombre de usuario */}
          <Text style={[estilos.nombre, { color: colores.text }]}>{nombreMesero}</Text>

          {/* Formulario */}
          <View style={estilos.formulario}>
            <CustomInput
              label="Correo electrónico"
              value={correo}
              editable={false}
              variante="relleno"
            />

            <CustomInput
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              value={nuevaContrasena}
              esContrasena={true}
              editable={!guardando}
              onChangeText={(texto) => {
                setNuevaContrasena(texto);
                if (errorContrasena) setErrorContrasena(null);
              }}
              variante="relleno"
            />

            <CustomInput
              label="Confirmar contraseña"
              placeholder="Repite la nueva contraseña"
              value={confirmarContrasena}
              esContrasena={true}
              editable={!guardando}
              error={errorContrasena ?? undefined}
              onChangeText={(texto) => {
                setConfirmarContrasena(texto);
                if (errorContrasena) setErrorContrasena(null);
              }}
              variante="relleno"
            />

            {mensajeReintento ? (
              <View style={estilos.contenedorReintento}>
                <ActivityIndicator size="small" color={colores.primary} />
                <Text style={[tipografia.detalle, estilos.textoReintento, { color: colores.text_secondary }]}>
                  {mensajeReintento}
                </Text>
              </View>
            ) : null}

            <View style={estilos.seccionBoton}>
              <CustomButton
                titulo="Cambiar contraseña"
                variante="primary"
                cargando={guardando}
                deshabilitado={guardando}
                onPress={handleCambiarContrasena}
                estilo={estilos.botonCambiar}
              />

              <CustomButton
                titulo="Cerrar sesión"
                variante="danger"
                deshabilitado={guardando}
                onPress={handleCerrarSesion}
                estilo={[estilos.botonCambiar, { marginTop: espaciado.sm }]}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MeseroBottomNav activa="perfil" />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.xl,
    alignItems: 'center',
  },
  avatarContenedor: {
    marginTop: espaciado.md,
    marginBottom: espaciado.sm,
    alignItems: 'center',
  },
  avatarCirculo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconoAvatar: {
    marginBottom: -8,
  },
  nombre: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: espaciado.xl,
  },
  formulario: {
    width: '100%',
    maxWidth: 360,
  },
  contenedorReintento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
    marginBottom: espaciado.sm,
    paddingHorizontal: espaciado.sm,
  },
  textoReintento: {
    textAlign: 'center',
    flexShrink: 1,
  },
  seccionBoton: {
    marginTop: espaciado.md,
    alignItems: 'center',
  },
  botonCambiar: {
    width: '100%',
    maxWidth: 240,
    height: 48,
    borderRadius: 24,
  },
});
