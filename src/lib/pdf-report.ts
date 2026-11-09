import { es_error_red_o_timeout } from '@/lib/auth';
import { obtener_supabase } from '@/lib/supabase';

export type ProductoVentaReporte = {
  idProducto: string;
  nombre: string;
  cantidadVendida: number;
  precioUnitario: number;
  subtotal: number;
};

export type DatosReporteVentas = {
  ventasTotales: number;
  pedidosTotales: number;
  ticketPromedio: number;
  productos: ProductoVentaReporte[];
  nombreCafeteria?: string;
};

export type OpcionesReporteHtml = {
  nombreCafeteria: string;
  tituloPeriodo: string;
  fechaEmision: string;
};

type ComandaRow = {
  id_comanda: string;
  total: number | null;
  fecha_creacion: string;
};

type DetalleRow = {
  id_producto: string;
  cantidad: number;
  precio_unitario: number;
  producto?: { nombre_producto: string } | { nombre_producto: string }[] | null;
};

/**
 * Divide un arreglo en fragmentos de tamaño máximo para evitar límites de URL en consultas IN.
 */
function dividirEnLotes<T>(items: T[], tamanoLote: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamanoLote) {
    lotes.push(items.slice(i, i + tamanoLote));
  }
  return lotes;
}

/**
 * Formatea cantidades numéricas como moneda mexicana (MXN).
 */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

/**
 * Envuelve una promesa con un temporizador de timeout para abortar si la red no responde.
 */
async function ejecutarConTimeout<T>(promesa: PromiseLike<T>, timeoutMs = 8000): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error('timeout_conexion'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promesa, timeoutPromise]);
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

/**
 * Realiza un ping ligero a Supabase para verificar si el dispositivo tiene conexión
 * con el servidor antes de iniciar la recopilación de datos pesada.
 */
export async function verificarConexionServidor(timeoutMs = 3000): Promise<boolean> {
  try {
    const supabase = obtener_supabase();
    const respuesta = await ejecutarConTimeout<any>(
      supabase.from('cafeteria').select('id_cafeteria').limit(1),
      timeoutMs,
    );

    if (respuesta?.error && es_error_red_o_timeout(respuesta.error)) {
      return false;
    }
    return true;
  } catch (error) {
    if (es_error_red_o_timeout(error)) {
      return false;
    }
    return false;
  }
}

/**
 * Consulta el nombre oficial de la cafetería en la base de datos a partir de su ID.
 */
export async function obtenerNombreCafeteria(idCafeteria: string): Promise<string> {
  try {
    const supabase = obtener_supabase();
    const { data, error } = await ejecutarConTimeout<any>(
      supabase
        .from('cafeteria')
        .select('nombre_cafeteria')
        .eq('id_cafeteria', idCafeteria)
        .maybeSingle(),
      8000,
    );

    if (error && es_error_red_o_timeout(error)) {
      throw error;
    }

    return data?.nombre_cafeteria?.trim() || 'Cafetería Orby';
  } catch (err) {
    if (es_error_red_o_timeout(err)) {
      throw new Error('SIN_CONEXION_DURANTE_REPORTE');
    }
    return 'Cafetería Orby';
  }
}

/**
 * Consulta las comandas cerradas de una cafetería en un intervalo de fechas y
 * agrupa las ventas por producto y totales consolidados.
 */
export async function obtenerDatosReporte(
  idCafeteria: string,
  fechaInicio: Date,
  fechaFin: Date,
): Promise<DatosReporteVentas> {
  const supabase = obtener_supabase();

  try {
    // 0. Consultar nombre oficial de la cafetería
    const nombreCafeteria = await obtenerNombreCafeteria(idCafeteria);

    // 1. Consultar comandas cerradas (id_estado = 2) en el rango de fechas
    const { data: comandas, error: errorComandas } = await ejecutarConTimeout<any>(
      supabase
        .from('comanda')
        .select('id_comanda, total, fecha_creacion')
        .eq('id_cafeteria', idCafeteria)
        .eq('id_estado', 2)
        .gte('fecha_creacion', fechaInicio.toISOString())
        .lte('fecha_creacion', fechaFin.toISOString()),
      8000,
    );

    if (errorComandas) {
      if (es_error_red_o_timeout(errorComandas)) {
        throw new Error('SIN_CONEXION_DURANTE_REPORTE');
      }
      throw new Error(`Error al consultar comandas para el reporte: ${errorComandas.message}`);
    }

    const filasComandas = (comandas ?? []) as unknown as ComandaRow[];

    if (filasComandas.length === 0) {
      return {
        ventasTotales: 0,
        pedidosTotales: 0,
        ticketPromedio: 0,
        productos: [],
        nombreCafeteria,
      };
    }

    const pedidosTotales = filasComandas.length;
    const ventasTotales = filasComandas.reduce(
      (acumulado: number, c: ComandaRow) => acumulado + (Number(c.total) || 0),
      0,
    );
    const ticketPromedio = pedidosTotales > 0 ? ventasTotales / pedidosTotales : 0;

    // 2. Consultar los detalles de esas comandas en lotes
    const idsComandas = filasComandas.map((c: ComandaRow) => c.id_comanda);
    const lotesIds = dividirEnLotes(idsComandas, 100);
    const detallesCompletos: DetalleRow[] = [];

    for (const lote of lotesIds) {
      const { data: detallesLote, error: errorDetalles } = await ejecutarConTimeout<any>(
        supabase
          .from('detalle_comanda')
          .select('id_producto, cantidad, precio_unitario, producto(nombre_producto)')
          .in('id_comanda', lote),
        8000,
      );

      if (errorDetalles) {
        if (es_error_red_o_timeout(errorDetalles)) {
          throw new Error('SIN_CONEXION_DURANTE_REPORTE');
        }
        throw new Error(`Error al consultar detalles de comandas: ${errorDetalles.message}`);
      }

      if (detallesLote && Array.isArray(detallesLote)) {
        detallesCompletos.push(...(detallesLote as unknown as DetalleRow[]));
      }
    }

    // 3. Agrupar por producto calculando unidades vendidas y subtotal
    const mapaProductos = new Map<
      string,
      {
        idProducto: string;
        nombre: string;
        cantidadVendida: number;
        subtotal: number;
        precioUnitario: number;
      }
    >();

    for (const item of detallesCompletos) {
      const nombre = Array.isArray(item.producto)
        ? item.producto[0]?.nombre_producto || 'Producto'
        : item.producto?.nombre_producto || 'Producto';

      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precio_unitario) || 0;
      const subtotal = cantidad * precio;

      const productoActual = mapaProductos.get(item.id_producto);
      if (productoActual) {
        productoActual.cantidadVendida += cantidad;
        productoActual.subtotal += subtotal;
        // Conservar el precio unitario del ítem si era cero
        if (productoActual.precioUnitario === 0 && precio > 0) {
          productoActual.precioUnitario = precio;
        }
      } else {
        mapaProductos.set(item.id_producto, {
          idProducto: item.id_producto,
          nombre,
          cantidadVendida: cantidad,
          subtotal,
          precioUnitario: precio,
        });
      }
    }

    // Ordenar productos de mayor a menor subtotal
    const productos: ProductoVentaReporte[] = Array.from(mapaProductos.values())
      .map((p) => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        cantidadVendida: p.cantidadVendida,
        precioUnitario: p.precioUnitario > 0 ? p.precioUnitario : p.cantidadVendida > 0 ? p.subtotal / p.cantidadVendida : 0,
        subtotal: p.subtotal,
      }))
      .sort((a, b) => b.subtotal - a.subtotal);

    return {
      ventasTotales,
      pedidosTotales,
      ticketPromedio,
      productos,
      nombreCafeteria,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'SIN_CONEXION_DURANTE_REPORTE') {
      throw error;
    }
    if (es_error_red_o_timeout(error)) {
      throw new Error('SIN_CONEXION_DURANTE_REPORTE');
    }
    throw error;
  }
}

/**
 * Genera la plantilla HTML optimizada para impresión o renderizado en PDF (tamaño Carta)
 * con diseño moderno, elegante y limpio para Orby POS.
 */
export function generarHtmlReporte(
  datos: DatosReporteVentas,
  opciones: {
    nombreCafeteria: string;
    tituloPeriodo: string;
    fechaEmision: string;
  },
): string {
  const { nombreCafeteria, tituloPeriodo, fechaEmision } = opciones;
  const { ventasTotales, pedidosTotales, ticketPromedio, productos } = datos;

  const totalUnidadesVendidas = productos.reduce((acc, p) => acc + p.cantidadVendida, 0);

  const filasProductos =
    productos.length > 0
      ? productos
          .map(
            (p, index) => `
          <tr class="${index % 2 === 0 ? 'fila-par' : 'fila-impar'}">
            <td class="col-producto">
              <span class="producto-nombre">${p.nombre}</span>
            </td>
            <td class="col-cantidad">${p.cantidadVendida}</td>
            <td class="col-precio">${formatearMoneda(p.precioUnitario)}</td>
            <td class="col-subtotal">${formatearMoneda(p.subtotal)}</td>
          </tr>
        `,
          )
          .join('')
      : `
        <tr>
          <td colspan="4" class="sin-datos">
            No se registraron ventas ni comandas cerradas en este periodo.
          </td>
        </tr>
      `;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Ventas - ${nombreCafeteria}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 14mm 15mm 16mm 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0F172A;
      background-color: #FFFFFF;
      font-size: 13px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .reporte-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 10px 0;
    }

    /* ENCABEZADO */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #4F46E5;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .header-marca {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.2px;
      padding: 4px 10px;
      border-radius: 6px;
      width: fit-content;
      text-transform: uppercase;
    }

    .cafeteria-nombre {
      font-size: 22px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.3px;
    }

    .header-info {
      text-align: right;
    }

    .periodo-titulo {
      font-size: 15px;
      font-weight: 700;
      color: #4F46E5;
      margin-bottom: 4px;
    }

    .fecha-emision {
      font-size: 11px;
      color: #64748B;
    }

    /* TARJETAS KPI */
    .kpi-grid {
      display: flex;
      gap: 14px;
      margin-bottom: 24px;
    }

    .kpi-card {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 14px 16px;
      position: relative;
      overflow: hidden;
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: #CBD5E1;
    }

    .kpi-card.destacada::before {
      background: #4F46E5;
    }

    .kpi-card.pedidos::before {
      background: #0EA5E9;
    }

    .kpi-card.ticket::before {
      background: #10B981;
    }

    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748B;
      margin-bottom: 6px;
    }

    .kpi-valor {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.4px;
    }

    .kpi-valor.destacado {
      color: #4F46E5;
    }

    /* SECCIÓN DE LA TABLA */
    .seccion-titulo {
      font-size: 14px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .total-items-badge {
      font-size: 11px;
      font-weight: 500;
      color: #64748B;
      background: #F1F5F9;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .tabla-reporte {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
    }

    .tabla-reporte thead th {
      background-color: #F1F5F9;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 10px 14px;
      border-bottom: 1px solid #CBD5E1;
    }

    .col-producto {
      text-align: left;
      width: 46%;
    }

    .col-cantidad {
      text-align: center;
      width: 18%;
    }

    .col-precio {
      text-align: right;
      width: 18%;
    }

    .col-subtotal {
      text-align: right;
      width: 18%;
    }

    .tabla-reporte tbody td {
      padding: 9px 14px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 12.5px;
    }

    .fila-impar {
      background-color: #FAFAFC;
    }

    .producto-nombre {
      font-weight: 600;
      color: #1E293B;
    }

    .col-subtotal {
      font-weight: 700;
      color: #0F172A;
    }

    .tabla-reporte tfoot td {
      background-color: #F8FAFC;
      border-top: 2px solid #CBD5E1;
      padding: 10px 14px;
      font-weight: 700;
      font-size: 12.5px;
      color: #0F172A;
    }

    .sin-datos {
      text-align: center;
      padding: 24px 14px !important;
      color: #94A3B8;
      font-style: italic;
    }

    /* PIE DE PÁGINA */
    .footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #94A3B8;
      font-size: 10.5px;
    }

    .footer-marca {
      font-weight: 600;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="reporte-container">
    <!-- ENCABEZADO -->
    <header class="header">
      <div class="header-marca">
        <div class="logo-badge">ORBY POS</div>
        <h1 class="cafeteria-nombre">${nombreCafeteria}</h1>
      </div>
      <div class="header-info">
        <div class="periodo-titulo">${tituloPeriodo}</div>
        <div class="fecha-emision">Emisión: ${fechaEmision}</div>
      </div>
    </header>

    <!-- TARJETAS DE MÉTRICAS CLAVE -->
    <section class="kpi-grid">
      <div class="kpi-card destacada">
        <div class="kpi-label">Ventas Totales</div>
        <div class="kpi-valor destacado">${formatearMoneda(ventasTotales)}</div>
      </div>
      <div class="kpi-card pedidos">
        <div class="kpi-label">Pedidos Cerrados</div>
        <div class="kpi-valor">${pedidosTotales}</div>
      </div>
      <div class="kpi-card ticket">
        <div class="kpi-label">Ticket Promedio</div>
        <div class="kpi-valor">${formatearMoneda(ticketPromedio)}</div>
      </div>
    </section>

    <!-- TABLA DE DESGLOSE POR PRODUCTO -->
    <section>
      <div class="seccion-titulo">
        <span>Desglose de Ventas por Producto</span>
        <span class="total-items-badge">${productos.length} productos</span>
      </div>

      <table class="tabla-reporte">
        <thead>
          <tr>
            <th class="col-producto">Producto</th>
            <th class="col-cantidad">Cantidad</th>
            <th class="col-precio">Precio Unit.</th>
            <th class="col-subtotal">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${filasProductos}
        </tbody>
        ${
          productos.length > 0
            ? `
        <tfoot>
          <tr>
            <td><strong>Total Consolidado</strong></td>
            <td class="col-cantidad"><strong>${totalUnidadesVendidas}</strong></td>
            <td></td>
            <td class="col-subtotal"><strong>${formatearMoneda(ventasTotales)}</strong></td>
          </tr>
        </tfoot>
        `
            : ''
        }
      </table>
    </section>

    <!-- PIE INSTITUCIONAL -->
    <footer class="footer">
      <div>
        <span class="footer-marca">Orby POS</span> &bull; Sistema Integral de Gestión para Cafeterías
      </div>
      <div>Documento confidencial generado automáticamente</div>
    </footer>
  </div>
</body>
</html>`;
}
