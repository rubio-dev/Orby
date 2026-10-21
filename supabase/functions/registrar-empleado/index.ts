// Supabase Edge Function: registrar-empleado
// Permite que un administrador registre cuentas de meseros y cocineros de forma segura
// sin exponer la llave service_role en la aplicación móvil.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta (service_role)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Validar el token del llamante para verificar que es Administrador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado: falta encabezado de autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente con la identidad del llamante para verificar permisos
    const clienteLlamante = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: adminUser },
      error: authError,
    } = await clienteLlamante.auth.getUser();

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida o expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente administrativo privilegiado
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar en la tabla 'usuario' que el llamante sea administrador (id_rol = 1)
    const { data: perfilAdmin, error: perfilError } = await supabaseAdmin
      .from('usuario')
      .select('id_rol, id_cafeteria')
      .eq('id_usuario', adminUser.id)
      .single();

    if (perfilError || !perfilAdmin || perfilAdmin.id_rol !== 1) {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado: solo los administradores pueden registrar personal' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extraer datos del nuevo empleado
    const { nombre, correo, contrasena, rol } = await req.json();

    if (!nombre || !correo || !contrasena || !rol) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios (nombre, correo, contrasena, rol)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rol !== 'mesero' && rol !== 'cocina') {
      return new Response(
        JSON.stringify({ error: 'Rol inválido: solo se puede registrar mesero o cocina' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Crear el usuario en auth.users con la API administrativa de Supabase
    // El trigger on_auth_user_created se encargará de crear el registro en public.usuario
    const { data: nuevoUsuarioAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: correo.trim().toLowerCase(),
      password: contrasena,
      email_confirm: true, // Confirmado automáticamente para acceso inmediato
      user_metadata: {
        nombre: nombre.trim(),
        rol: rol,
        id_cafeteria: perfilAdmin.id_cafeteria,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        exito: true,
        usuario: {
          id_usuario: nuevoUsuarioAuth.user.id,
          nombre: nombre.trim(),
          correo: correo.trim().toLowerCase(),
          rol,
          id_cafeteria: perfilAdmin.id_cafeteria,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message ?? 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

