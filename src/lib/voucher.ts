import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Comanda, MetodoPago } from '@/types';

export function etiquetaMetodoPago(metodo?: MetodoPago | null) {
  if (metodo === 'efectivo') return 'Efectivo';
  if (metodo === 'tarjeta') return 'Tarjeta';
  if (metodo === 'transferencia') return 'Transferencia';
  return 'Sin registrar';
}

function moneda(monto: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

export function folioComanda(comanda: Comanda) {
  return comanda.id_comanda.slice(0, 8).toUpperCase();
}

export function generarHtmlVoucher(
  comanda: Comanda,
  nombreCafeteria: string,
  metodoPago?: MetodoPago | null
) {
  const detalles = comanda.detalles.filter((d) => d.id_estado !== 5); // sin cancelados
  const filas = detalles
    .map(
      (d) => `
        <tr>
          <td class="cant">${d.cantidad}</td>
          <td>
            <div class="producto">${d.nombre_producto}</div>
            ${d.especificaciones ? `<div class="nota">${d.especificaciones}</div>` : ''}
          </td>
          <td class="precio">${moneda(d.precio_unitario * d.cantidad)}</td>
        </tr>`
    )
    .join('');

  const lugar =
    comanda.tipo_servicio === 'llevar'
      ? `Para llevar${comanda.nombre_cliente ? ` · ${comanda.nombre_cliente}` : ''}`
      : `Mesa ${comanda.num_mesa}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #111; margin: 0; font-size: 12px; }
    .centro { text-align: center; }
    .marca { font-size: 22px; font-weight: 800; letter-spacing: 1px; margin: 0; }
    .cafeteria { font-size: 13px; margin: 2px 0 8px; }
    .tipo { font-size: 14px; font-weight: 700; margin: 8px 0 2px; }
    .meta { color: #444; font-size: 11px; }
    .linea { border-top: 1px dashed #555; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; color: #555; padding-bottom: 4px; }
    td { vertical-align: top; padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .cant { width: 22px; font-weight: 700; }
    .precio { text-align: right; white-space: nowrap; }
    .producto { font-weight: 600; }
    .nota { color: #555; font-size: 10px; margin-top: 2px; }
    .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; margin-top: 8px; }
    .pago { margin-top: 8px; font-size: 11px; }
    .pie { text-align: center; margin-top: 12px; font-size: 11px; color: #444; }
  </style>
</head>
<body>
  <div class="centro">
    <p class="marca">ORBY</p>
    <p class="cafeteria">${nombreCafeteria}</p>
    <p class="tipo">${lugar}</p>
    <p class="meta">Folio ${folioComanda(comanda)}</p>
    <p class="meta">${new Date(comanda.fecha_pago ?? comanda.fecha_creacion).toLocaleString('es-MX')}</p>
  </div>

  <div class="linea"></div>

  <table>
    <thead>
      <tr><th>Cant.</th><th>Producto</th><th class="precio">Importe</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="linea"></div>
  <div class="total"><span>Total</span><span>${moneda(comanda.total)}</span></div>
  <div class="pago">
    <strong>Pago:</strong> ${etiquetaMetodoPago(metodoPago ?? comanda.metodo_pago)}
    ${comanda.pagado ? ' · Pagado' : ' · Pendiente de pago'}
  </div>
  <div class="pie">${comanda.tipo_servicio === 'llevar' ? '¡Gracias por tu pedido!' : '¡Gracias por tu visita!'}</div>
</body>
</html>`;
}

export async function compartirVoucherPdf(html: string, folio: string) {
  // En web, expo-print no devuelve el archivo PDF: abre una pestaña con el
  // comprobante para imprimir o guardar. Así evitamos el error de `base64`.
  if (Platform.OS === 'web') {
    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
      ventana.focus();
      // Dar tiempo a que el navegador termine de pintar antes de abrir la impresión.
      setTimeout(() => ventana.print(), 350);
      return;
    }

    // Si el navegador bloquea la pestaña, se descarga el HTML como respaldo.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `Voucher_${folio}.html`;
    enlace.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { base64, uri: tempUri } = await Print.printToFileAsync({ html, base64: true });

  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const safeUri = `${baseDir.endsWith('/') ? baseDir : `${baseDir}/`}Voucher_${folio}.pdf`;

  if (base64) {
    await FileSystem.writeAsStringAsync(safeUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    await FileSystem.copyAsync({ from: tempUri, to: safeUri });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(safeUri, {
      mimeType: 'application/pdf',
      UTI: '.pdf',
      dialogTitle: `Voucher ${folio}`,
    });
    return;
  }

  await Print.printAsync({ html });
}
