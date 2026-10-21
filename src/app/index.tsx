import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { OrbyLogo } from '@/components/OrbyLogo';
import { useAuth } from '@/context/auth-context';
import { espaciado, fuentes, tipografia, useTema } from '@/theme';

const { width } = Dimensions.get('window');

export default function GeneralWelcomeScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();

  const handleComenzar = () => {
    if (usuario) {
      if (usuario.rol === 'administrador') {
        router.push('/(admin)' as any);
      } else if (usuario.rol === 'mesero') {
        router.push('/(mesero)' as any);
      } else if (usuario.rol === 'cocina') {
        router.push('/(cocina)' as any);
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background_auth }]}>
      <View style={estilos.contenedorContenido}>
        {/* Espacio superior */}
        <View style={estilos.superior} />

        {/* Logotipo principal Orby */}
        <View style={estilos.logoSeccion}>
          <OrbyLogo size={190} showText={true} textColor={colores.text} />
        </View>

        {/* Lema y descripción */}
        <View style={estilos.textosSeccion}>
          <Text style={[estilos.lemaPrincipal, { color: colores.text }]}>
            Tu cafetería en órbita
          </Text>

          <Text style={[estilos.descripcion, { color: colores.text }]}>
            Conecta personas,{'\n'}comandas y sabor.
          </Text>
        </View>

        {/* Botón de acceso directo */}
        <View style={estilos.botonSeccion}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleComenzar}
            style={[
              estilos.botonEntrar,
              { backgroundColor: colores.primary, shadowColor: colores.shadow },
            ]}
          >
            <Text style={[estilos.textoBotonEntrar, { color: colores.on_primary }]}>
              {usuario ? `Continuar (${usuario.nombre})` : 'Comenzar'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colores.on_primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {usuario && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/login')}
              style={estilos.enlaceCambiarCuenta}
            >
              <Text style={[tipografia.etiqueta, { color: colores.text_secondary }]}>
                Cambiar de usuario o iniciar sesión
              </Text>
            </TouchableOpacity>
          )}

          {__DEV__ && (
            <TouchableOpacity
              onPress={() => router.push('/lab')}
              style={estilos.enlaceLab}
            >
              <Text style={[tipografia.micro, { color: colores.text_muted }]}>
                Abrir laboratorio de diseño (/lab)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Decoración de ondas inferiores del mockup */}
      <View style={estilos.ondasContenedor} pointerEvents="none">
        <Svg width={width} height={140} viewBox="0 0 390 140" fill="none">
          <Path
            d="M-20 80 C 60 40 160 100 240 60 C 310 25 360 45 420 20 L 420 150 L -20 150 Z"
            fill={colores.primary}
            opacity={0.9}
          />
          <Path
            d="M-30 110 C 70 65 190 90 280 50 C 340 20 380 40 430 35 L 430 150 L -30 150 Z"
            fill={colores.primary_strong}
          />
        </Svg>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    position: 'relative',
  },
  contenedorContenido: {
    flex: 1,
    paddingHorizontal: espaciado.pantalla,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
    paddingBottom: 40,
  },
  superior: {
    height: 30,
  },
  logoSeccion: {
    alignItems: 'center',
    marginTop: 20,
  },
  textosSeccion: {
    alignItems: 'center',
    marginVertical: espaciado.xl,
  },
  lemaPrincipal: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: espaciado.lg,
  },
  descripcion: {
    fontFamily: fuentes.regular,
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
  botonSeccion: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 60,
  },
  botonEntrar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: espaciado.xxl,
    borderRadius: 26,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  textoBotonEntrar: {
    fontFamily: fuentes.bold,
    fontSize: 17,
  },
  enlaceCambiarCuenta: {
    marginTop: espaciado.sm,
    padding: espaciado.xs,
  },
  enlaceLab: {
    marginTop: espaciado.sm,
    padding: espaciado.xs,
  },
  ondasContenedor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
