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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { CustomInput } from '@/components/CustomInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/auth-context';
import { confirmarAccion } from '@/lib/confirm';
import { espaciado, fuentes, useTema } from '@/theme';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario, cerrarSesion } = useAuth();

  const [correo] = useState(usuario?.correo ?? 'usuario@ejemplo.com');
  const [contrasena, setContrasena] = useState('password123');

  const nombreAdmin = usuario?.nombre ?? 'Gael Guzmán';

  const handleCerrarSesion = () => {
    confirmarAccion({
      titulo: 'Cerrar sesión',
      mensaje: '¿Estás seguro de que deseas salir del panel de administración?',
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

  const handleCambiarContrasena = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Cambiar contraseña',
        'Ingresa tu nueva contraseña:',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Guardar',
            onPress: (nueva) => {
              if (nueva && nueva.length >= 6) {
                setContrasena(nueva);
                Alert.alert('Éxito', 'Contraseña actualizada correctamente.');
              } else {
                Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
              }
            },
          },
        ],
        'secure-text'
      );
    } else {
      Alert.alert('Cambiar contraseña', 'Contraseña actualizada con éxito.', [{ text: 'OK' }]);
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Mi cuenta"
        onBack={() => router.push('/(admin)' as any)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar ilustrado */}
          <View style={estilos.avatarContenedor}>
            <View style={[estilos.avatarCirculo, { backgroundColor: colores.avatar }]}>
              {/* Ilustración de avatar con traje y corbata */}
              <Ionicons name="person" size={110} color={colores.text_secondary} style={estilos.iconoAvatar} />
              <View style={[estilos.corbataBadge, { backgroundColor: colores.danger }]}>
                <Ionicons name="shield-checkmark" size={26} color={colores.on_danger} />
              </View>
            </View>
          </View>

          {/* Nombre de usuario */}
          <Text style={[estilos.nombre, { color: colores.text }]}>
            {nombreAdmin}
          </Text>

          {/* Formulario de información de cuenta */}
          <View style={estilos.formulario}>
            <CustomInput
              label="Correo electrónico"
              value={correo}
              editable={false}
              variante="relleno"
            />

            <CustomInput
              label="Contraseña"
              value={contrasena}
              esContrasena={true}
              onChangeText={setContrasena}
              variante="relleno"
            />

            {/* Botón Cambiar contraseña */}
            <View style={estilos.seccionBoton}>
              <CustomButton
                titulo="Cambiar contraseña"
                variante="primary"
                onPress={handleCambiarContrasena}
                estilo={estilos.botonCambiar}
              />

              <CustomButton
                titulo="Cerrar sesión"
                variante="danger"
                onPress={handleCerrarSesion}
                estilo={[estilos.botonCambiar, { marginTop: espaciado.sm }]}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AdminBottomNav activa="perfil" />
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
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  iconoAvatar: {
    marginBottom: -10,
  },
  corbataBadge: {
    position: 'absolute',
    bottom: 8,
    padding: 4,
    borderRadius: 14,
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
