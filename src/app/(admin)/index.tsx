import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AdminBottomNav } from '@/components/AdminBottomNav';
import { CustomButton } from '@/components/CustomButton';
import { MetricCard } from '@/components/MetricCard';
import { UserHeader } from '@/components/UserHeader';
import { useAuth } from '@/context/auth-context';
import { useCatalog } from '@/context/catalog-context';
import { useOrders } from '@/context/orders-context';
import { espaciado, fuentes, radios, useTema } from '@/theme';
import { es_error_red_o_timeout } from '@/lib/auth';
import { mostrarAviso } from '@/lib/confirm'; // Avisos con el diseño de Orby (reemplaza Alert.alert, que no funciona en web)
import {
  generarHtmlReporte,
  obtenerDatosReporte,
  verificarConexionServidor,
} from '@/lib/pdf-report';

type TipoPeriodo = 'dia' | 'semana' | 'mes';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const ANIOS = [2024, 2025, 2026, 2027];

const pad2 = (num: number) => num.toString().padStart(2, '0');
const formatearFechaDDMMAAAA = (fecha: Date) =>
  `${pad2(fecha.getDate())}/${pad2(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
const obtenerDiasEnMes = (anio: number, mes: number) => new Date(anio, mes + 1, 0).getDate();

export default function AdminHomeScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { estadisticas, recargarEstadisticas, cargandoCatalogo } = useCatalog();
  const { mesas } = useOrders();
  const [refrescandoManual, setRefrescandoManual] = useState(false);

  // Estados del modal interactivo de descarga de reporte
  const [modalReporteVisible, setModalReporteVisible] = useState(false);
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('dia');
  const [generandoReporte, setGenerandoReporte] = useState(false);

  // Estados de selección de fecha dinámica
  const hoyInicial = useMemo(() => new Date(), []);
  const anioPorDefecto = ANIOS.includes(hoyInicial.getFullYear()) ? hoyInicial.getFullYear() : 2026;

  // 1. Pestaña Día
  const [diaDia, setDiaDia] = useState<number>(hoyInicial.getDate());
  const [mesDia, setMesDia] = useState<number>(hoyInicial.getMonth());
  const [anioDia, setAnioDia] = useState<number>(anioPorDefecto);

  // 2. Pestaña Semana (fecha de inicio)
  const [diaSemana, setDiaSemana] = useState<number>(hoyInicial.getDate());
  const [mesSemana, setMesSemana] = useState<number>(hoyInicial.getMonth());
  const [anioSemana, setAnioSemana] = useState<number>(anioPorDefecto);

  // 3. Pestaña Mes
  const [mesMes, setMesMes] = useState<number>(hoyInicial.getMonth());
  const [anioMes, setAnioMes] = useState<number>(anioPorDefecto);

  const bordeTabla = { borderColor: colores.text };

  const handleRefresh = useCallback(async () => {
    setRefrescandoManual(true);
    try {
      await recargarEstadisticas();
    } finally {
      setRefrescandoManual(false);
    }
  }, [recargarEstadisticas]);

  const pestanasTipo = useMemo<{ id: TipoPeriodo; etiqueta: string }[]>(
    () => [
      { id: 'dia', etiqueta: '☀️ Día' },
      { id: 'semana', etiqueta: '📅 Semana' },
      { id: 'mes', etiqueta: '🗓️ Mes' },
    ],
    []
  );

  // Atajos rápidos para pestaña Por Día
  const seleccionarHoy = () => {
    const d = new Date();
    setDiaDia(d.getDate());
    setMesDia(d.getMonth());
    const anio = d.getFullYear();
    setAnioDia(ANIOS.includes(anio) ? anio : 2026);
  };

  const seleccionarAyer = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDiaDia(d.getDate());
    setMesDia(d.getMonth());
    const anio = d.getFullYear();
    setAnioDia(ANIOS.includes(anio) ? anio : 2026);
  };

  const handleCambiarMesDia = (nuevoMes: number) => {
    setMesDia(nuevoMes);
    const max = obtenerDiasEnMes(anioDia, nuevoMes);
    if (diaDia > max) setDiaDia(max);
  };

  const handleCambiarAnioDia = (nuevoAnio: number) => {
    setAnioDia(nuevoAnio);
    const max = obtenerDiasEnMes(nuevoAnio, mesDia);
    if (diaDia > max) setDiaDia(max);
  };

  const handleCambiarMesSemana = (nuevoMes: number) => {
    setMesSemana(nuevoMes);
    const max = obtenerDiasEnMes(anioSemana, nuevoMes);
    if (diaSemana > max) setDiaSemana(max);
  };

  const handleCambiarAnioSemana = (nuevoAnio: number) => {
    setAnioSemana(nuevoAnio);
    const max = obtenerDiasEnMes(nuevoAnio, mesSemana);
    if (diaSemana > max) setDiaSemana(max);
  };

  const calcularRangoFechas = useCallback(
    (tipo: TipoPeriodo) => {
      if (tipo === 'dia') {
        const maxDias = obtenerDiasEnMes(anioDia, mesDia);
        const diaAjustado = Math.min(diaDia, maxDias);
        const inicio = new Date(anioDia, mesDia, diaAjustado, 0, 0, 0, 0);
        const fin = new Date(anioDia, mesDia, diaAjustado, 23, 59, 59, 999);
        const diaStr = formatearFechaDDMMAAAA(inicio);
        return {
          inicio,
          fin,
          tituloPeriodo: `Reporte del día: ${diaStr}`,
        };
      }

      if (tipo === 'semana') {
        const maxDias = obtenerDiasEnMes(anioSemana, mesSemana);
        const diaAjustado = Math.min(diaSemana, maxDias);
        const inicio = new Date(anioSemana, mesSemana, diaAjustado, 0, 0, 0, 0);
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + 6);
        fin.setHours(23, 59, 59, 999);
        return {
          inicio,
          fin,
          tituloPeriodo: `Semana del ${formatearFechaDDMMAAAA(inicio)} al ${formatearFechaDDMMAAAA(fin)}`,
        };
      }

      // Por Mes
      const inicio = new Date(anioMes, mesMes, 1, 0, 0, 0, 0);
      const fin = new Date(anioMes, mesMes + 1, 0, 23, 59, 59, 999);
      return {
        inicio,
        fin,
        tituloPeriodo: `Mes de: ${MESES[mesMes]} ${anioMes}`,
      };
    },
    [anioDia, mesDia, diaDia, anioSemana, mesSemana, diaSemana, anioMes, mesMes]
  );

  const rangoActual = useMemo(() => calcularRangoFechas(tipoPeriodo), [calcularRangoFechas, tipoPeriodo]);

  const handleGenerarYCompartirPdf = async () => {
    // 1. Verificación previa de conectividad
    const hayConexion = await verificarConexionServidor(2500);
    if (!hayConexion) {
      mostrarAviso(
        'Sin conexión a internet',
        'No se pudo conectar con el servidor. Revisa tu conexión a internet antes de generar el reporte.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    const idCafeteria = usuario?.id_cafeteria ?? '00000000-0000-0000-0000-000000000001';
    const { inicio, fin, tituloPeriodo } = calcularRangoFechas(tipoPeriodo);

    setGenerandoReporte(true);
    try {
      const datos = await obtenerDatosReporte(idCafeteria, inicio, fin);

      const ahora = new Date();
      const fechaEmision = ahora.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const nombreCafeteria = datos.nombreCafeteria || 'Cafetería Orby';

      const html = generarHtmlReporte(datos, {
        nombreCafeteria,
        tituloPeriodo,
        fechaEmision,
      });

      const { base64, uri: tempUri } = await Print.printToFileAsync({
        html,
        base64: true,
      });

      const nombreLimpio = `Reporte_${Date.now()}.pdf`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      const safeUri = `${baseDir.endsWith('/') ? baseDir : `${baseDir}/`}${nombreLimpio}`;

      if (base64) {
        await FileSystem.writeAsStringAsync(safeUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // Fallback si por alguna razón base64 no viene
        await FileSystem.copyAsync({
          from: tempUri,
          to: safeUri,
        });
      }

      const puedeCompartir = await Sharing.isAvailableAsync();
      if (puedeCompartir) {
        await Sharing.shareAsync(safeUri, {
          mimeType: 'application/pdf',
          UTI: '.pdf',
          dialogTitle: 'Reporte de Ventas Orby',
        });
        setModalReporteVisible(false);
      } else {
        mostrarAviso(
          'Compartir no disponible',
          'La función de compartir archivos no está disponible en este dispositivo.',
          [{ text: 'Aceptar' }]
        );
      }
    } catch (error) {
      const esSinConexion =
        (error instanceof Error && error.message === 'SIN_CONEXION_DURANTE_REPORTE') ||
        es_error_red_o_timeout(error);

      if (esSinConexion) {
        mostrarAviso(
          'Conexión perdida',
          'Se perdió la conexión a internet mientras se recopilaban los datos del reporte. Revisa tu red e inténtalo de nuevo.',
          [{ text: 'Aceptar' }]
        );
      } else {
        const mensaje = error instanceof Error ? error.message : 'No se pudo generar el reporte en PDF.';
        mostrarAviso('Error al generar reporte', mensaje, [{ text: 'Aceptar' }]);
      }
    } finally {
      setGenerandoReporte(false);
    }
  };

  const nombreAdmin = usuario?.nombre ?? 'Gael';
  const productos = estadisticas?.productos_mas_vendidos ?? [];
  const filasVaciasCount = Math.max(0, 4 - productos.length);
  const filasVacias = Array.from({ length: filasVaciasCount });

  const maxDiasPestanaDia = obtenerDiasEnMes(anioDia, mesDia);
  const maxDiasPestanaSemana = obtenerDiasEnMes(anioSemana, mesSemana);

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

        {/* Acceso rápido a Gestión de mesas */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/tables')}
          style={[
            estilos.tarjetaAccesoMesas,
            {
              backgroundColor: colores.surface,
              borderColor: colores.border,
            },
          ]}
        >
          <View
            style={[
              estilos.iconoAccesoMesas,
              { backgroundColor: colores.primary_soft },
            ]}
          >
            <Ionicons name="restaurant-outline" size={24} color={colores.primary_strong} />
          </View>
          <View style={estilos.infoAccesoMesas}>
            <Text style={[estilos.tituloAccesoMesas, { color: colores.text }]}>
              Gestión de mesas
            </Text>
            <Text style={[estilos.subtituloAccesoMesas, { color: colores.text_secondary }]}>
              {mesas.length} {mesas.length === 1 ? 'mesa registrada' : 'mesas registradas'}
            </Text>
          </View>
          <View
            style={[
              estilos.chevronContenedor,
              { backgroundColor: colores.surface_muted },
            ]}
          >
            <Ionicons name="chevron-forward" size={18} color={colores.text_secondary} />
          </View>
        </TouchableOpacity>

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
            onPress={() => setModalReporteVisible(true)}
            estilo={estilos.botonReporte}
          />
        </View>
      </ScrollView>

      {/* Modal interactivo de descarga de reporte con selección dinámica de fechas */}
      <Modal
        visible={modalReporteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!generandoReporte) {
            setModalReporteVisible(false);
          }
        }}
      >
        <View style={[estilos.modalOverlay, { backgroundColor: colores.overlay }]}>
          <Pressable
            style={estilos.modalBackdropPressable}
            onPress={() => {
              if (!generandoReporte) {
                setModalReporteVisible(false);
              }
            }}
          />
          <View style={[estilos.modalTarjeta, { backgroundColor: colores.surface, borderColor: colores.border }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={estilos.scrollModal}
            >
              <Text style={[estilos.modalTitulo, { color: colores.text }]}>Descargar reporte de ventas</Text>
              <Text style={[estilos.modalSubtitulo, { color: colores.text_secondary }]}>
                Personaliza libremente el rango de fechas para el reporte en PDF:
              </Text>

              {/* Selector de Tipo de Periodo */}
              <View style={estilos.contenedorSelectorTipo}>
                {pestanasTipo.map((tab) => {
                  const activo = tipoPeriodo === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setTipoPeriodo(tab.id)}
                      disabled={generandoReporte}
                      style={[
                        estilos.tabTipo,
                        {
                          backgroundColor: activo ? colores.primary : colores.surface_muted,
                          borderColor: activo ? colores.primary : colores.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.tabTipoTexto,
                          {
                            color: activo ? colores.on_primary : colores.text_secondary,
                            fontFamily: activo ? fuentes.bold : fuentes.regular,
                          },
                        ]}
                      >
                        {tab.etiqueta}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Contenido según pestaña */}
              {tipoPeriodo === 'dia' && (
                <View style={estilos.bloquePeriodo}>
                  {/* Atajos rápidos Hoy / Ayer */}
                  <View style={estilos.filaAtajos}>
                    <TouchableOpacity
                      onPress={seleccionarHoy}
                      disabled={generandoReporte}
                      style={[
                        estilos.botonAtajo,
                        { backgroundColor: colores.surface_muted, borderColor: colores.border },
                      ]}
                    >
                      <Text style={[estilos.textoAtajo, { color: colores.primary_strong }]}>⚡ Hoy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={seleccionarAyer}
                      disabled={generandoReporte}
                      style={[
                        estilos.botonAtajo,
                        { backgroundColor: colores.surface_muted, borderColor: colores.border },
                      ]}
                    >
                      <Text style={[estilos.textoAtajo, { color: colores.primary_strong }]}>⏪ Ayer</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Selector de Año */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Año:</Text>
                  <View style={estilos.filaChips}>
                    {ANIOS.map((anio) => {
                      const sel = anioDia === anio;
                      return (
                        <TouchableOpacity
                          key={anio}
                          disabled={generandoReporte}
                          onPress={() => handleCambiarAnioDia(anio)}
                          style={[
                            estilos.chipPequeno,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoChipPequeno,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                          >
                            {anio}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de Mes */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Mes:</Text>
                  <View style={estilos.rejillaMesesCortos}>
                    {MESES_CORTOS.map((mesNombre, idx) => {
                      const sel = mesDia === idx;
                      return (
                        <TouchableOpacity
                          key={mesNombre}
                          disabled={generandoReporte}
                          onPress={() => handleCambiarMesDia(idx)}
                          style={[
                            estilos.botonMesCorto,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoMesCorto,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                          >
                            {mesNombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de Día */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Día:</Text>
                  <View style={estilos.rejillaDias}>
                    {Array.from({ length: maxDiasPestanaDia }, (_, i) => i + 1).map((dia) => {
                      const sel = diaDia === dia;
                      return (
                        <TouchableOpacity
                          key={dia}
                          disabled={generandoReporte}
                          onPress={() => setDiaDia(dia)}
                          style={[
                            estilos.chipDiaCuadricula,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoChipDia,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                          >
                            {dia}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {tipoPeriodo === 'semana' && (
                <View style={estilos.bloquePeriodo}>
                  <Text style={[estilos.subtituloSeccion, { color: colores.text }]}>
                    Fecha de inicio de la semana (7 días):
                  </Text>

                  {/* Selector de Año */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Año:</Text>
                  <View style={estilos.filaChips}>
                    {ANIOS.map((anio) => {
                      const sel = anioSemana === anio;
                      return (
                        <TouchableOpacity
                          key={anio}
                          disabled={generandoReporte}
                          onPress={() => handleCambiarAnioSemana(anio)}
                          style={[
                            estilos.chipPequeno,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoChipPequeno,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                          >
                            {anio}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de Mes */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Mes:</Text>
                  <View style={estilos.rejillaMesesCortos}>
                    {MESES_CORTOS.map((mesNombre, idx) => {
                      const sel = mesSemana === idx;
                      return (
                        <TouchableOpacity
                          key={mesNombre}
                          disabled={generandoReporte}
                          onPress={() => handleCambiarMesSemana(idx)}
                          style={[
                            estilos.botonMesCorto,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoMesCorto,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                          >
                            {mesNombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de Día */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Día de inicio:</Text>
                  <View style={estilos.rejillaDias}>
                    {Array.from({ length: maxDiasPestanaSemana }, (_, i) => i + 1).map((dia) => {
                      const sel = diaSemana === dia;
                      return (
                        <TouchableOpacity
                          key={dia}
                          disabled={generandoReporte}
                          onPress={() => setDiaSemana(dia)}
                          style={[
                            estilos.chipDiaCuadricula,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoChipDia,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                          >
                            {dia}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {tipoPeriodo === 'mes' && (
                <View style={estilos.bloquePeriodo}>
                  {/* Selector de Año */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Año:</Text>
                  <View style={estilos.filaChips}>
                    {ANIOS.map((anio) => {
                      const sel = anioMes === anio;
                      return (
                        <TouchableOpacity
                          key={anio}
                          disabled={generandoReporte}
                          onPress={() => setAnioMes(anio)}
                          style={[
                            estilos.chipPequeno,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoChipPequeno,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                          >
                            {anio}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de los 12 meses en cuadrícula compacta */}
                  <Text style={[estilos.etiquetaCampo, { color: colores.text_secondary }]}>Mes:</Text>
                  <View style={estilos.rejillaMeses}>
                    {MESES.map((nombreCompleto, idx) => {
                      const sel = mesMes === idx;
                      return (
                        <TouchableOpacity
                          key={nombreCompleto}
                          disabled={generandoReporte}
                          onPress={() => setMesMes(idx)}
                          style={[
                            estilos.botonMesCuadricula,
                            {
                              backgroundColor: sel ? colores.primary : colores.surface_muted,
                              borderColor: sel ? colores.primary : colores.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoMesCuadricula,
                              {
                                color: sel ? colores.on_primary : colores.text,
                                fontFamily: sel ? fuentes.bold : fuentes.regular,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {nombreCompleto}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Indicador visible del rango seleccionado */}
              <View
                style={[
                  estilos.bannerResumen,
                  {
                    backgroundColor: colores.primary_subtle,
                    borderColor: colores.primary,
                  },
                ]}
              >
                <Text style={[estilos.bannerTexto, { color: colores.primary_strong }]}>
                  {rangoActual.tituloPeriodo}
                </Text>
              </View>

              {/* Botones de acción */}
              <View style={estilos.modalAcciones}>
                <CustomButton
                  titulo={generandoReporte ? 'Consultando datos de ventas...' : 'Generar y compartir PDF'}
                  variante="primary"
                  cargando={generandoReporte}
                  onPress={handleGenerarYCompartirPdf}
                />
                <CustomButton
                  titulo="Cancelar"
                  variante="outline"
                  deshabilitado={generandoReporte}
                  onPress={() => setModalReporteVisible(false)}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    marginBottom: espaciado.md,
  },
  tarjetaAccesoMesas: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1.5,
    marginBottom: espaciado.md,
  },
  iconoAccesoMesas: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espaciado.md,
  },
  infoAccesoMesas: {
    flex: 1,
  },
  tituloAccesoMesas: {
    fontFamily: fuentes.bold,
    fontSize: 16,
    marginBottom: 2,
  },
  subtituloAccesoMesas: {
    fontFamily: fuentes.regular,
    fontSize: 13,
  },
  chevronContenedor: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: espaciado.md,
  },
  modalBackdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalTarjeta: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: espaciado.md,
    zIndex: 1,
  },
  scrollModal: {
    paddingBottom: espaciado.sm,
  },
  modalTitulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    marginBottom: espaciado.xs,
  },
  modalSubtitulo: {
    fontFamily: fuentes.regular,
    fontSize: 13,
    marginBottom: espaciado.sm,
  },
  contenedorSelectorTipo: {
    flexDirection: 'row',
    gap: espaciado.xs,
    marginBottom: espaciado.md,
  },
  tabTipo: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTipoTexto: {
    fontSize: 14,
  },
  bloquePeriodo: {
    marginBottom: espaciado.md,
  },
  filaAtajos: {
    flexDirection: 'row',
    gap: espaciado.sm,
    marginBottom: espaciado.sm,
  },
  botonAtajo: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAtajo: {
    fontFamily: fuentes.bold,
    fontSize: 13,
  },
  etiquetaCampo: {
    fontFamily: fuentes.bold,
    fontSize: 12,
    marginTop: espaciado.xs,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtituloSeccion: {
    fontFamily: fuentes.bold,
    fontSize: 13,
    marginBottom: espaciado.xs,
  },
  filaChips: {
    flexDirection: 'row',
    gap: espaciado.xs,
    marginBottom: espaciado.xs,
  },
  rejillaMesesCortos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: espaciado.xs,
  },
  botonMesCorto: {
    width: '23.3%',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoMesCorto: {
    fontSize: 12,
  },
  rejillaDias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: espaciado.xs,
  },
  chipDiaCuadricula: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoChipDia: {
    fontSize: 13,
  },
  chipPequeno: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoChipPequeno: {
    fontSize: 13,
  },
  rejillaMeses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: espaciado.xs,
  },
  botonMesCuadricula: {
    width: '31.5%',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoMesCuadricula: {
    fontSize: 12,
  },
  bannerResumen: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: espaciado.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espaciado.md,
  },
  bannerTexto: {
    fontFamily: fuentes.bold,
    fontSize: 14,
    textAlign: 'center',
  },
  modalAcciones: {
    gap: espaciado.sm,
  },
});

