import { Ionicons } from '@expo/vector-icons'; // Íconos
import { useFocusEffect, useRouter } from 'expo-router'; // Navegación y recarga al volver a la pantalla
import React, { useCallback, useState } from 'react'; // Estado de React
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // Componentes base
import { SafeAreaView } from 'react-native-safe-area-context'; // Respeta el notch y la barra del sistema

import { AdminBottomNav } from '@/components/AdminBottomNav'; // Barra inferior del administrador
import { ScreenHeader } from '@/components/ScreenHeader'; // Encabezado con flecha de regreso
import { useAuth } from '@/context/auth-context'; // Administrador con sesión iniciada
import { supabase_configurado } from '@/lib/env'; // Saber si hay conexión configurada
import { obtener_supabase } from '@/lib/supabase'; // Cliente principal de Supabase
import { espaciado, fuentes, radios, tipografia, useTema } from '@/theme'; // Tema activo y tokens
import { NOMBRES_ROLES } from '@/types'; // Nombre del rol a partir de su id

// TIPOS
type Integrante = {
  id_usuario: string;
  nombre: string;
  id_rol: number;
};

// ETIQUETAS Y COLORES DE CADA ROL (mismos colores que usa el resto del diseño)
const INFO_ROL: Record<string, { etiqueta: string; icono: keyof typeof Ionicons.glyphMap; color: string; fondo: string }> = {
  administrador: { etiqueta: 'Administrador', icono: 'briefcase-outline', color: '#1F5A4C', fondo: '#DCEBE6' },
  mesero: { etiqueta: 'Mesero', icono: 'receipt-outline', color: '#388D7A', fondo: '#DCEBE6' },
  cocina: { etiqueta: 'Cocina / Barra', icono: 'restaurant-outline', color: '#C27803', fondo: '#F7EDD8' },
};

// PANTALLA "ADMINISTRA TU CAFETERÍA Y A TU EQUIPO" ("/(admin)/staff")
// Se abre desde la pestaña "Personal" o desde la tarjeta "Gestión de Personal" del inicio.
// Muestra la cafetería del administrador, el acceso para registrar empleados y la lista del equipo
// leída directamente de la tabla usuario (la política RLS "usuario_admin_ver_equipo" lo permite).
export default function AdminStaffScreen() {
  const router = useRouter();
  const { colores } = useTema();
  const { usuario } = useAuth();

  const [nombreCafeteria, setNombreCafeteria] = useState('');
  const [equipo, setEquipo] = useState<Integrante[] | null>(null); // null = cargando
  const [error, setError] = useState<string | null>(null);

  const idCafeteria = usuario?.id_cafeteria;

  // Se consulta cada vez que la pantalla vuelve a mostrarse (por ejemplo, al regresar de registrar a alguien)
  useFocusEffect(
    useCallback(() => {
      if (!idCafeteria || !supabase_configurado) {
        setEquipo([]);
        return;
      }

      let cancelado = false; // Evita guardar resultados si se salió de la pantalla
      const supabase = obtener_supabase();

      // 1. Nombre de la cafetería
      supabase
        .from('cafeteria')
        .select('nombre_cafeteria')
        .eq('id_cafeteria', idCafeteria)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelado && data) {
            setNombreCafeteria(data.nombre_cafeteria);
          }
        });

      // 2. Integrantes de la cafetería: primero el administrador, luego meseros y cocina
      supabase
        .from('usuario')
        .select('id_usuario, nombre, id_rol')
        .eq('id_cafeteria', idCafeteria)
        .order('id_rol')
        .order('nombre')
        .then(({ data, error: errorConsulta }) => {
          if (cancelado) {
            return;
          }

          if (errorConsulta) {
            setError(errorConsulta.message);
            return;
          }

          setError(null);
          setEquipo((data ?? []) as Integrante[]);
        });

      return () => {
        cancelado = true;
      };
    }, [idCafeteria])
  );

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

        {error && (
          <Text style={[tipografia.detalle, { color: colores.danger }]}>No se pudo cargar el equipo: {error}</Text>
        )}

        {!error && equipo === null && <ActivityIndicator color={colores.primary} />}

        {equipo !== null && (
          <View style={estilos.lista}>
            {equipo.map((integrante) => {
              const rol = NOMBRES_ROLES[integrante.id_rol] ?? 'mesero';
              const info = INFO_ROL[rol];

              return (
                <View
                  key={integrante.id_usuario}
                  style={[estilos.tarjetaEmpleado, { backgroundColor: colores.surface, borderColor: colores.border_strong }]}
                >
                  <View style={[estilos.avatar, { backgroundColor: info.fondo }]}>
                    <Ionicons name={info.icono} size={22} color={info.color} />
                  </View>

                  <Text style={[tipografia.cuerpo_fuerte, estilos.nombre, { color: colores.text }]}>
                    {integrante.nombre}
                    {integrante.id_usuario === usuario?.id_usuario ? ' (tú)' : ''}
                  </Text>

                  <View style={[estilos.chipRol, { backgroundColor: info.color }]}>
                    <Text style={estilos.textoChipRol}>{info.etiqueta.toUpperCase()}</Text>
                  </View>
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  vacio: {
    textAlign: 'center',
    paddingVertical: espaciado.sm,
  },
});
