import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components/CustomButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VoucherModal } from '@/components/VoucherModal';
import { useAuth } from '@/context/auth-context';
import { useOrders } from '@/context/orders-context';
import { mostrarAviso } from '@/lib/confirm';
import { etiquetaComanda } from '@/lib/kitchen-network';
import { obtenerNombreCafeteria } from '@/lib/pdf-report';
import { etiquetaMetodoPago } from '@/lib/voucher';
import { espaciado, fuentes, radios, useTema } from '@/theme';
import type { Comanda, MetodoPago } from '@/types';

const METODOS_PAGO: { id: MetodoPago; etiqueta: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'efectivo', etiqueta: 'Efectivo', icono: 'cash-outline' },
  { id: 'tarjeta', etiqueta: 'Tarjeta', icono: 'card-outline' },
  { id: 'transferencia', etiqueta: 'Transferencia', icono: 'swap-horizontal-outline' },
];

const NOMBRES_ESTADO: Record<number, string> = {
  1: 'Pendiente',
  2: 'En preparación',
  3: 'Listo',
  4: 'Entregado',
  5: 'Cancelado',
};

export default function MeseroAccountScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { id, mesa } = useLocalSearchParams<{ id?: string; mesa?: string }>();
  const { comandas, marcarComandaEntregada, cerrarCuentaMesa, seleccionarMesa } = useOrders();

  const [cobrando, setCobrando] = useState(false);
  const [entregando, setEntregando] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [voucher, setVoucher] = useState<Comanda | null>(null);
  const [nombreCafeteria, setNombreCafeteria] = useState('Cafetería');

  useEffect(() => {
    if (!usuario?.id_cafeteria) return;
    obtenerNombreCafeteria(usuario.id_cafeteria)
      .then((nombre) => {
        if (nombre) setNombreCafeteria(nombre);
      })
      .catch(() => {});
  }, [usuario?.id_cafeteria]);

  const comanda = useMemo(() => {
    if (id) return comandas.find((c) => c.id_comanda === id) ?? null;
    if (mesa) {
      const num = Number(mesa);
      const deLaMesa = comandas.filter((c) => c.num_mesa === num);
      return deLaMesa.find((c) => c.id_estado === 1) ?? deLaMesa[0] ?? null;
    }
    return null;
  }, [comandas, id, mesa]);

  const abierta = comanda?.id_estado === 1;
  const esLlevar = comanda?.tipo_servicio === 'llevar';
  const detalles = comanda?.detalles.filter((d) => d.id_estado !== 5) ?? [];
  const hayListos = detalles.some((d) => d.id_estado === 3);
  const hayPendientes = detalles.some((d) => d.id_estado === 1 || d.id_estado === 2);
  const todosEntregados =
    detalles.length > 0 && detalles.every((d) => d.id_estado === 4);

  if (!comanda) {
    return (
      <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
        <ScreenHeader titulo="Cuenta" onBack={() => router.back()} />
        <View style={estilos.vacio}>
          <ActivityIndicator size="large" color={colores.primary} />
          <Text style={[estilos.vacioTexto, { color: colores.text_muted }]}>
            No se encontró una cuenta abierta para esta mesa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const etiqueta = etiquetaComanda(comanda);

  const handleEntregar = async () => {
    setEntregando(true);
    const resultado = await marcarComandaEntregada(comanda.id_comanda);
    setEntregando(false);
    if (resultado.exito) {
      mostrarAviso(
        'Pedido entregado',
        resultado.entregados
          ? `${resultado.entregados} producto(s) marcados como entregados.`
          : 'No había productos listos por entregar.'
      );
    } else {
      mostrarAviso('No se pudo entregar', resultado.error ?? 'Inténtalo de nuevo.');
    }
  };

  const handleCobrar = async (metodo: MetodoPago) => {
    if (!comanda.id_mesa) return;
    setCobrando(true);
    const numMesa = comanda.num_mesa;
    const resultado = await cerrarCuentaMesa(numMesa, metodo);
    setCobrando(false);
    setModalPago(false);

    if (resultado.exito) {
      setVoucher(resultado.comanda ?? comanda);
    } else {
      mostrarAviso('No se pudo cobrar', resultado.error ?? 'Inténtalo de nuevo.');
    }
  };

  const handleAgregar = () => {
    seleccionarMesa(comanda.num_mesa);
    router.push('/(mesero)/new-order');
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader titulo={etiqueta} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
        <View style={[estilos.tarjeta, { backgroundColor: colores.surface, borderColor: colores.border }]}>
          <View style={estilos.filaCabecera}>
            <Text style={[estilos.tipo, { color: colores.text }]}>{etiqueta}</Text>
            <View
              style={[
                estilos.chip,
                {
                  backgroundColor: comanda.pagado ? colores.surface_muted : colores.warning_soft,
                },
              ]}
            >
              <Text
                style={[
                  estilos.chipTexto,
                  { color: comanda.pagado ? colores.success : colores.warning },
                ]}
              >
                {comanda.pagado ? 'Pagado' : 'Pago pendiente'}
              </Text>
            </View>
          </View>
          <Text style={[estilos.meta, { color: colores.text_muted }]}>
            {comanda.pagado && comanda.metodo_pago
              ? `Pagado con ${etiquetaMetodoPago(comanda.metodo_pago)}`
              : abierta
                ? 'Cuenta abierta'
                : 'Cuenta cerrada'}
          </Text>
        </View>

        <Text style={[estilos.seccionTitulo, { color: colores.text }]}>Productos</Text>

        {detalles.map((detalle) => {
          const listo = detalle.id_estado === 3;
          const entregado = detalle.id_estado === 4;
          return (
            <View
              key={detalle.id_detalle}
              style={[estilos.item, { backgroundColor: colores.surface, borderColor: colores.border }]}
            >
              <View style={estilos.itemInfo}>
                <Text style={[estilos.itemNombre, { color: colores.text }]}>
                  {detalle.cantidad} × {detalle.nombre_producto}
                </Text>
                {detalle.especificaciones ? (
                  <Text style={[estilos.itemNota, { color: colores.text_muted }]}>
                    {detalle.especificaciones}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  estilos.estado,
                  {
                    backgroundColor: entregado
                      ? colores.surface_muted
                      : listo
                        ? colores.primary_soft
                        : colores.surface_muted,
                  },
                ]}
              >
                <Text
                  style={[
                    estilos.estadoTexto,
                    {
                      color: entregado
                        ? colores.success
                        : listo
                          ? colores.primary_strong
                          : colores.text_muted,
                    },
                  ]}
                >
                  {NOMBRES_ESTADO[detalle.id_estado] ?? 'Pendiente'}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={[estilos.totalFila, { borderTopColor: colores.divider }]}>
          <Text style={[estilos.totalEtiqueta, { color: colores.text }]}>Total</Text>
          <Text style={[estilos.totalMonto, { color: colores.text }]}>
            ${comanda.total.toFixed(2)}
          </Text>
        </View>

        {abierta && hayPendientes && (
          <Text style={[estilos.aviso, { color: colores.text_muted }]}>
            La cocina todavía tiene productos pendientes. Podrás cobrar cuando estén entregados.
          </Text>
        )}

        {abierta && hayListos && (
          <CustomButton
            titulo={entregando ? 'Marcando...' : 'Marcar productos listos como entregados'}
            variante="secondary"
            cargando={entregando}
            deshabilitado={entregando}
            onPress={handleEntregar}
            accessibilityHint="Confirma que llevaste los productos listos a la mesa"
          />
        )}

        {abierta && !esLlevar && (
          <>
            {todosEntregados && (
              <CustomButton
                titulo="Cobrar y cerrar cuenta"
                variante="primary"
                onPress={() => setModalPago(true)}
                accessibilityHint="Elige el método de pago y libera la mesa"
              />
            )}
            <CustomButton
              titulo="Agregar más productos"
              variante="outline"
              onPress={handleAgregar}
            />
          </>
        )}

        {comanda.pagado && (
          <CustomButton
            titulo="Ver voucher"
            variante={esLlevar ? 'primary' : 'outline'}
            onPress={() => setVoucher(comanda)}
            accessibilityHint="Muestra el comprobante de la venta"
          />
        )}
      </ScrollView>

      {/* Modal de método de pago */}
      <Modal visible={modalPago} transparent animationType="fade" onRequestClose={() => setModalPago(false)}>
        <View style={[estilos.overlay, { backgroundColor: colores.overlay }]}>
          <View accessibilityViewIsModal style={[estilos.modalPago, { backgroundColor: colores.surface }]}>
            <Text accessibilityRole="header" style={[estilos.modalTitulo, { color: colores.text }]}>
              ¿Cómo se pagó?
            </Text>
            <Text style={[estilos.modalTotal, { color: colores.primary_strong }]}>
              Total: ${comanda.total.toFixed(2)}
            </Text>

            {METODOS_PAGO.map((metodo) => (
              <TouchableOpacity
                key={metodo.id}
                activeOpacity={0.8}
                disabled={cobrando}
                onPress={() => handleCobrar(metodo.id)}
                accessibilityRole="button"
                accessibilityLabel={`Cobrar con ${metodo.etiqueta}`}
                style={[estilos.opcionPago, { borderColor: colores.border }]}
              >
                <Ionicons name={metodo.icono} size={24} color={colores.text} />
                <Text style={[estilos.opcionPagoTexto, { color: colores.text }]}>
                  {metodo.etiqueta}
                </Text>
              </TouchableOpacity>
            ))}

            <CustomButton
              titulo="Cancelar"
              variante="outline"
              deshabilitado={cobrando}
              onPress={() => setModalPago(false)}
            />
          </View>
        </View>
      </Modal>

      <VoucherModal
        visible={!!voucher}
        comanda={voucher}
        nombreCafeteria={nombreCafeteria}
        metodoPago={voucher?.metodo_pago ?? null}
        onClose={() => {
          setVoucher(null);
          if (!esLlevar) router.replace('/(mesero)/tables');
          else router.replace('/(mesero)');
        }}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  scroll: {
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.xxl,
    gap: espaciado.sm,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xl,
    gap: espaciado.md,
  },
  vacioTexto: { textAlign: 'center', fontSize: 15 },
  tarjeta: {
    borderWidth: 1.5,
    borderRadius: radios.xl,
    padding: espaciado.md,
  },
  filaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
  },
  tipo: { fontFamily: fuentes.bold, fontSize: 20, flex: 1 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: espaciado.sm,
    paddingVertical: 4,
  },
  chipTexto: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
  seccionTitulo: { fontFamily: fuentes.bold, fontSize: 16, marginTop: espaciado.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radios.lg,
    padding: espaciado.sm,
    gap: espaciado.sm,
  },
  itemInfo: { flex: 1 },
  itemNombre: { fontSize: 15, fontWeight: '600' },
  itemNota: { fontSize: 12, marginTop: 2 },
  estado: { borderRadius: 999, paddingHorizontal: espaciado.sm, paddingVertical: 4 },
  estadoTexto: { fontSize: 11, fontWeight: '700' },
  totalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    paddingTop: espaciado.sm,
    marginTop: espaciado.sm,
  },
  totalEtiqueta: { fontFamily: fuentes.bold, fontSize: 20 },
  totalMonto: { fontFamily: fuentes.bold, fontSize: 20 },
  aviso: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  modalPago: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radios.xl,
    padding: espaciado.lg,
    gap: espaciado.sm,
  },
  modalTitulo: { fontFamily: fuentes.bold, fontSize: 20, textAlign: 'center' },
  modalTotal: {
    fontFamily: fuentes.bold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: espaciado.sm,
  },
  opcionPago: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: radios.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
  },
  opcionPagoTexto: { fontFamily: fuentes.bold, fontSize: 17 },
});
