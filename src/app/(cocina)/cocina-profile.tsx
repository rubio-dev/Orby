import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CocinaBottomNav } from '@/components/CocinaBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { CustomInput } from '@/components/CustomInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/auth-context';
import { confirmarAccion, mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby
import { espaciado, fuentes, useTema } from '@/theme';

export default function CocinaProfileScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario, cerrarSesion } = useAuth();

  const [correo] = useState(usuario?.correo ?? 'cocina@orby.com');
  const [contrasena, setContrasena] = useState('password123');

  const nombreCocinero = usuario?.nombre ?? 'Emilio Sánchez';

  const handleCambiarContrasena = () => {
    mostrarAviso('Cambiar contraseña', 'Contraseña actualizada con éxito.', [{ text: 'OK' }]);
  };

  const handleCerrarSesion = () => {
    confirmarAccion({
      titulo: 'Cerrar sesión',
      mensaje: '¿Estás seguro de que deseas salir del panel de cocina?',
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
      <ScreenHeader
        titulo="Mi cuenta"
        onBack={() => router.push('/(cocina)' as any)}
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
          {/* Avatar circular */}
          <View style={estilos.avatarContenedor}>
            <View style={[estilos.avatarCirculo, { backgroundColor: '#388D7A' }]}>
              <Ionicons name="restaurant" size={90} color="#FFFFFF" style={estilos.iconoAvatar} />
            </View>
          </View>

          {/* Nombre de usuario */}
          <Text style={[estilos.nombre, { color: colores.text }]}>
            {nombreCocinero}
          </Text>

          {/* Formulario */}
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

      <CocinaBottomNav activa="perfil" />
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
    justifyContent: 'center',
  },
  iconoAvatar: {},
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
