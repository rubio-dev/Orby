import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { MetricCard } from '@/components/MetricCard';
import { UserHeader } from '@/components/UserHeader';
import { useAuth } from '@/context/auth-context';
import { useCatalog } from '@/context/catalog-context';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)

export default function AdminHomeScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { estadisticas } = useCatalog();

  const handleDescargarReporte = () => {
    mostrarAviso(
      'Descargar reporte',
      'El reporte diario de ventas y pedidos ha sido generado en formato PDF/Excel.',
      [{ text: 'Aceptar' }]
    );
  };

  const nombreAdmin = usuario?.nombre ?? 'Gael';

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado con avatar, saludo y rol */}
        <UserHeader nombre={nombreAdmin} rol="Administrador" tamanoAvatar={96} />

        {/* Tarjetas de métricas del día */}
        <View style={estilos.filaMetricas}>
          <MetricCard
            titulo={'Ventas totales\ndiarias'}
            valor={`$${estadisticas.ventas_totales_diarias.toLocaleString()}`}
            cambioPorcentual={estadisticas.porcentaje_cambio_ventas}
          />

          <MetricCard
            titulo={'Pedidos\ndiarios'}
            valor={estadisticas.pedidos_diarios}
            cambioPorcentual={estadisticas.porcentaje_cambio_pedidos}
          />
        </View>

        {/* Tabla: Productos más vendidos */}
        <View style={estilos.seccionTabla}>
          <View style={[estilos.tablaContenedor, { backgroundColor: colores.surface }]}>
            {/* Cabecera de la tabla */}
            <View style={estilos.tablaCabecera}>
              <Text style={estilos.tablaTitulo}>Productos más vendidos</Text>
            </View>

            {/* Filas con datos */}
            {estadisticas.productos_mas_vendidos.map((prod) => (
              <View key={prod.posicion} style={estilos.filaTabla}>
                <View style={estilos.celdaPosicion}>
                  <Text style={estilos.textoCelda}>{prod.posicion}.</Text>
                </View>
                <View style={estilos.celdaNombre}>
                  <Text style={estilos.textoCelda}>{prod.nombre}</Text>
                </View>
                <View style={estilos.celdaCantidad}>
                  <Text style={estilos.textoCelda}>{prod.cantidad}</Text>
                </View>
              </View>
            ))}

            {/* Filas vacías estéticas como en el mockup */}
            <View style={estilos.filaTabla}>
              <View style={estilos.celdaPosicion} />
              <View style={estilos.celdaNombre} />
              <View style={estilos.celdaCantidad} />
            </View>
            <View style={[estilos.filaTabla, { borderBottomWidth: 0 }]}>
              <View style={estilos.celdaPosicion} />
              <View style={estilos.celdaNombre} />
              <View style={estilos.celdaCantidad} />
            </View>
          </View>
        </View>

        {/* Botón Descargar reporte */}
        <View style={estilos.seccionAcciones}>
          <CustomButton
            titulo="Descargar reporte"
            variante="primary"
            onPress={handleDescargarReporte}
            estilo={estilos.botonReporte}
          />

          {/* Tarjeta de acceso rápido a registrar cocineros y meseros */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(admin)/staff')}
            style={[
              estilos.tarjetaPersonal,
              { backgroundColor: colores.primary_soft, borderColor: colores.border_strong },
            ]}
          >
            <View style={estilos.iconoPersonalContenedor}>
              <Ionicons name="people" size={28} color={colores.primary_strong} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[tipografia.cuerpo_fuerte, { color: colores.primary_strong }]}>
                Gestión de Personal
              </Text>
              <Text style={[tipografia.detalle, { color: colores.text_secondary }]}>
                Registrar nuevos cocineros y meseros
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colores.primary_strong} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Barra de navegación inferior */}
      <AdminBottomNav activa="inicio" />
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
  },
  filaMetricas: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.sm,
    marginBottom: espaciado.lg,
  },
  seccionTabla: {
    marginVertical: espaciado.sm,
  },
  tablaContenedor: {
    borderWidth: 2,
    borderColor: '#1A1D1C',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tablaCabecera: {
    borderBottomWidth: 2,
    borderColor: '#1A1D1C',
    paddingVertical: 10,
    paddingHorizontal: espaciado.md,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tablaTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    color: '#1A1D1C',
  },
  filaTabla: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderColor: '#1A1D1C',
    minHeight: 34,
  },
  celdaPosicion: {
    width: 60,
    borderRightWidth: 1.5,
    borderColor: '#1A1D1C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  celdaNombre: {
    flex: 1,
    borderRightWidth: 1.5,
    borderColor: '#1A1D1C',
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
    paddingVertical: 4,
  },
  celdaCantidad: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  textoCelda: {
    fontFamily: fuentes.bold,
    fontSize: 17,
    color: '#1A1D1C',
  },
  seccionAcciones: {
    marginTop: espaciado.xl,
    gap: espaciado.md,
  },
  botonReporte: {
    height: 52,
    borderRadius: 26,
  },
  tarjetaPersonal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1,
    gap: espaciado.md,
    marginTop: espaciado.xs,
  },
  iconoPersonalContenedor: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

