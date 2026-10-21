import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { CustomInput } from '@/components/CustomInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { useAuth } from '@/context/auth-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import type { RolUsuario, Usuario } from '@/types';

export default function AdminStaffScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { listaPersonal, registrarPersonal, eliminarPersonal } = useAuth();

  const [tabActual, setTabActual] = useState<'registro' | 'lista'>('registro');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario>('mesero');
  const [cargando, setCargando] = useState(false);

  const handleRegistrar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre completo del empleado.');
      return;
    }
    if (!correo.trim() || !correo.includes('@')) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!contrasena.trim() || contrasena.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCargando(true);
    const resultado = await registrarPersonal({
      nombre: nombre.trim(),
      correo: correo.trim(),
      contrasena: contrasena.trim(),
      rol: rolSeleccionado,
    });
    setCargando(false);

    if (resultado.exito) {
      Alert.alert(
        'Empleado registrado',
        `Se ha registrado exitosamente a ${nombre} con el rol de ${rolSeleccionado}. Ya puede iniciar sesión con sus credenciales.`,
        [
          {
            text: 'Ver lista',
            onPress: () => {
              setNombre('');
              setCorreo('');
              setContrasena('');
              setTabActual('lista');
            },
          },
          {
            text: 'Registrar otro',
            onPress: () => {
              setNombre('');
              setCorreo('');
              setContrasena('');
            },
          },
        ]
      );
    } else {
      Alert.alert('Error en registro', resultado.error ?? 'No se pudo completar el registro.');
    }
  };

  const confirmarEliminar = (empleado: Usuario) => {
    Alert.alert(
      'Eliminar empleado',
      `¿Deseas remover a ${empleado.nombre} del sistema? Ya no podrá acceder a la cafetería.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarPersonal(empleado.id_usuario),
        },
      ]
    );
  };

  const renderItemEmpleado = ({ item }: { item: Usuario }) => {
    const esMesero = item.rol === 'mesero';
    const colorBadge = esMesero ? '#388D7A' : '#C27803';

    return (
      <View style={[estilos.tarjetaEmpleado, { backgroundColor: colores.surface, borderColor: '#1A1D1C' }]}>
        <View style={[estilos.avatarPequeno, { backgroundColor: esMesero ? '#DCEBE6' : '#F7EDD8' }]}>
          <Ionicons
            name={esMesero ? 'receipt-outline' : 'restaurant-outline'}
            size={24}
            color={colorBadge}
          />
        </View>

        <View style={{ flex: 1, marginLeft: espaciado.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaciado.xs }}>
            <Text style={[tipografia.cuerpo_fuerte, { color: colores.text }]}>
              {item.nombre}
            </Text>
            <View style={[estilos.chipRol, { backgroundColor: colorBadge }]}>
              <Text style={estilos.textoChipRol}>{item.rol.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[tipografia.detalle, { color: colores.text_muted, marginTop: 2 }]}>
            {item.correo}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => confirmarEliminar(item)}
          style={estilos.botonEliminar}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={colores.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Gestión de Personal"
        onBack={() => router.push('/(admin)' as any)}
      />

      <View style={estilos.contenido}>
        <SegmentedTabs
          opciones={[
            { id: 'registro', etiqueta: 'Registrar Personal' },
            { id: 'lista', etiqueta: `Equipo (${listaPersonal.length})` },
          ]}
          seleccionada={tabActual}
          alSeleccionar={setTabActual}
          tipo="tabs"
        />

        {tabActual === 'registro' ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={estilos.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[tipografia.cuerpo, { color: colores.text_secondary, marginBottom: espaciado.md }]}>
                Crea cuentas para los meseros y cocineros de tu cafetería. Ellos usarán este correo y contraseña para entrar.
              </Text>

              {/* Nombre completo */}
              <CustomInput
                label="Nombre completo"
                obligatorio
                placeholder="Ej. Liz Morales"
                value={nombre}
                onChangeText={setNombre}
                variante="borde"
              />

              {/* Correo electrónico */}
              <CustomInput
                label="Correo electrónico"
                obligatorio
                placeholder="Ej. liz@orby.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={correo}
                onChangeText={setCorreo}
                variante="borde"
              />

              {/* Contraseña temporal */}
              <CustomInput
                label="Contraseña temporal"
                obligatorio
                placeholder="Mínimo 6 caracteres"
                esContrasena
                value={contrasena}
                onChangeText={setContrasena}
                variante="borde"
              />

              {/* Selector de Rol */}
              <View style={estilos.grupoRol}>
                <Text style={[estilos.label, { color: colores.text }]}>
                  Rol a desempeñar: <Text style={{ color: colores.danger }}>*</Text>
                </Text>
                <View style={estilos.filaRoles}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setRolSeleccionado('mesero')}
                    style={[
                      estilos.cardRol,
                      rolSeleccionado === 'mesero'
                        ? { borderColor: '#388D7A', backgroundColor: '#E8F5F1' }
                        : { borderColor: '#1A1D1C', backgroundColor: colores.surface },
                    ]}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={26}
                      color={rolSeleccionado === 'mesero' ? '#388D7A' : '#1A1D1C'}
                    />
                    <Text
                      style={[
                        estilos.textoRol,
                        { color: rolSeleccionado === 'mesero' ? '#388D7A' : '#1A1D1C' },
                      ]}
                    >
                      Mesero
                    </Text>
                    <Text style={[tipografia.micro, { color: colores.text_muted, textAlign: 'center' }]}>
                      Toma pedidos y atiende mesas
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setRolSeleccionado('cocina')}
                    style={[
                      estilos.cardRol,
                      rolSeleccionado === 'cocina'
                        ? { borderColor: '#C27803', backgroundColor: '#FDF7EB' }
                        : { borderColor: '#1A1D1C', backgroundColor: colores.surface },
                    ]}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={26}
                      color={rolSeleccionado === 'cocina' ? '#C27803' : '#1A1D1C'}
                    />
                    <Text
                      style={[
                        estilos.textoRol,
                        { color: rolSeleccionado === 'cocina' ? '#C27803' : '#1A1D1C' },
                      ]}
                    >
                      Cocinero
                    </Text>
                    <Text style={[tipografia.micro, { color: colores.text_muted, textAlign: 'center' }]}>
                      Prepara comandas en cocina
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón de acción */}
              <CustomButton
                titulo="Registrar Empleado"
                variante="primary"
                cargando={cargando}
                onPress={handleRegistrar}
                estilo={{ marginTop: espaciado.md }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          /* Lista de personal registrado */
          <FlatList
            data={listaPersonal}
            keyExtractor={(item) => item.id_usuario}
            renderItem={renderItemEmpleado}
            contentContainerStyle={estilos.listaEquipo}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={estilos.vacio}>
                <Text style={[tipografia.cuerpo, { color: colores.text_muted }]}>
                  No hay personal registrado aún
                </Text>
              </View>
            }
          />
        )}
      </View>

      <AdminBottomNav activa="personal" />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    flex: 1,
    paddingHorizontal: espaciado.pantalla,
  },
  scroll: {
    paddingBottom: espaciado.xxl,
  },
  grupoRol: {
    marginVertical: espaciado.sm,
  },
  label: {
    fontFamily: fuentes.bold,
    fontSize: 16,
    marginBottom: espaciado.sm,
  },
  filaRoles: {
    flexDirection: 'row',
    gap: espaciado.md,
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
  listaEquipo: {
    paddingBottom: espaciado.xxl,
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  tarjetaEmpleado: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1.5,
  },
  avatarPequeno: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRol: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  textoChipRol: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  botonEliminar: {
    padding: espaciado.xs,
  },
  vacio: {
    padding: espaciado.xxl,
    alignItems: 'center',
  },
});
