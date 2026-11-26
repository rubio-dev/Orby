import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CocinaBottomNav } from '@/components/CocinaBottomNav';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useKitchen } from '@/context/kitchen-context';
import { AvisoSinConexion } from '@/kitchen/AvisoSinConexion';
import { ESTADO_DETALLE, etiquetaComanda, type ComandaCocina } from '@/lib/kitchen-network';
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme';

const TAMANO_PAGINA = 20;

export default function CocinaHistoryScreen() {
  const router = useRouter();
  const { colores } = useTema();
  // Cuentas cerradas del turno, de la más reciente a la más vieja (el orden lo pide el contexto)
  const { comandasCerradasHoy: completadas, cargando, recargando, recargar } = useKitchen();

  const [busqueda, setBusqueda] = useState('');
  const [cantidadVisible, setCantidadVisible] = useState(TAMANO_PAGINA);

  // Búsqueda local por mesa, cliente, folio o productos. El historial del turno ya está
  // cargado en memoria, así que filtrar aquí responde al instante sin otra consulta.
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return completadas;

    return completadas.filter((comanda) => {
      const folio = comanda.id_comanda.toLowerCase();
      const productos = comanda.detalles
        .map((detalle) => detalle.nombre_producto)
        .join(' ')
        .toLowerCase();
      const texto = [
        etiquetaComanda(comanda),
        String(comanda.num_mesa),
        comanda.nombre_cliente ?? '',
        folio,
        folio.slice(0, 8),
        productos,
        String(comanda.total),
      ]
        .join(' ')
        .toLowerCase();

      return texto.includes(termino);
    });
  }, [busqueda, completadas]);

  const mostradas = filtradas.slice(0, cantidadVisible);
  const hayMas = cantidadVisible < filtradas.length;

  const cambiarBusqueda = (texto: string) => {
    setBusqueda(texto);
    setCantidadVisible(TAMANO_PAGINA);
  };

  const renderComanda = ({ item }: { item: ComandaCocina }) => (
    <View style={[estilos.tarjeta, { backgroundColor: colores.surface, borderColor: colores.text }]}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.mesa, { color: colores.text }]}>
          {etiquetaComanda(item)}
        </Text>
        <View style={[estilos.chipListo, { backgroundColor: colores.primary_soft }]}>
          <Text style={[estilos.textoChipListo, { color: colores.primary_strong }]}>Completado</Text>
        </View>
      </View>

      <View style={estilos.detalles}>
        {/* Lo cancelado no se sirvió: no forma parte de lo que hizo la cocina */}
        {item.detalles.filter((d) => d.id_estado !== ESTADO_DETALLE.cancelado).map((d) => (
          <Text key={d.id_detalle} style={[estilos.itemTexto, { color: colores.text_secondary }]}>
            • {d.cantidad} {d.nombre_producto}
          </Text>
        ))}
      </View>

      <View style={[estilos.pie, { borderTopColor: colores.divider }]}>
        <Text style={[tipografia.detalle, { color: colores.text_muted }]}>
          Total: ${item.total}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(cocina)/order-detail?id=${item.id_comanda}`)}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalles de ${etiquetaComanda(item)}`}
        >
          <Text style={[tipografia.etiqueta, { color: colores.primary_strong, fontWeight: '700' }]}>
            Ver detalles →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader
        titulo="Historial de Comandas"
        onBack={() => router.push('/(cocina)' as any)}
      />

      {/* Solo aparece sin conexión o con cambios por enviar */}
      <AvisoSinConexion />

      <View style={estilos.contenido}>
        <View
          style={[
            estilos.buscador,
            { backgroundColor: colores.surface, borderColor: colores.text },
          ]}
        >
          <Ionicons name="search" size={20} color={colores.text} />
          <TextInput
            value={busqueda}
            onChangeText={cambiarBusqueda}
            placeholder="Buscar por mesa, folio o producto"
            placeholderTextColor={colores.text_muted}
            style={[estilos.inputBuscar, { color: colores.text }]}
            accessibilityLabel="Buscar en el historial de comandas"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => cambiarBusqueda('')}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={20} color={colores.text_muted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={mostradas}
          keyExtractor={(item) => item.id_comanda}
          renderItem={renderComanda}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hayMas) setCantidadVisible((actual) => actual + TAMANO_PAGINA);
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={recargando}
              onRefresh={() => recargar({ manual: true })}
              tintColor={colores.primary}
              colors={[colores.primary]}
            />
          }
          ListFooterComponent={
            filtradas.length > 0 ? (
              <Text style={[tipografia.detalle, estilos.pieLista, { color: colores.text_muted }]}>
                Mostrando {mostradas.length} de {filtradas.length} comandas
                {hayMas ? '. Desliza para ver más.' : '.'}
              </Text>
            ) : undefined
          }
          ListEmptyComponent={
            cargando ? (
              <View style={estilos.vacio}>
                <ActivityIndicator size="large" color={colores.primary} />
              </View>
            ) : (
              <View style={estilos.vacio}>
                <Ionicons
                  name={busqueda ? 'search-outline' : 'time-outline'}
                  size={48}
                  color={colores.text_muted}
                />
                <Text style={[tipografia.cuerpo, { color: colores.text_muted, marginTop: espaciado.md }]}>
                  {busqueda
                    ? 'No hay comandas que coincidan con la búsqueda'
                    : 'Aún no hay comandas cerradas en este turno'}
                </Text>
              </View>
            )
          }
        />
      </View>

      <CocinaBottomNav activa="historial" />
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
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: espaciado.md,
    marginTop: espaciado.sm,
  },
  inputBuscar: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  lista: {
    paddingTop: espaciado.xs,
    paddingBottom: espaciado.xl,
    gap: espaciado.md,
  },
  pieLista: {
    textAlign: 'center',
    paddingVertical: espaciado.sm,
  },
  tarjeta: {
    padding: espaciado.md,
    borderRadius: radios.xxl,
    borderWidth: 1.5,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espaciado.xs,
  },
  mesa: {
    fontFamily: fuentes.bold,
    fontSize: 20,
  },
  chipListo: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  textoChipListo: {
    fontFamily: fuentes.bold,
    fontSize: 12,
  },
  detalles: {
    marginVertical: espaciado.xs,
    paddingLeft: 4,
  },
  itemTexto: {
    fontSize: 15,
    lineHeight: 21,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espaciado.xs,
    paddingTop: espaciado.xs,
    borderTopWidth: 1,
  },
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.xxl * 2,
  },
});
