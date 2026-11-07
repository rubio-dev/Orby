import { Ionicons } from '@expo/vector-icons'; // Íconos
import { useFocusEffect, useRouter } from 'expo-router'; // Navegación y recarga al volver a la pantalla
import React, { useCallback, useState } from 'react'; // Estado de React
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // Componentes base
import { SafeAreaView } from 'react-native-safe-area-context'; // Respeta el notch y la barra del sistema

import { AdminBottomNav } from '@/components/AdminBottomNav'; // Barra inferior del administrador
import { ScreenHeader } from '@/components/ScreenHeader'; // Encabezado con flecha de regreso
import { useAuth } from '@/context/auth-context'; // Administrador con sesión iniciada
import { con_reintentos, MENSAJE_SIN_CONEXION } from '@/lib/auth'; // Manejo resiliente de red
import { confirmarAccion, mostrarAviso } from '@/lib/confirm'; // Alertas y confirmaciones
import { supabase_configurado } from '@/lib/env'; // Saber si hay conexión configurada
import { obtener_supabase } from '@/lib/supabase'; // Cliente principal de Supabase
import { type ColoresTema, espaciado, fuentes, radios, tipografia, useTema } from '@/theme'; // Tema activo y tokens
import { NOMBRES_ROLES } from '@/types'; // Nombre del rol a partir de su id

// TIPOS
type Integrante = {
  id_usuario: string;
  nombre: string;
  id_rol: number;
};

// ETIQUETAS Y COLORES DE CADA ROL (resueltos con tokens del tema)
const INFO_ROL: Record<
  string,
  {
    etiqueta: string;
    icono: keyof typeof Ionicons.glyphMap;
    color: keyof ColoresTema;
    fondo: keyof ColoresTema;
    textoChip: keyof ColoresTema;
  }
> = {
  administrador: {
    etiqueta: 'Administrador',
    icono: 'briefcase-outline',
    color: 'primary_strong',
    fondo: 'primary_soft',
    textoChip: 'on_primary',
  },
  mesero: {
    etiqueta: 'Mesero',
    icono: 'receipt-outline',
    color: 'primary',
    fondo: 'primary_soft',
    textoChip: 'on_primary',
  },
  cocina: {
    etiqueta: 'Cocina / Barra',
    icono: 'restaurant-outline',
    color: 'warning',
    fondo: 'warning_soft',
    textoChip: 'on_warning',
  },
};

// PANTALLA "ADMINISTRA TU CAFETERÍA Y A TU EQUIPO" ("/(admin)/staff")
// Se abre desde la pestaña "Personal" o desde la tarjeta "Gestión de Personal" del inicio.
// Muestra la cafetería del administrador, el acceso para registrar empleados y la lista del equipo
// leída directamente de la tabla usuario (la política RLS "usuario_admin_ver_equipo" lo permite).
export default function AdminStaffScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario, eliminarPersonal } = useAuth();

  const [nombreCafeteria, setNombreCafeteria] = useState('');
  const [equipo, setEquipo] = useState<Integrante[] | null>(null); // null = cargando
  const [error, setError] = useState<string | null>(null);
  const [falloRed, setFalloRed] = useState(false);
  const [mensajeReintento, setMensajeReintento] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const idCafeteria = usuario?.id_cafeteria;

  const cargarEquipo = useCallback(
    async (estaCancelado?: () => boolean) => {
      const cancelado = () => (estaCancelado ? estaCancelado() : false);

      if (!idCafeteria || !supabase_configurado) {
        if (!cancelado()) {
          setEquipo([]);
        }
        return;
      }

      setError(null);
      setFalloRed(false);
      setMensajeReintento(null);

      const supabase = obtener_supabase();

      const alReintentar = (intentoActual: number, maxIntentos: number) => {
        if (!cancelado()) {
          setMensajeReintento(
            `Reintentando conexión con el servidor (intento ${intentoActual} de ${maxIntentos})...`
          );
        }
      };

      const { resultado, fallo_red } = await con_reintentos(async () => {
        // 1. Nombre de la cafetería
        const respCafeteria: { data: { nombre_cafeteria: string } | null; error: Error | null } = await supabase
          .from('cafeteria')
          .select('nombre_cafeteria')
          .eq('id_cafeteria', idCafeteria)
          .maybeSingle();

        if (respCafeteria.error) {
          throw respCafeteria.error;
        }

        // 2. Integrantes de la cafetería: primero el administrador, luego meseros y cocina
        const respEquipo: { data: Integrante[] | null; error: Error | null } = await supabase
          .from('usuario')
          .select('id_usuario, nombre, id_rol')
          .eq('id_cafeteria', idCafeteria)
          .order('id_rol')
          .order('nombre');

        if (respEquipo.error) {
          throw respEquipo.error;
        }

        return {
          nombreCafeteria: respCafeteria.data?.nombre_cafeteria ?? '',
          equipo: respEquipo.data ?? [],
        };
      }, alReintentar);

      if (cancelado()) {
        return;
      }

      setMensajeReintento(null);

      if (fallo_red) {
        setFalloRed(true);
        setError(MENSAJE_SIN_CONEXION);
        return;
      }

      if (resultado) {
        setNombreCafeteria(resultado.nombreCafeteria);
        setEquipo(resultado.equipo);
        setError(null);
      } else {
        setError('No se pudo cargar la información del equipo.');
      }
    },
    [idCafeteria]
  );

  // Se consulta cada vez que la pantalla vuelve a mostrarse (por ejemplo, al regresar de registrar a alguien)
  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      cargarEquipo(() => cancelado);

      return () => {
        cancelado = true;
      };
    }, [cargarEquipo])
  );

  const manejarEliminar = (integrante: Integrante) => {
    if (eliminandoId) {
      return;
    }

    confirmarAccion({
      titulo: 'Eliminar empleado',
      mensaje: `¿Seguro que deseas dar de baja a ${integrante.nombre}? Perderá el acceso a Orby.`,
      textoConfirmar: 'Eliminar',
      destructivo: true,
      alConfirmar: async () => {
        setEliminandoId(integrante.id_usuario);
        try {
          const resultado = await eliminarPersonal(integrante.id_usuario, (intentoActual, maxIntentos) => {
            setMensajeReintento(
              `Reintentando conexión con el servidor (intento ${intentoActual} de ${maxIntentos})...`
            );
          });

          if (resultado.exito) {
            setEquipo((prev) => (prev ? prev.filter((item) => item.id_usuario !== integrante.id_usuario) : []));
            mostrarAviso('Empleado eliminado', `${integrante.nombre} fue dado de baja.`);
          } else {
            mostrarAviso('No se pudo eliminar', resultado.error ?? MENSAJE_SIN_CONEXION);
          }
        } finally {
          setEliminandoId(null);
          setMensajeReintento(null);
        }
      },
    });
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colores.background }]} edges={['top']}>
      <ScreenHeader titulo="Gestión de Personal" onBack={() => router.push('/(admin)' as any)} />

      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
        {/* Datos de la cafetería */}
        <View style={estilos.encabezado}>
          <View style={estilos.fila}>
            <View style={[estilos.pastilla, { backgroundColor: colores.primary_soft }]}>
              <Text style={[estilos.textoPastilla, { color: colores.primary_strong }]}>Administrador</Text>
            </View>
            <Text style={[estilos.cafeteria, { color: colores.text }]}>{nombreCafeteria}</Text>
          </View>
          <Text style={[tipografia.cuerpo, { color: colores.text_secondary }]}>
            Administra tu cafetería y a tu equipo de trabajo.
          </Text>
        </View>

        {/* Acceso para registrar empleados */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/new-staff' as any)}
          style={[estilos.tarjetaAccion, { backgroundColor: colores.primary_soft, borderColor: colores.border_strong }]}
        >
          <View style={[estilos.iconoCirculo, { backgroundColor: colores.surface }]}>
            <Ionicons name="person-add" size={24} color={colores.primary_strong} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[tipografia.cuerpo_fuerte, { color: colores.primary_strong }]}>Registrar empleado</Text>
            <Text style={[tipografia.detalle, { color: colores.text_secondary }]}>
              Da de alta a meseros y personal de cocina o barra.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colores.primary_strong} />
        </TouchableOpacity>

        {/* Lista del equipo */}
        <Text style={[estilos.titulo, { color: colores.text }]}>Tu equipo</Text>

        {mensajeReintento && (
          <View style={estilos.filaReintento}>
            <ActivityIndicator size="small" color={colores.primary} />
            <Text style={[tipografia.detalle, { color: colores.text_secondary }]}>{mensajeReintento}</Text>
          </View>
        )}

        {falloRed && (
          <View style={estilos.bloqueFalloRed}>
            <Text style={[tipografia.detalle, { color: colores.danger, textAlign: 'center' }]}>
              {MENSAJE_SIN_CONEXION}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setEquipo(null);
                cargarEquipo();
              }}
              style={[estilos.botonReintentar, { backgroundColor: colores.surface, borderColor: colores.border_strong }]}
            >
              <Ionicons name="refresh" size={16} color={colores.primary} />
              <Text style={[tipografia.cuerpo_fuerte, { color: colores.primary }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && !falloRed && (
          <Text style={[tipografia.detalle, { color: colores.danger }]}>No se pudo cargar el equipo: {error}</Text>
        )}

        {!error && !falloRed && equipo === null && <ActivityIndicator color={colores.primary} />}

        {!falloRed && equipo !== null && (
          <View style={estilos.lista}>
            {equipo.map((integrante) => {
              const rol = NOMBRES_ROLES[integrante.id_rol] ?? 'mesero';
              const info = INFO_ROL[rol] ?? INFO_ROL.mesero;

              return (
                <View
                  key={integrante.id_usuario}
                  style={[estilos.tarjetaEmpleado, { backgroundColor: colores.surface, borderColor: colores.border_strong }]}
                >
                  <View style={[estilos.avatar, { backgroundColor: colores[info.fondo] }]}>
                    <Ionicons name={info.icono} size={22} color={colores[info.color]} />
                  </View>

                  <Text style={[tipografia.cuerpo_fuerte, estilos.nombre, { color: colores.text }]}>
                    {integrante.nombre}
                    {integrante.id_usuario === usuario?.id_usuario ? ' (tú)' : ''}
                  </Text>

                  <View style={[estilos.chipRol, { backgroundColor: colores[info.color] }]}>
                    <Text style={[estilos.textoChipRol, { color: colores[info.textoChip] }]}>
                      {info.etiqueta.toUpperCase()}
                    </Text>
                  </View>

                  {integrante.id_usuario !== usuario?.id_usuario && (
                    <TouchableOpacity
                      accessibilityLabel={`Eliminar a ${integrante.nombre}`}
                      disabled={Boolean(eliminandoId)}
                      onPress={() => manejarEliminar(integrante)}
                      style={[estilos.botonEliminar, { backgroundColor: colores.danger_soft }]}
                      activeOpacity={0.7}
                    >
                      {eliminandoId === integrante.id_usuario ? (
                        <ActivityIndicator size="small" color={colores.danger} />
                      ) : (
                        <Ionicons name="trash-outline" size={20} color={colores.danger} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Si solo está el administrador, se sugiere registrar empleados */}
            {equipo.length <= 1 && (
              <Text style={[tipografia.detalle, estilos.vacio, { color: colores.text_muted }]}>
                Aún no registras empleados. Usa &quot;Registrar empleado&quot;.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <AdminBottomNav activa="personal" />
    </SafeAreaView>
  );
}

// ESTILOS
const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: espaciado.pantalla,
    paddingBottom: espaciado.xxl,
    gap: espaciado.md,
  },
  encabezado: {
    gap: espaciado.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  pastilla: {
    borderRadius: radios.pastilla,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs,
  },
  textoPastilla: {
    fontFamily: fuentes.semibold,
    fontSize: 12,
  },
  cafeteria: {
    fontFamily: fuentes.bold,
    fontSize: 18,
  },
  tarjetaAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1,
  },
  iconoCirculo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontFamily: fuentes.bold,
    fontSize: 20,
    marginTop: espaciado.sm,
  },
  filaReintento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.xs,
  },
  bloqueFalloRed: {
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.md,
  },
  botonReintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
  },
  lista: {
    gap: espaciado.sm,
  },
  tarjetaEmpleado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    flex: 1,
  },
  chipRol: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  textoChipRol: {
    fontSize: 10,
    fontWeight: '700',
  },
  botonEliminar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    textAlign: 'center',
    paddingVertical: espaciado.sm,
  },
});
