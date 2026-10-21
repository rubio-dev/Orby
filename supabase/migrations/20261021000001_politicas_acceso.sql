-- Políticas de acceso (RLS) para el login y el registro de usuarios
-- Sin políticas, RLS bloquea TODAS las lecturas: la app no podría saber el rol de quien inicia sesión.
-- Este archivo se puede correr varias veces sin error (borra cada política antes de crearla).
-- Se numera 000001 para correr DESPUÉS de 20261021000000_politicas_rls.sql (dos migraciones no pueden tener el mismo número).
-- OJO: las políticas "USING (true)" de 20261021000000_politicas_rls.sql dejan leer, cambiar y borrar a TODOS
-- los usuarios (incluso sin sesión). Mientras existan, estas reglas más estrictas no tienen efecto,
-- porque Postgres permite la fila si CUALQUIER política la permite. Lo decide el responsable de la base de datos.

-- 1. Funciones auxiliares
-- Devuelven la cafetería y el rol del usuario que hizo la petición.
-- SECURITY DEFINER: leen la tabla usuario sin pasar por RLS; así una política de usuario
-- puede usarlas sin entrar en un ciclo infinito (la política consultando su propia tabla).
CREATE OR REPLACE FUNCTION public.mi_id_cafeteria()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
    SELECT id_cafeteria FROM public.usuario WHERE id_usuario = (SELECT auth.uid());
  $function$;

CREATE OR REPLACE FUNCTION public.mi_id_rol()
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
    SELECT id_rol FROM public.usuario WHERE id_usuario = (SELECT auth.uid());
  $function$;

-- Solo los usuarios con sesión iniciada pueden llamarlas
REVOKE EXECUTE ON FUNCTION public.mi_id_cafeteria() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mi_id_rol() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_id_cafeteria() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_id_rol() TO authenticated;

-- 2. Permisos de lectura por la API (RLS decide después qué filas se ven)
GRANT SELECT ON public.role TO anon, authenticated;
GRANT SELECT ON public.usuario TO authenticated;
GRANT SELECT ON public.cafeteria TO authenticated;

-- 3. Catálogo de roles: cualquiera puede leerlo (no tiene datos privados)
DROP POLICY IF EXISTS "role_lectura_publica" ON public.role;
CREATE POLICY "role_lectura_publica" ON public.role
  FOR SELECT TO anon, authenticated
  USING (true);

-- 4. Usuario: cada quien ve su propio perfil (lo usa el login para saber el rol)
DROP POLICY IF EXISTS "usuario_ver_propio" ON public.usuario;
CREATE POLICY "usuario_ver_propio" ON public.usuario
  FOR SELECT TO authenticated
  USING (id_usuario = (SELECT auth.uid()));

-- 5. Usuario: el administrador (id_rol = 1) ve a todo el equipo de SU cafetería
DROP POLICY IF EXISTS "usuario_admin_ver_equipo" ON public.usuario;
CREATE POLICY "usuario_admin_ver_equipo" ON public.usuario
  FOR SELECT TO authenticated
  USING (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria());

-- 6. Cafetería: cada usuario ve solo la cafetería a la que pertenece
DROP POLICY IF EXISTS "cafeteria_ver_propia" ON public.cafeteria;
CREATE POLICY "cafeteria_ver_propia" ON public.cafeteria
  FOR SELECT TO authenticated
  USING (id_cafeteria = public.mi_id_cafeteria());

-- Nota: los INSERT en usuario y cafeteria no necesitan política porque los hace
-- la función handle_new_user, que es SECURITY DEFINER (no pasa por RLS).
