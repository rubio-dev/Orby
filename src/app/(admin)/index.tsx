import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { MetricCard } from '@/components/MetricCard';
import { UserHeader } from '@/components/UserHeader';
import { useAuth } from '@/context/auth-context';
import { useCatalog } from '@/context/catalog-context';
import { espaciado, fuentes, useTema } from '@/theme';
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)

export default function AdminHomeScreen() {
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { estadisticas } = useCatalog();

  const bordeTabla = { borderColor: colores.text };

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
          <View style={[estilos.tablaContenedor, { backgroundColor: colores.surface, borderColor: colores.text }]}>
            {/* Cabecera de la tabla */}
            <View style={[estilos.tablaCabecera, { borderColor: colores.text, backgroundColor: colores.surface }]}>
              <Text style={[estilos.tablaTitulo, { color: colores.text }]}>Productos más vendidos</Text>
            </View>

            {/* Filas con datos */}
            {estadisticas.productos_mas_vendidos.map((prod) => (
              <View key={prod.posicion} style={[estilos.filaTabla, bordeTabla]}>
                <View style={[estilos.celdaPosicion, bordeTabla]}>
                  <Text style={[estilos.textoCelda, { color: colores.text }]}>{prod.posicion}.</Text>
                </View>
                <View style={[estilos.celdaNombre, bordeTabla]}>
                  <Text style={[estilos.textoCelda, { color: colores.text }]}>{prod.nombre}</Text>
                </View>
                <View style={estilos.celdaCantidad}>
                  <Text style={[estilos.textoCelda, { color: colores.text }]}>{prod.cantidad}</Text>
                </View>
              </View>
            ))}

            {/* Filas vacías estéticas como en el mockup */}
            <View style={[estilos.filaTabla, bordeTabla]}>
              <View style={[estilos.celdaPosicion, bordeTabla]} />
              <View style={[estilos.celdaNombre, bordeTabla]} />
              <View style={estilos.celdaCantidad} />
            </View>
            <View style={[estilos.filaTabla, bordeTabla, { borderBottomWidth: 0 }]}>
              <View style={[estilos.celdaPosicion, bordeTabla]} />
              <View style={[estilos.celdaNombre, bordeTabla]} />
              <View style={estilos.celdaCantidad} />
            </View>
          </View>
        </View>

        {/* Botón Descargar reporte (la gestión de personal está en la pestaña "Personal" de la barra inferior) */}
        <View style={estilos.seccionAcciones}>
          <CustomButton
            titulo="Descargar reporte"
            variante="primary"
            onPress={handleDescargarReporte}
            estilo={estilos.botonReporte}
          />

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
    borderRadius: 2,
    overflow: 'hidden',
  },
  tablaCabecera: {
    borderBottomWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: espaciado.md,
    alignItems: 'center',
  },
  tablaTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
  },
  filaTabla: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    minHeight: 34,
  },
  celdaPosicion: {
    width: 60,
    borderRightWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  celdaNombre: {
    flex: 1,
    borderRightWidth: 1.5,
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
  },
  seccionAcciones: {
    marginTop: espaciado.xl,
    gap: espaciado.md,
  },
  botonReporte: {
    height: 52,
    borderRadius: 26,
  },
});

