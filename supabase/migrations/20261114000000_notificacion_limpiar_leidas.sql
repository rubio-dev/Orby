-- Limpieza de notificaciones leídas por parte del propio usuario.
--
-- La app ya podía marcar una notificación como leída, pero no borrarla.
-- Esta política permite que cada usuario elimine únicamente sus propios avisos.
-- El administrador puede leer los de todos (notificacion_ver_propia), pero no
-- borrarlos desde esta vía: la limpieza es personal.

DROP POLICY IF EXISTS "notificacion_eliminar_propia" ON "public"."notificacion";

CREATE POLICY "notificacion_eliminar_propia" ON "public"."notificacion"
  FOR DELETE TO authenticated
  USING (
    id_cafeteria = public.mi_id_cafeteria()
    AND id_usuario = (SELECT auth.uid())
  );
