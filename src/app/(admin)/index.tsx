import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
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
  const { estadisticas, recargarEstadisticas, cargandoCatalogo } = useCatalog();
  const [refrescandoManual, setRefrescandoManual] = useState(false);

  const bordeTabla = { borderColor: colores.text };

  const handleRefresh = useCallback(async () => {
    setRefrescandoManual(true);
    try {
      await recargarEstadisticas();
    } finally {
      setRefrescandoManual(false);
    }
  }, [recargarEstadisticas]);

  const handleDescargarReporte = () => {
    mostrarAviso(
      'Descargar reporte',
      'El reporte diario de ventas y pedidos ha sido generado en formato PDF/Excel.',
      [{ text: 'Aceptar' }]
    );
  };

  const nombreAdmin = usuario?.nombre ?? 'Gael';
  const productos = estadisticas?.productos_mas_vendidos ?? [];
  const filasVaciasCount = Math.max(0, 4 - productos.length);
  const filasVacias = Array.from({ length: filasVaciasCount });

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescandoManual || cargandoCatalogo}
            onRefresh={handleRefresh}
            tintColor={colores.primary}
            colors={[colores.primary]}
          />
        }
      >
        {/* Encabezado con avatar, saludo y rol */}
        <UserHeader nombre={nombreAdmin} rol="Administrador" tamanoAvatar={96} />

        {/* Tarjetas de métricas del día */}
        <View style={estilos.filaMetricas}>
          <MetricCard
            titulo={'Ventas totales\ndiarias'}
            valor={`$${(estadisticas?.ventas_totales_diarias ?? 0).toLocaleString()}`}
            cambioPorcentual={estadisticas?.porcentaje_cambio_ventas ?? 0}
          />

          <MetricCard
            titulo={'Pedidos\ndiarios'}
            valor={estadisticas?.pedidos_diarios ?? 0}
            cambioPorcentual={estadisticas?.porcentaje_cambio_pedidos ?? 0}
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
            {productos.map((prod, index) => {
              const esUltima = index === productos.length - 1 && filasVaciasCount === 0;
              return (
                <View
                  key={prod.posicion ?? index}
                  style={[estilos.filaTabla, bordeTabla, esUltima && { borderBottomWidth: 0 }]}
                >
                  <View style={[estilos.celdaPosicion, bordeTabla]}>
                    <Text style={[estilos.textoCelda, { color: colores.text }]}>{prod.posicion}.</Text>
                  </View>
                  <View style={[estilos.celdaNombre, bordeTabla]}>
                    <Text style={[estilos.textoCelda, { color: colores.text }]} numberOfLines={1}>
                      {prod.nombre}
                    </Text>
                  </View>
                  <View style={estilos.celdaCantidad}>
                    <Text style={[estilos.textoCelda, { color: colores.text }]}>{prod.cantidad}</Text>
                  </View>
                </View>
              );
            })}

            {/* Filas vacías estéticas sin romper la interfaz */}
            {filasVacias.map((_, index) => {
              const esUltima = index === filasVaciasCount - 1;
              return (
                <View
                  key={`vacia-${index}`}
                  style={[estilos.filaTabla, bordeTabla, esUltima && { borderBottomWidth: 0 }]}
                >
                  <View style={[estilos.celdaPosicion, bordeTabla]} />
                  <View style={[estilos.celdaNombre, bordeTabla]} />
                  <View style={estilos.celdaCantidad} />
                </View>
              );
            })}
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

