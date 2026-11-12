import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CustomButton } from '@/components/CustomButton';
import { mostrarAviso } from '@/lib/confirm';
import {
  compartirVoucherPdf,
  etiquetaMetodoPago,
  folioComanda,
  generarHtmlVoucher,
} from '@/lib/voucher';
import { espaciado, fuentes, radios, useTema } from '@/theme';
import type { Comanda, MetodoPago } from '@/types';

type VoucherModalProps = {
  visible: boolean;
  comanda: Comanda | null;
  nombreCafeteria: string;
  metodoPago?: MetodoPago | null;
  onClose: () => void;
};

export function VoucherModal({
  visible,
  comanda,
  nombreCafeteria,
  metodoPago,
  onClose,
}: VoucherModalProps) {
  const { colores } = useTema();
  const [compartiendo, setCompartiendo] = useState(false);

  if (!comanda) return null;

  const folio = folioComanda(comanda);
  const detalles = comanda.detalles.filter((d) => d.id_estado !== 5);
  const lugar =
    comanda.tipo_servicio === 'llevar'
      ? `Para llevar${comanda.nombre_cliente ? ` · ${comanda.nombre_cliente}` : ''}`
      : `Mesa ${comanda.num_mesa}`;

  const handleCompartir = async () => {
    setCompartiendo(true);
    try {
      await compartirVoucherPdf(
        generarHtmlVoucher(comanda, nombreCafeteria, metodoPago),
        folio
      );
    } catch (error) {
      console.warn('No se pudo compartir el voucher:', error);
      mostrarAviso('No se pudo compartir', 'Inténtalo de nuevo o revisa la conexión.');
    } finally {
      setCompartiendo(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[estilos.overlay, { backgroundColor: colores.overlay }]}>
        <View
          accessibilityViewIsModal
          style={[estilos.contenedor, { backgroundColor: colores.surface }]}
        >
          <View style={[estilos.cabecera, { borderBottomColor: colores.divider }]}>
            <Text accessibilityRole="header" style={[estilos.titulo, { color: colores.text }]}>
              Voucher
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar voucher"
              style={estilos.botonCerrar}
            >
              <Ionicons name="close" size={24} color={colores.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[estilos.marca, { color: colores.text }]}>ORBY</Text>
            <Text style={[estilos.cafeteria, { color: colores.text_secondary }]}>
              {nombreCafeteria}
            </Text>
            <Text style={[estilos.lugar, { color: colores.text }]}>{lugar}</Text>
            <Text style={[estilos.meta, { color: colores.text_muted }]}>
              Folio {folio} · {new Date(comanda.fecha_pago ?? comanda.fecha_creacion).toLocaleString('es-MX')}
            </Text>

            <View style={[estilos.linea, { borderTopColor: colores.divider }]} />

            {detalles.map((d) => (
              <View key={d.id_detalle} style={estilos.filaProducto}>
                <Text style={[estilos.cantidad, { color: colores.text }]}>{d.cantidad}</Text>
                <View style={estilos.infoProducto}>
                  <Text style={[estilos.producto, { color: colores.text }]}>
                    {d.nombre_producto}
                  </Text>
                  {d.especificaciones ? (
                    <Text style={[estilos.nota, { color: colores.text_muted }]}>
                      {d.especificaciones}
                    </Text>
                  ) : null}
                </View>
                <Text style={[estilos.importe, { color: colores.text }]}>
                  ${(d.precio_unitario * d.cantidad).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={[estilos.linea, { borderTopColor: colores.divider }]} />
            <View style={estilos.filaTotal}>
              <Text style={[estilos.totalEtiqueta, { color: colores.text }]}>Total</Text>
              <Text style={[estilos.totalMonto, { color: colores.text }]}>
                ${comanda.total.toFixed(2)}
              </Text>
            </View>
            <Text style={[estilos.pago, { color: colores.text_secondary }]}>
              Pago: {etiquetaMetodoPago(metodoPago ?? comanda.metodo_pago)} ·{' '}
              {comanda.pagado ? 'Pagado' : 'Pendiente'}
            </Text>
          </ScrollView>

          <View style={estilos.acciones}>
            <CustomButton
              titulo="Compartir PDF"
              variante="primary"
              cargando={compartiendo}
              onPress={handleCompartir}
              accessibilityHint="Abre la hoja para imprimir o compartir el voucher"
            />
            <CustomButton titulo="Cerrar" variante="outline" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  contenedor: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    borderRadius: radios.xl,
    overflow: 'hidden',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.sm,
    borderBottomWidth: 1,
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
  },
  botonCerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: espaciado.lg,
  },
  marca: {
    fontFamily: fuentes.bold,
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: 1,
  },
  cafeteria: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },
  lugar: {
    fontFamily: fuentes.bold,
    fontSize: 16,
    textAlign: 'center',
    marginTop: espaciado.sm,
  },
  meta: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  linea: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: espaciado.sm,
  },
  filaProducto: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.sm,
    paddingVertical: 4,
  },
  cantidad: {
    width: 20,
    fontFamily: fuentes.bold,
  },
  infoProducto: {
    flex: 1,
  },
  producto: {
    fontSize: 14,
    fontWeight: '600',
  },
  nota: {
    fontSize: 11,
    marginTop: 1,
  },
  importe: {
    fontSize: 14,
    fontWeight: '600',
  },
  filaTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalEtiqueta: {
    fontFamily: fuentes.bold,
    fontSize: 18,
  },
  totalMonto: {
    fontFamily: fuentes.bold,
    fontSize: 18,
  },
  pago: {
    fontSize: 12,
    marginTop: espaciado.xs,
  },
  acciones: {
    padding: espaciado.lg,
    paddingTop: espaciado.sm,
  },
});
