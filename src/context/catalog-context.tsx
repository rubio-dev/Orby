import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuth } from "@/context/auth-context";
import {
  con_reintentos,
  es_error_red_o_timeout,
  traducir_error,
} from "@/lib/auth";
import { supabase_configurado } from "@/lib/env";
import { obtener_supabase } from "@/lib/supabase";
import type { Categoria, EstadisticasVenta, Producto } from "@/types";

export type CallbackReintento = (
  intentoActual: number,
  maxIntentos: number,
) => void;
export type ResultadoOperacionCatalogo = {
  exito: boolean;
  enCola?: boolean;
  error?: string;
};

type OperacionColaCatalogo = {
  id_operacion: string;
  tabla: "producto" | "categoria";
  accion: "crear" | "editar" | "eliminar";
  id_registro: string;
  datos?: Record<string, unknown>;
  fecha: number;
};

function generarUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function esUuidValido(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function esImagenLocal(uri?: string | null): boolean {
  if (!uri) return false;
  const limpia = uri.trim().toLowerCase();
  return (
    limpia.startsWith("file://") ||
    limpia.startsWith("content://") ||
    limpia.startsWith("ph://") ||
    limpia.startsWith("blob:") ||
    limpia.startsWith("data:image/")
  );
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const limpia = base64.replace(/[\r\n\s]/g, "");
  if (typeof atob === "function") {
    const binario = atob(limpia);
    const len = binario.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binario.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let len = limpia.length;
  let bufferLength = len * 0.75;
  if (limpia[len - 1] === "=") {
    bufferLength--;
    if (limpia[len - 2] === "=") {
      bufferLength--;
    }
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = lookup[limpia.charCodeAt(i)];
    const enc2 = lookup[limpia.charCodeAt(i + 1)];
    const enc3 = lookup[limpia.charCodeAt(i + 2)];
    const enc4 = lookup[limpia.charCodeAt(i + 3)];
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (limpia[i + 2] !== "=") {
      bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    }
    if (limpia[i + 3] !== "=") {
      bytes[p++] = ((enc3 & 3) << 6) | (enc4 & 63);
    }
  }
  return bytes.buffer;
}

async function subirImagenProductoStorage(
  uriLocal: string,
  idCafeteria: string,
  idProducto: string,
  alReintentar?: CallbackReintento,
): Promise<{ urlPublica: string | null; fallo_red: boolean; error?: string }> {
  try {
    let arrayBuffer: ArrayBuffer;
    let contentType = "image/jpeg";

    if (uriLocal.startsWith("data:")) {
      const match = uriLocal.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) {
        contentType = match[1] || "image/jpeg";
        const base64Data = match[2];
        arrayBuffer = base64ToArrayBuffer(base64Data);
      } else {
        const comaIdx = uriLocal.indexOf(",");
        if (comaIdx !== -1) {
          const header = uriLocal.substring(5, comaIdx);
          if (header.includes(";")) {
            contentType = header.split(";")[0] || "image/jpeg";
          }
          const base64Data = uriLocal.substring(comaIdx + 1);
          arrayBuffer = base64ToArrayBuffer(base64Data);
        } else {
          arrayBuffer = base64ToArrayBuffer(uriLocal);
        }
      }
    } else {
      const respuesta = await fetch(uriLocal);
      arrayBuffer = await respuesta.arrayBuffer();
      const headerType = respuesta.headers?.get?.("content-type");
      if (headerType) {
        contentType = headerType;
      }
    }

    let extension = ".jpg";
    if (contentType.includes("png")) {
      extension = ".png";
    } else if (contentType.includes("webp")) {
      extension = ".webp";
    } else if (contentType.includes("gif")) {
      extension = ".gif";
    } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      extension = ".jpg";
    }

    const rutaArchivo = `${idCafeteria}/${idProducto}-${Date.now()}${extension}`;
    const supabase = obtener_supabase();

    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase.storage
          .from("productos")
          .upload(rutaArchivo, arrayBuffer, {
            contentType,
            upsert: true,
          }),
      alReintentar,
    );

    if (fallo_red) {
      return { urlPublica: null, fallo_red: true };
    }

    if (resultado?.error) {
      if (es_error_red_o_timeout(resultado.error)) {
        return { urlPublica: null, fallo_red: true, error: (resultado.error as { message?: string })?.message };
      }
      return {
        urlPublica: null,
        fallo_red: false,
        error: (resultado.error as { message?: string })?.message,
      };
    }

    const { data } = supabase.storage
      .from("productos")
      .getPublicUrl(rutaArchivo);
    return { urlPublica: data.publicUrl, fallo_red: false };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const esErrorRed = es_error_red_o_timeout(err);
    return { urlPublica: null, fallo_red: esErrorRed, error: errorMsg };
  }
}

const claveProductos = (idCafeteria: string) =>
  `@orby_productos_${idCafeteria}`;
const claveCategorias = (idCafeteria: string) =>
  `@orby_categorias_${idCafeteria}`;
const claveCola = (idCafeteria: string) => `@orby_cola_catalogo_${idCafeteria}`;
const claveEstadisticas = (idCafeteria: string) =>
  `@orby_estadisticas_${idCafeteria}`;

// Punto de partida vacío: los números reales llegan de Supabase.
const ESTADISTICAS_VACIAS: EstadisticasVenta = {
  ventas_totales_diarias: 0,
  porcentaje_cambio_ventas: 0,
  pedidos_diarios: 0,
  porcentaje_cambio_pedidos: 0,
  productos_mas_vendidos: [],
};

type CatalogContextType = {
  productos: Producto[];
  categorias: Categoria[];
  estadisticas: EstadisticasVenta;
  cargandoCatalogo: boolean;
  pendientesSincronizar: number;
  sincronizandoCola: boolean;
  cambiarEstadoProducto: (
    id_producto: string,
    nuevoEstado: boolean,
    alReintentar?: CallbackReintento,
  ) => Promise<ResultadoOperacionCatalogo>;
  agregarProducto: (
    nuevo: Omit<Producto, "id_producto">,
    alReintentar?: CallbackReintento,
  ) => Promise<ResultadoOperacionCatalogo>;
  editarProducto: (
    id_producto: string,
    cambios: Partial<Omit<Producto, "id_producto">>,
    alReintentar?: CallbackReintento,
  ) => Promise<ResultadoOperacionCatalogo>;
  eliminarProducto: (
    id_producto: string,
    alReintentar?: CallbackReintento,
  ) => Promise<ResultadoOperacionCatalogo>;
  agregarCategoria: (
    nombre_categoria: string,
    alReintentar?: CallbackReintento,
  ) => Promise<ResultadoOperacionCatalogo>;
  editarCategoria: (
    id_categoria: string,
    nombre_categoria: string,
    alReintentar?: CallbackReintento,
  ) => Promise<ResultadoOperacionCatalogo>;
  eliminarCategoria: (
    id_categoria: string,
    alReintentar?: CallbackReintento,
  ) => Promise<ResultadoOperacionCatalogo>;
  recargarProductos: (alReintentar?: CallbackReintento) => Promise<void>;
  recargarEstadisticas: (alReintentar?: CallbackReintento) => Promise<void>;
  sincronizarColaPendiente: (
    alReintentar?: CallbackReintento,
  ) => Promise<{ sincronizados: number; pendientes: number }>;
};

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const idCafeteria = usuario?.id_cafeteria;

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [estadisticas, setEstadisticas] =
    useState<EstadisticasVenta>(ESTADISTICAS_VACIAS);
  const [cargandoCatalogo, setCargandoCatalogo] = useState<boolean>(true);
  const [colaPendiente, setColaPendiente] = useState<OperacionColaCatalogo[]>(
    [],
  );
  const [sincronizandoCola, setSincronizandoCola] = useState<boolean>(false);

  const sincronizandoRef = useRef(false);

  const guardarProductos = useCallback(
    async (nuevosProds: Producto[]) => {
      setProductos(nuevosProds);
      if (idCafeteria && esUuidValido(idCafeteria)) {
        await AsyncStorage.setItem(
          claveProductos(idCafeteria),
          JSON.stringify(nuevosProds),
        );
      }
    },
    [idCafeteria],
  );

  const guardarCategorias = useCallback(
    async (nuevasCats: Categoria[]) => {
      setCategorias(nuevasCats);
      if (idCafeteria && esUuidValido(idCafeteria)) {
        await AsyncStorage.setItem(
          claveCategorias(idCafeteria),
          JSON.stringify(nuevasCats),
        );
      }
    },
    [idCafeteria],
  );

  const encolarOperacion = useCallback(
    async (nuevaOp: Omit<OperacionColaCatalogo, "id_operacion" | "fecha">) => {
      if (!idCafeteria || !esUuidValido(idCafeteria)) return;

      try {
        const guardada = await AsyncStorage.getItem(claveCola(idCafeteria));
        let colaActual: OperacionColaCatalogo[] = guardada
          ? JSON.parse(guardada)
          : [];

        if (nuevaOp.accion === "editar") {
          const idxCrear = colaActual.findIndex(
            (op) =>
              op.tabla === nuevaOp.tabla &&
              op.id_registro === nuevaOp.id_registro &&
              op.accion === "crear",
          );
          if (idxCrear !== -1) {
            colaActual[idxCrear] = {
              ...colaActual[idxCrear],
              datos: { ...colaActual[idxCrear].datos, ...nuevaOp.datos },
            };
            await AsyncStorage.setItem(
              claveCola(idCafeteria),
              JSON.stringify(colaActual),
            );
            setColaPendiente(colaActual);
            return;
          }

          const idxEditar = colaActual.findIndex(
            (op) =>
              op.tabla === nuevaOp.tabla &&
              op.id_registro === nuevaOp.id_registro &&
              op.accion === "editar",
          );
          if (idxEditar !== -1) {
            colaActual[idxEditar] = {
              ...colaActual[idxEditar],
              datos: { ...colaActual[idxEditar].datos, ...nuevaOp.datos },
            };
            await AsyncStorage.setItem(
              claveCola(idCafeteria),
              JSON.stringify(colaActual),
            );
            setColaPendiente(colaActual);
            return;
          }
        } else if (nuevaOp.accion === "eliminar") {
          const idxCrear = colaActual.findIndex(
            (op) =>
              op.tabla === nuevaOp.tabla &&
              op.id_registro === nuevaOp.id_registro &&
              op.accion === "crear",
          );
          if (idxCrear !== -1) {
            colaActual = colaActual.filter((_, idx) => idx !== idxCrear);
            await AsyncStorage.setItem(
              claveCola(idCafeteria),
              JSON.stringify(colaActual),
            );
            setColaPendiente(colaActual);
            return;
          }

          colaActual = colaActual.filter(
            (op) =>
              !(
                op.tabla === nuevaOp.tabla &&
                op.id_registro === nuevaOp.id_registro &&
                op.accion === "editar"
              ),
          );
        }

        const opCompleta: OperacionColaCatalogo = {
          ...nuevaOp,
          id_operacion: generarUuid(),
          fecha: Date.now(),
        };
        colaActual.push(opCompleta);
        await AsyncStorage.setItem(
          claveCola(idCafeteria),
          JSON.stringify(colaActual),
        );
        setColaPendiente(colaActual);
      } catch (e) {
        console.warn("Error al encolar operación offline:", e);
      }
    },
    [idCafeteria],
  );

  const sincronizarColaPendiente = useCallback(
    async (
      alReintentar?: CallbackReintento,
    ): Promise<{ sincronizados: number; pendientes: number }> => {
      if (!idCafeteria || !esUuidValido(idCafeteria) || !supabase_configurado) {
        return { sincronizados: 0, pendientes: 0 };
      }
      if (sincronizandoRef.current) {
        return { sincronizados: 0, pendientes: colaPendiente.length };
      }

      sincronizandoRef.current = true;
      setSincronizandoCola(true);

      try {
        const guardada = await AsyncStorage.getItem(claveCola(idCafeteria));
        const colaActual: OperacionColaCatalogo[] = guardada
          ? JSON.parse(guardada)
          : [];

        if (colaActual.length === 0) {
          setColaPendiente([]);
          return { sincronizados: 0, pendientes: 0 };
        }

        let sincronizados = 0;
        let falloConexion = false;
        const restantes: OperacionColaCatalogo[] = [];
        const supabase = obtener_supabase();

        for (let i = 0; i < colaActual.length; i++) {
          const op = colaActual[i];
          if (falloConexion) {
            restantes.push(op);
            continue;
          }

          try {
            let redFallo = false;
            let resError: unknown = null;

            if (op.tabla === "categoria") {
              if (op.accion === "crear") {
                const { resultado, fallo_red } = await con_reintentos(
                  async () =>
                    await supabase.from("categoria").upsert({
                      id_categoria: op.id_registro,
                      id_cafeteria: idCafeteria,
                      nombre_categoria: op.datos?.nombre_categoria,
                    }),
                  alReintentar,
                );
                redFallo = fallo_red;
                resError = resultado?.error;
              } else if (op.accion === "editar") {
                const { resultado, fallo_red } = await con_reintentos(
                  async () =>
                    await supabase
                      .from("categoria")
                      .update(op.datos ?? {})
                      .eq("id_categoria", op.id_registro)
                      .eq("id_cafeteria", idCafeteria),
                  alReintentar,
                );
                redFallo = fallo_red;
                resError = resultado?.error;
              } else if (op.accion === "eliminar") {
                const { resultado, fallo_red } = await con_reintentos(
                  async () =>
                    await supabase
                      .from("categoria")
                      .delete()
                      .eq("id_categoria", op.id_registro)
                      .eq("id_cafeteria", idCafeteria),
                  alReintentar,
                );
                redFallo = fallo_red;
                resError = resultado?.error;
              }
            } else if (op.tabla === "producto") {
              if (
                (op.accion === "crear" || op.accion === "editar") &&
                typeof op.datos?.imagen_url === "string" &&
                esImagenLocal(op.datos.imagen_url)
              ) {
                const subida = await subirImagenProductoStorage(
                  op.datos.imagen_url,
                  idCafeteria,
                  op.id_registro,
                  alReintentar,
                );
                if (subida.fallo_red) {
                  falloConexion = true;
                  restantes.push(op);
                  continue;
                }
                if (subida.urlPublica) {
                  op.datos.imagen_url = subida.urlPublica;
                }
              }

              if (op.accion === "crear") {
                const { resultado, fallo_red } = await con_reintentos(
                  async () =>
                    await supabase.from("producto").upsert({
                      id_producto: op.id_registro,
                      id_cafeteria: idCafeteria,
                      id_categoria: op.datos?.id_categoria,
                      nombre_producto: op.datos?.nombre_producto,
                      descripcion: op.datos?.descripcion,
                      precio: op.datos?.precio,
                      imagen_url: op.datos?.imagen_url,
                      estado: op.datos?.estado,
                    }),
                  alReintentar,
                );
                redFallo = fallo_red;
                resError = resultado?.error;
              } else if (op.accion === "editar") {
                const { resultado, fallo_red } = await con_reintentos(
                  async () =>
                    await supabase
                      .from("producto")
                      .update(op.datos ?? {})
                      .eq("id_producto", op.id_registro)
                      .eq("id_cafeteria", idCafeteria),
                  alReintentar,
                );
                redFallo = fallo_red;
                resError = resultado?.error;
              } else if (op.accion === "eliminar") {
                const { resultado, fallo_red } = await con_reintentos(
                  async () =>
                    await supabase
                      .from("producto")
                      .delete()
                      .eq("id_producto", op.id_registro)
                      .eq("id_cafeteria", idCafeteria),
                  alReintentar,
                );
                redFallo = fallo_red;
                resError = resultado?.error;
              }
            }

            if (redFallo) {
              falloConexion = true;
              restantes.push(op);
            } else {
              if (resError) {
                console.warn("Error en operación de cola:", resError);
              }
              sincronizados++;
            }
          } catch (err) {
            console.warn("Excepción procesando operación de cola:", err);
            restantes.push(op);
          }
        }

        await AsyncStorage.setItem(
          claveCola(idCafeteria),
          JSON.stringify(restantes),
        );
        setColaPendiente(restantes);
        return { sincronizados, pendientes: restantes.length };
      } finally {
        sincronizandoRef.current = false;
        setSincronizandoCola(false);
      }
    },
    [idCafeteria, colaPendiente.length],
  );

  const recargarEstadisticas = useCallback(
    async (alReintentar?: CallbackReintento) => {
      if (!idCafeteria || !esUuidValido(idCafeteria) || !supabase_configurado) {
        return;
      }

      try {
        const supabase = obtener_supabase();

        // Fechas de referencia en UTC (coinciden con CURRENT_DATE de Postgres)
        const ahora = new Date();
        const inicioHoyUtc = new Date(
          Date.UTC(
            ahora.getUTCFullYear(),
            ahora.getUTCMonth(),
            ahora.getUTCDate(),
            0,
            0,
            0,
            0,
          ),
        );
        const inicioAyerUtc = new Date(
          Date.UTC(
            ahora.getUTCFullYear(),
            ahora.getUTCMonth(),
            ahora.getUTCDate() - 1,
            0,
            0,
            0,
            0,
          ),
        );

        const isoInicioHoy = inicioHoyUtc.toISOString();
        const isoInicioAyer = inicioAyerUtc.toISOString();

        // 1. Consultar comandas de hoy (cerradas id_estado = 2)
        const { resultado: resHoy } = await con_reintentos(
          async () =>
            await supabase
              .from("comanda")
              .select("id_comanda, total, fecha_creacion")
              .eq("id_cafeteria", idCafeteria)
              .eq("id_estado", 2)
              .gte("fecha_creacion", isoInicioHoy),
          alReintentar,
        );

        // 2. Consultar comandas de ayer (cerradas id_estado = 2)
        const { resultado: resAyer } = await con_reintentos(
          async () =>
            await supabase
              .from("comanda")
              .select("id_comanda, total, fecha_creacion")
              .eq("id_cafeteria", idCafeteria)
              .eq("id_estado", 2)
              .gte("fecha_creacion", isoInicioAyer)
              .lt("fecha_creacion", isoInicioHoy),
          alReintentar,
        );

        const comandasHoy =
          (resHoy?.data as { id_comanda: string; total: number | null }[]) ||
          [];
        const comandasAyer =
          (resAyer?.data as { id_comanda: string; total: number | null }[]) ||
          [];

        const ventasHoy = comandasHoy.reduce(
          (acc, c) => acc + (Number(c.total) || 0),
          0,
        );
        const pedidosHoy = comandasHoy.length;

        const ventasAyer = comandasAyer.reduce(
          (acc, c) => acc + (Number(c.total) || 0),
          0,
        );
        const pedidosAyer = comandasAyer.length;

        const porcentajeCambioVentas =
          ventasAyer > 0
            ? Math.round(((ventasHoy - ventasAyer) / ventasAyer) * 100)
            : ventasHoy > 0
              ? 100
              : 0;

        const porcentajeCambioPedidos =
          pedidosAyer > 0
            ? Math.round(((pedidosHoy - pedidosAyer) / pedidosAyer) * 100)
            : pedidosHoy > 0
              ? 100
              : 0;

        // 3. Consultar detalles de comandas de hoy para top 4 productos más vendidos
        const idsHoy = comandasHoy.map((c) => c.id_comanda);
        let topProductos: { posicion: number; nombre: string; cantidad: number }[] = [];

        if (idsHoy.length > 0) {
          const { resultado: resDetalles } = await con_reintentos(
            async () =>
              await supabase
                .from("detalle_comanda")
                .select("id_producto, cantidad, producto(nombre_producto)")
                .in("id_comanda", idsHoy),
            alReintentar,
          );

          if (resDetalles?.data && Array.isArray(resDetalles.data)) {
            const mapaConteo = new Map<string, { nombre: string; cantidad: number }>();

            for (const item of (resDetalles.data as unknown as {
              id_producto: string;
              cantidad: number;
              producto?: { nombre_producto: string } | { nombre_producto: string }[] | null;
            }[])) {
              const nombre = Array.isArray(item.producto)
                ? item.producto[0]?.nombre_producto || "Producto"
                : item.producto?.nombre_producto || "Producto";
              const actual = mapaConteo.get(item.id_producto) || {
                nombre,
                cantidad: 0,
              };
              actual.cantidad += Number(item.cantidad) || 0;
              mapaConteo.set(item.id_producto, actual);
            }

            topProductos = Array.from(mapaConteo.values())
              .sort((a, b) => b.cantidad - a.cantidad)
              .slice(0, 4)
              .map((p, idx) => ({
                posicion: idx + 1,
                nombre: p.nombre,
                cantidad: p.cantidad,
              }));
          }
        }

        const nuevasEstadisticas: EstadisticasVenta = {
          ventas_totales_diarias: Math.round(ventasHoy),
          porcentaje_cambio_ventas: porcentajeCambioVentas,
          pedidos_diarios: pedidosHoy,
          porcentaje_cambio_pedidos: porcentajeCambioPedidos,
          productos_mas_vendidos: topProductos,
        };

        setEstadisticas(nuevasEstadisticas);
        await AsyncStorage.setItem(
          claveEstadisticas(idCafeteria),
          JSON.stringify(nuevasEstadisticas),
        );
      } catch (err) {
        console.warn("Error al recargar estadísticas desde Supabase:", err);
      }
    },
    [idCafeteria],
  );

  const recargarDesdeSupabase = useCallback(
    async (alReintentar?: CallbackReintento) => {
      if (!idCafeteria || !esUuidValido(idCafeteria) || !supabase_configurado) {
        setCargandoCatalogo(false);
        return;
      }

      try {
        const guardadaCola = await AsyncStorage.getItem(claveCola(idCafeteria));
        const opsCola: OperacionColaCatalogo[] = guardadaCola
          ? JSON.parse(guardadaCola)
          : [];
        let colaQuedoVacia = opsCola.length === 0;

        if (!colaQuedoVacia) {
          const resSync = await sincronizarColaPendiente(alReintentar);
          colaQuedoVacia = resSync.pendientes === 0;
        }

        const supabase = obtener_supabase();

        const { resultado: resCat } = await con_reintentos(
          async () =>
            await supabase
              .from("categoria")
              .select("*")
              .eq("id_cafeteria", idCafeteria)
              .order("nombre_categoria"),
          alReintentar,
        );

        let catsActuales: Categoria[] = [];

        if (resCat && !resCat.error && Array.isArray(resCat.data)) {
          catsActuales = resCat.data.filter((c: Categoria) =>
            esUuidValido(c.id_categoria),
          );

          setCategorias(catsActuales);
          await AsyncStorage.setItem(
            claveCategorias(idCafeteria),
            JSON.stringify(catsActuales),
          );
        } else {
          const localCats = await AsyncStorage.getItem(
            claveCategorias(idCafeteria),
          );
          if (localCats) {
            const parsed = JSON.parse(localCats);
            catsActuales = parsed.filter((c: Categoria) =>
              esUuidValido(c.id_categoria),
            );
            setCategorias(catsActuales);
          }
        }

        const { resultado: resProd } = await con_reintentos(
          async () =>
            await supabase
              .from("producto")
              .select("*")
              .eq("id_cafeteria", idCafeteria)
              .order("nombre_producto"),
          alReintentar,
        );

        if (resProd && !resProd.error && Array.isArray(resProd.data)) {
          const mapaCat = new Map(
            catsActuales.map((c) => [c.id_categoria, c.nombre_categoria]),
          );
          const formateados: Producto[] = (resProd.data as Producto[])
            .filter((p) => esUuidValido(p.id_producto))
            .map((p) => ({
              id_producto: p.id_producto,
              id_cafeteria: p.id_cafeteria,
              id_categoria: p.id_categoria,
              nombre_categoria: mapaCat.get(p.id_categoria) ?? "General",
              nombre_producto: p.nombre_producto,
              descripcion: p.descripcion ?? "",
              precio: Number(p.precio),
              imagen_url: p.imagen_url,
              estado: p.estado,
            }));

          if (colaQuedoVacia) {
            setProductos(formateados);
            await AsyncStorage.setItem(
              claveProductos(idCafeteria),
              JSON.stringify(formateados),
            );
          }
        }

        await recargarEstadisticas(alReintentar);
      } catch (e) {
        console.warn("Error al recargar catálogo desde Supabase:", e);
      } finally {
        setCargandoCatalogo(false);
      }
    },
    [idCafeteria, sincronizarColaPendiente, recargarEstadisticas],
  );

  useEffect(() => {
    async function inicializar() {
      setCargandoCatalogo(true);
      if (!idCafeteria || !esUuidValido(idCafeteria)) {
        setProductos([]);
        setCategorias([]);
        setEstadisticas(ESTADISTICAS_VACIAS);
        setColaPendiente([]);
        setCargandoCatalogo(false);
        return;
      }

      try {
        const [prodsGuardados, catsGuardadas, colaGuardada, statsGuardadas] =
          await Promise.all([
            AsyncStorage.getItem(claveProductos(idCafeteria)),
            AsyncStorage.getItem(claveCategorias(idCafeteria)),
            AsyncStorage.getItem(claveCola(idCafeteria)),
            AsyncStorage.getItem(claveEstadisticas(idCafeteria)),
          ]);

        if (statsGuardadas) {
          try {
            const parsed = JSON.parse(statsGuardadas);
            if (parsed && typeof parsed.ventas_totales_diarias === "number") {
              setEstadisticas(parsed);
            }
          } catch (e) {
            console.warn("Error al parsear estadísticas en caché:", e);
          }
        }

        if (catsGuardadas) {
          const parsed = JSON.parse(catsGuardadas);
          if (Array.isArray(parsed)) {
            setCategorias(
              parsed.filter((c: Categoria) => esUuidValido(c.id_categoria)),
            );
          }
        }

        if (prodsGuardados) {
          const parsed = JSON.parse(prodsGuardados);
          if (Array.isArray(parsed)) {
            setProductos(
              parsed.filter((p: Producto) => esUuidValido(p.id_producto)),
            );
          }
        }

        if (colaGuardada) {
          const parsed = JSON.parse(colaGuardada);
          if (Array.isArray(parsed)) {
            setColaPendiente(parsed);
          }
        }
      } catch (e) {
        console.warn("Error al leer caché local de catálogo:", e);
      } finally {
        if (supabase_configurado) {
          recargarDesdeSupabase().catch(console.warn);
        } else {
          setCargandoCatalogo(false);
        }
      }
    }

    inicializar();
  }, [idCafeteria, recargarDesdeSupabase]);

  useEffect(() => {
    if (!idCafeteria || !esUuidValido(idCafeteria) || !supabase_configurado) {
      return;
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && colaPendiente.length > 0) {
          sincronizarColaPendiente().catch(console.warn);
        }
      },
    );

    let intervalo: ReturnType<typeof setInterval> | null = null;
    if (colaPendiente.length > 0) {
      intervalo = setInterval(() => {
        sincronizarColaPendiente().catch(console.warn);
      }, 12000);
    }

    return () => {
      subscription.remove();
      if (intervalo) clearInterval(intervalo);
    };
  }, [idCafeteria, colaPendiente.length, sincronizarColaPendiente]);

  const cambiarEstadoProducto = async (
    id_producto: string,
    nuevoEstado: boolean,
    alReintentar?: CallbackReintento,
  ): Promise<ResultadoOperacionCatalogo> => {
    if (!supabase_configurado || !idCafeteria || !esUuidValido(idCafeteria)) {
      const actualizados = productos.map((p) =>
        p.id_producto === id_producto ? { ...p, estado: nuevoEstado } : p,
      );
      await guardarProductos(actualizados);
      return { exito: true, enCola: false };
    }

    const supabase = obtener_supabase();
    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase
          .from("producto")
          .update({ estado: nuevoEstado })
          .eq("id_producto", id_producto)
          .eq("id_cafeteria", idCafeteria),
      alReintentar,
    );

    if (fallo_red) {
      const actualizados = productos.map((p) =>
        p.id_producto === id_producto ? { ...p, estado: nuevoEstado } : p,
      );
      await guardarProductos(actualizados);
      await encolarOperacion({
        tabla: "producto",
        accion: "editar",
        id_registro: id_producto,
        datos: { estado: nuevoEstado },
      });
      return { exito: true, enCola: true };
    }

    if (resultado?.error) {
      return { exito: false, error: traducir_error(resultado.error) };
    }

    const actualizados = productos.map((p) =>
      p.id_producto === id_producto ? { ...p, estado: nuevoEstado } : p,
    );
    await guardarProductos(actualizados);
    return { exito: true, enCola: false };
  };

  const agregarProducto = async (
    nuevo: Omit<Producto, "id_producto">,
    alReintentar?: CallbackReintento,
  ): Promise<ResultadoOperacionCatalogo> => {
    const idNuevo = generarUuid();
    const catEncontrada = categorias.find(
      (c) => c.id_categoria === nuevo.id_categoria,
    );
    const productoCompleto: Producto = {
      ...nuevo,
      id_producto: idNuevo,
      id_cafeteria: idCafeteria ?? "00000000-0000-0000-0000-000000000001",
      nombre_categoria:
        catEncontrada?.nombre_categoria ?? nuevo.nombre_categoria ?? "General",
      descripcion: nuevo.descripcion ?? "",
      precio: Number(nuevo.precio),
      imagen_url: nuevo.imagen_url,
      estado: nuevo.estado ?? true,
    };

    if (!supabase_configurado || !idCafeteria || !esUuidValido(idCafeteria)) {
      const actualizados = [productoCompleto, ...productos];
      await guardarProductos(actualizados);
      return { exito: true, enCola: false };
    }

    let urlFinal: string | null = nuevo.imagen_url ?? null;

    if (esImagenLocal(nuevo.imagen_url)) {
      const subida = await subirImagenProductoStorage(
        nuevo.imagen_url!,
        idCafeteria,
        idNuevo,
        alReintentar,
      );

      if (subida.fallo_red) {
        const actualizados = [productoCompleto, ...productos];
        await guardarProductos(actualizados);
        await encolarOperacion({
          tabla: "producto",
          accion: "crear",
          id_registro: idNuevo,
          datos: {
            id_producto: idNuevo,
            id_cafeteria: idCafeteria,
            id_categoria: nuevo.id_categoria,
            nombre_producto: nuevo.nombre_producto,
            descripcion: nuevo.descripcion ?? "",
            precio: Number(nuevo.precio),
            imagen_url: nuevo.imagen_url,
            estado: nuevo.estado ?? true,
          },
        });
        return { exito: true, enCola: true };
      }

      if (subida.error) {
        return {
          exito: false,
          error: `No se pudo subir la imagen a Supabase Storage: ${subida.error}`,
        };
      }

      if (subida.urlPublica) {
        urlFinal = subida.urlPublica;
        productoCompleto.imagen_url = subida.urlPublica;
      }
    }

    const payload = {
      id_producto: idNuevo,
      id_cafeteria: idCafeteria,
      id_categoria: nuevo.id_categoria,
      nombre_producto: nuevo.nombre_producto,
      descripcion: nuevo.descripcion ?? "",
      precio: Number(nuevo.precio),
      imagen_url: urlFinal,
      estado: nuevo.estado ?? true,
    };

    const supabase = obtener_supabase();
    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase.from("producto").insert(payload).select().single(),
      alReintentar,
    );

    if (fallo_red) {
      const actualizados = [productoCompleto, ...productos];
      await guardarProductos(actualizados);
      await encolarOperacion({
        tabla: "producto",
        accion: "crear",
        id_registro: idNuevo,
        datos: payload,
      });
      return { exito: true, enCola: true };
    }

    if (resultado?.error) {
      return { exito: false, error: traducir_error(resultado.error) };
    }

    if (resultado?.data?.id_producto) {
      productoCompleto.id_producto = resultado.data.id_producto;
    }
    const actualizados = [productoCompleto, ...productos];
    await guardarProductos(actualizados);
    return { exito: true, enCola: false };
  };

  const editarProducto = async (
    id_producto: string,
    cambios: Partial<Omit<Producto, "id_producto">>,
    alReintentar?: CallbackReintento,
  ): Promise<ResultadoOperacionCatalogo> => {
    const catEncontrada = cambios.id_categoria
      ? categorias.find((c) => c.id_categoria === cambios.id_categoria)
      : undefined;

    const aplicarCambiosLocal = (
      prods: Producto[],
      cambiosAplicar: Partial<Omit<Producto, "id_producto">>,
    ): Producto[] =>
      prods.map((p) => {
        if (p.id_producto !== id_producto) return p;
        return {
          ...p,
          ...cambiosAplicar,
          nombre_categoria:
            catEncontrada?.nombre_categoria ?? p.nombre_categoria,
          precio:
            cambiosAplicar.precio !== undefined
              ? Number(cambiosAplicar.precio)
              : p.precio,
        };
      });

    if (!supabase_configurado || !idCafeteria || !esUuidValido(idCafeteria)) {
      const actualizados = aplicarCambiosLocal(productos, cambios);
      await guardarProductos(actualizados);
      return { exito: true, enCola: false };
    }

    const cambiosEfectivos = { ...cambios };

    if (esImagenLocal(cambios.imagen_url)) {
      const subida = await subirImagenProductoStorage(
        cambios.imagen_url!,
        idCafeteria,
        id_producto,
        alReintentar,
      );

      if (subida.fallo_red) {
        const actualizados = aplicarCambiosLocal(productos, cambios);
        await guardarProductos(actualizados);
        const payloadOffline: Record<string, unknown> = {};
        if (cambios.nombre_producto !== undefined)
          payloadOffline.nombre_producto = cambios.nombre_producto;
        if (cambios.descripcion !== undefined)
          payloadOffline.descripcion = cambios.descripcion;
        if (cambios.precio !== undefined)
          payloadOffline.precio = Number(cambios.precio);
        if (cambios.imagen_url !== undefined)
          payloadOffline.imagen_url = cambios.imagen_url;
        if (cambios.id_categoria !== undefined)
          payloadOffline.id_categoria = cambios.id_categoria;
        if (cambios.estado !== undefined)
          payloadOffline.estado = cambios.estado;

        await encolarOperacion({
          tabla: "producto",
          accion: "editar",
          id_registro: id_producto,
          datos: payloadOffline,
        });
        return { exito: true, enCola: true };
      }

      if (subida.error) {
        return {
          exito: false,
          error: `No se pudo subir la imagen a Supabase Storage: ${subida.error}`,
        };
      }

      if (subida.urlPublica) {
        cambiosEfectivos.imagen_url = subida.urlPublica;
      }
    }

    const payload: Record<string, unknown> = {};
    if (cambiosEfectivos.nombre_producto !== undefined)
      payload.nombre_producto = cambiosEfectivos.nombre_producto;
    if (cambiosEfectivos.descripcion !== undefined)
      payload.descripcion = cambiosEfectivos.descripcion;
    if (cambiosEfectivos.precio !== undefined)
      payload.precio = Number(cambiosEfectivos.precio);
    if (cambiosEfectivos.imagen_url !== undefined)
      payload.imagen_url = cambiosEfectivos.imagen_url;
    if (cambiosEfectivos.id_categoria !== undefined)
      payload.id_categoria = cambiosEfectivos.id_categoria;
    if (cambiosEfectivos.estado !== undefined)
      payload.estado = cambiosEfectivos.estado;

    const supabase = obtener_supabase();
    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase
          .from("producto")
          .update(payload)
          .eq("id_producto", id_producto)
          .eq("id_cafeteria", idCafeteria),
      alReintentar,
    );

    if (fallo_red) {
      const actualizados = aplicarCambiosLocal(productos, cambiosEfectivos);
      await guardarProductos(actualizados);
      await encolarOperacion({
        tabla: "producto",
        accion: "editar",
        id_registro: id_producto,
        datos: payload,
      });
      return { exito: true, enCola: true };
    }

    if (resultado?.error) {
      return { exito: false, error: traducir_error(resultado.error) };
    }

    const actualizados = aplicarCambiosLocal(productos, cambiosEfectivos);
    await guardarProductos(actualizados);
    return { exito: true, enCola: false };
  };

  const eliminarProducto = async (
    id_producto: string,
    alReintentar?: CallbackReintento,
  ): Promise<ResultadoOperacionCatalogo> => {
    if (!supabase_configurado || !idCafeteria || !esUuidValido(idCafeteria)) {
      const actualizados = productos.filter(
        (p) => p.id_producto !== id_producto,
      );
      await guardarProductos(actualizados);
      return { exito: true, enCola: false };
    }

    const supabase = obtener_supabase();
    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase
          .from("producto")
          .delete()
          .eq("id_producto", id_producto)
          .eq("id_cafeteria", idCafeteria),
      alReintentar,
    );

    if (fallo_red) {
      const actualizados = productos.filter(
        (p) => p.id_producto !== id_producto,
      );
      await guardarProductos(actualizados);
      await encolarOperacion({
        tabla: "producto",
        accion: "eliminar",
        id_registro: id_producto,
      });
      return { exito: true, enCola: true };
    }

    if (resultado?.error) {
      return { exito: false, error: traducir_error(resultado.error) };
    }

    const actualizados = productos.filter((p) => p.id_producto !== id_producto);
    await guardarProductos(actualizados);
    return { exito: true, enCola: false };
  };

  const agregarCategoria = async (
    nombre_categoria: string,
    alReintentar?: CallbackReintento,
  ): Promise<ResultadoOperacionCatalogo> => {
    const nombreLimpio = nombre_categoria.trim();
    if (!nombreLimpio) {
      return {
        exito: false,
        error: "El nombre de la categoría no puede estar vacío.",
      };
    }

    const idNuevo = generarUuid();
    const categoriaNueva: Categoria = {
      id_categoria: idNuevo,
      id_cafeteria: idCafeteria,
      nombre_categoria: nombreLimpio,
    };

    if (!supabase_configurado || !idCafeteria || !esUuidValido(idCafeteria)) {
      const actualizadas = [...categorias, categoriaNueva];
      await guardarCategorias(actualizadas);
      return { exito: true, enCola: false };
    }

    const payload = {
      id_categoria: idNuevo,
      id_cafeteria: idCafeteria,
      nombre_categoria: nombreLimpio,
    };

    const supabase = obtener_supabase();
    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase.from("categoria").insert(payload).select().single(),
      alReintentar,
    );

    if (fallo_red) {
      const actualizadas = [...categorias, categoriaNueva];
      await guardarCategorias(actualizadas);
      await encolarOperacion({
        tabla: "categoria",
        accion: "crear",
        id_registro: idNuevo,
        datos: payload,
      });
      return { exito: true, enCola: true };
    }

    if (resultado?.error) {
      return { exito: false, error: traducir_error(resultado.error) };
    }

    if (resultado?.data?.id_categoria) {
      categoriaNueva.id_categoria = resultado.data.id_categoria;
    }
    const actualizadas = [...categorias, categoriaNueva];
    await guardarCategorias(actualizadas);
    return { exito: true, enCola: false };
  };

  const editarCategoria = async (
    id_categoria: string,
    nombre_categoria: string,
    alReintentar?: CallbackReintento,
  ): Promise<ResultadoOperacionCatalogo> => {
    const nombreLimpio = nombre_categoria.trim();
    if (!nombreLimpio) {
      return {
        exito: false,
        error: "El nombre de la categoría no puede estar vacío.",
      };
    }

    const aplicarEdicionLocal = async () => {
      const actualizadas = categorias.map((c) =>
        c.id_categoria === id_categoria
          ? { ...c, nombre_categoria: nombreLimpio }
          : c,
      );
      await guardarCategorias(actualizadas);

      const productosActualizados = productos.map((p) =>
        p.id_categoria === id_categoria
          ? { ...p, nombre_categoria: nombreLimpio }
          : p,
      );
      await guardarProductos(productosActualizados);
    };

    if (!supabase_configurado || !idCafeteria || !esUuidValido(idCafeteria)) {
      await aplicarEdicionLocal();
      return { exito: true, enCola: false };
    }

    const payload = {
      nombre_categoria: nombreLimpio,
    };

    const supabase = obtener_supabase();
    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase
          .from("categoria")
          .update(payload)
          .eq("id_categoria", id_categoria)
          .eq("id_cafeteria", idCafeteria),
      alReintentar,
    );

    if (fallo_red) {
      await aplicarEdicionLocal();
      await encolarOperacion({
        tabla: "categoria",
        accion: "editar",
        id_registro: id_categoria,
        datos: payload,
      });
      return { exito: true, enCola: true };
    }

    if (resultado?.error) {
      return { exito: false, error: traducir_error(resultado.error) };
    }

    await aplicarEdicionLocal();
    return { exito: true, enCola: false };
  };

  const eliminarCategoria = async (
    id_categoria: string,
    alReintentar?: CallbackReintento,
  ): Promise<ResultadoOperacionCatalogo> => {
    const tieneProductos = productos.some(
      (p) => p.id_categoria === id_categoria,
    );
    if (tieneProductos) {
      return {
        exito: false,
        error:
          "No puedes eliminar esta categoría porque tiene productos asociados. Cambia o elimina primero esos productos.",
      };
    }

    if (!supabase_configurado || !idCafeteria || !esUuidValido(idCafeteria)) {
      const actualizadas = categorias.filter(
        (c) => c.id_categoria !== id_categoria,
      );
      await guardarCategorias(actualizadas);
      return { exito: true, enCola: false };
    }

    const supabase = obtener_supabase();
    const { resultado, fallo_red } = await con_reintentos(
      async () =>
        await supabase
          .from("categoria")
          .delete()
          .eq("id_categoria", id_categoria)
          .eq("id_cafeteria", idCafeteria),
      alReintentar,
    );

    if (fallo_red) {
      const actualizadas = categorias.filter(
        (c) => c.id_categoria !== id_categoria,
      );
      await guardarCategorias(actualizadas);
      await encolarOperacion({
        tabla: "categoria",
        accion: "eliminar",
        id_registro: id_categoria,
      });
      return { exito: true, enCola: true };
    }

    if (resultado?.error) {
      return { exito: false, error: traducir_error(resultado.error) };
    }

    const actualizadas = categorias.filter(
      (c) => c.id_categoria !== id_categoria,
    );
    await guardarCategorias(actualizadas);
    return { exito: true, enCola: false };
  };

  return (
    <CatalogContext.Provider
      value={{
        productos,
        categorias,
        estadisticas,
        cargandoCatalogo,
        pendientesSincronizar: colaPendiente.length,
        sincronizandoCola,
        cambiarEstadoProducto,
        agregarProducto,
        editarProducto,
        eliminarProducto,
        agregarCategoria,
        editarCategoria,
        eliminarCategoria,
        recargarProductos: recargarDesdeSupabase,
        recargarEstadisticas,
        sincronizarColaPendiente,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog debe usarse dentro de un CatalogProvider");
  }
  return context;
}
