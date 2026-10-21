-- RLS real por rol y por cafetería.
--
-- Reemplaza las políticas permisivas de 20261021000000_politicas_rls.sql, que usaban
-- USING (true) y dejaban leer y escribir a cualquiera con la llave pública, incluso sin sesión.
-- Postgres permite la fila si CUALQUIER política la permite, así que mientras existieran,
-- las reglas estrictas de 20261021000001_politicas_acceso.sql no tenían efecto.
--
-- Usa las funciones auxiliares de esa migración: public.mi_id_cafeteria() y public.mi_id_rol().
-- Roles: 1 administrador, 2 mesero, 3 cocina.

-- 1. Quitar las políticas permisivas
DROP POLICY IF EXISTS "Permitir lectura de roles"                     ON "public"."role";
DROP POLICY IF EXISTS "Permitir lectura de estado_cafeteria"          ON "public"."estado_cafeteria";
DROP POLICY IF EXISTS "Permitir lectura de estado_mesa"               ON "public"."estado_mesa";
DROP POLICY IF EXISTS "Permitir lectura de estado_comanda"            ON "public"."estado_comanda";
DROP POLICY IF EXISTS "Permitir lectura de estado_detalles_comanda"   ON "public"."estado_detalles_comanda";
DROP POLICY IF EXISTS "Permitir lectura de tipo_notificacion"         ON "public"."tipo_notificacion";
DROP POLICY IF EXISTS "Permitir inserción de cafetería durante registro" ON "public"."cafeteria";
DROP POLICY IF EXISTS "Permitir lectura de cafetería"                 ON "public"."cafeteria";
DROP POLICY IF EXISTS "Permitir actualización de cafetería"           ON "public"."cafeteria";
DROP POLICY IF EXISTS "Permitir inserción de usuario"                 ON "public"."usuario";
DROP POLICY IF EXISTS "Permitir lectura de usuarios"                  ON "public"."usuario";
DROP POLICY IF EXISTS "Permitir actualización de usuario"             ON "public"."usuario";
DROP POLICY IF EXISTS "Permitir eliminación de usuario"               ON "public"."usuario";
DROP POLICY IF EXISTS "Permitir gestión de mesas"                     ON "public"."mesa";
DROP POLICY IF EXISTS "Permitir gestión de categorías"                ON "public"."categoria";
DROP POLICY IF EXISTS "Permitir gestión de productos"                 ON "public"."producto";
DROP POLICY IF EXISTS "Permitir gestión de comandas"                  ON "public"."comanda";
DROP POLICY IF EXISTS "Permitir gestión de detalles de comanda"       ON "public"."detalle_comanda";
DROP POLICY IF EXISTS "Permitir gestión de notificaciones"            ON "public"."notificacion";

-- 2. Quitar a anon todo permiso de escritura
-- Sin sesión no se escribe nada. El registro del administrador no lo necesita: lo hace
-- handle_new_user, que es SECURITY DEFINER y no pasa por RLS ni por estos permisos.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['role','estado_cafeteria','estado_mesa','estado_comanda',
                           'estado_detalles_comanda','tipo_notificacion','cafeteria','usuario',
                           'mesa','categoria','producto','comanda','detalle_comanda','notificacion']
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon', t);
  END LOOP;
END $$;

-- 3. Catálogos: lectura para cualquier usuario con sesión (no tienen datos privados)
CREATE POLICY "estado_cafeteria_lectura" ON "public"."estado_cafeteria"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "estado_mesa_lectura" ON "public"."estado_mesa"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "estado_comanda_lectura" ON "public"."estado_comanda"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "estado_detalles_comanda_lectura" ON "public"."estado_detalles_comanda"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tipo_notificacion_lectura" ON "public"."tipo_notificacion"
  FOR SELECT TO authenticated USING (true);

-- 4. Usuario: el administrador da de baja a su equipo; cada quien corrige su propio perfil
-- La lectura ya la cubren usuario_ver_propio y usuario_admin_ver_equipo (migración anterior).
CREATE POLICY "usuario_admin_eliminar_equipo" ON "public"."usuario"
  FOR DELETE TO authenticated
  USING (public.mi_id_rol() = 1
         AND id_cafeteria = public.mi_id_cafeteria()
         AND id_usuario <> (SELECT auth.uid()));   -- que no se borre a sí mismo

CREATE POLICY "usuario_editar_propio" ON "public"."usuario"
  FOR UPDATE TO authenticated
  USING (id_usuario = (SELECT auth.uid()))
  WITH CHECK (id_usuario = (SELECT auth.uid()));

-- 5. Cafetería: el administrador edita la suya (la lectura ya está cubierta)
CREATE POLICY "cafeteria_admin_editar" ON "public"."cafeteria"
  FOR UPDATE TO authenticated
  USING (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria())
  WITH CHECK (id_cafeteria = public.mi_id_cafeteria());

-- 6. Categorías y productos: todos los de la cafetería leen, solo el administrador gestiona
CREATE POLICY "categoria_lectura_cafeteria" ON "public"."categoria"
  FOR SELECT TO authenticated USING (id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "categoria_admin_gestiona" ON "public"."categoria"
  FOR ALL TO authenticated
  USING (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria())
  WITH CHECK (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria());

CREATE POLICY "producto_lectura_cafeteria" ON "public"."producto"
  FOR SELECT TO authenticated USING (id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "producto_admin_gestiona" ON "public"."producto"
  FOR ALL TO authenticated
  USING (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria())
  WITH CHECK (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria());

-- 7. Mesas: todos leen las de su cafetería; el mesero y el administrador cambian el estado
CREATE POLICY "mesa_lectura_cafeteria" ON "public"."mesa"
  FOR SELECT TO authenticated USING (id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "mesa_cambiar_estado" ON "public"."mesa"
  FOR UPDATE TO authenticated
  USING (public.mi_id_rol() IN (1, 2) AND id_cafeteria = public.mi_id_cafeteria())
  WITH CHECK (id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "mesa_admin_gestiona" ON "public"."mesa"
  FOR ALL TO authenticated
  USING (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria())
  WITH CHECK (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria());

-- 8. Comandas: toda la cafetería las ve; el mesero abre la cuenta; mesero y cocina la mueven
CREATE POLICY "comanda_lectura_cafeteria" ON "public"."comanda"
  FOR SELECT TO authenticated USING (id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "comanda_mesero_abre" ON "public"."comanda"
  FOR INSERT TO authenticated
  WITH CHECK (public.mi_id_rol() IN (1, 2) AND id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "comanda_actualizar" ON "public"."comanda"
  FOR UPDATE TO authenticated
  USING (id_cafeteria = public.mi_id_cafeteria())
  WITH CHECK (id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "comanda_admin_elimina" ON "public"."comanda"
  FOR DELETE TO authenticated
  USING (public.mi_id_rol() = 1 AND id_cafeteria = public.mi_id_cafeteria());

-- 9. Detalles: no tienen id_cafeteria, se alcanzan por su comanda
CREATE POLICY "detalle_lectura_cafeteria" ON "public"."detalle_comanda"
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.comanda c
                  WHERE c.id_comanda = detalle_comanda.id_comanda
                    AND c.id_cafeteria = public.mi_id_cafeteria()));

CREATE POLICY "detalle_mesero_agrega" ON "public"."detalle_comanda"
  FOR INSERT TO authenticated
  WITH CHECK (public.mi_id_rol() IN (1, 2)
              AND EXISTS (SELECT 1 FROM public.comanda c
                           WHERE c.id_comanda = detalle_comanda.id_comanda
                             AND c.id_cafeteria = public.mi_id_cafeteria()
                             AND c.id_estado = 1)); -- solo en una cuenta abierta

CREATE POLICY "detalle_actualizar" ON "public"."detalle_comanda"
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.comanda c
                  WHERE c.id_comanda = detalle_comanda.id_comanda
                    AND c.id_cafeteria = public.mi_id_cafeteria()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.comanda c
                       WHERE c.id_comanda = detalle_comanda.id_comanda
                         AND c.id_cafeteria = public.mi_id_cafeteria()));

CREATE POLICY "detalle_quitar" ON "public"."detalle_comanda"
  FOR DELETE TO authenticated
  USING (public.mi_id_rol() IN (1, 2)
         AND EXISTS (SELECT 1 FROM public.comanda c
                      WHERE c.id_comanda = detalle_comanda.id_comanda
                        AND c.id_cafeteria = public.mi_id_cafeteria()
                        AND c.id_estado = 1));

-- 10. Notificaciones: cada quien ve las suyas; la cocina las genera; el aviso se marca leído
CREATE POLICY "notificacion_ver_propia" ON "public"."notificacion"
  FOR SELECT TO authenticated
  USING (id_cafeteria = public.mi_id_cafeteria()
         AND (id_usuario = (SELECT auth.uid()) OR public.mi_id_rol() = 1));
CREATE POLICY "notificacion_crear" ON "public"."notificacion"
  FOR INSERT TO authenticated
  WITH CHECK (id_cafeteria = public.mi_id_cafeteria());
CREATE POLICY "notificacion_marcar_leida" ON "public"."notificacion"
  FOR UPDATE TO authenticated
  USING (id_cafeteria = public.mi_id_cafeteria() AND id_usuario = (SELECT auth.uid()))
  WITH CHECK (id_cafeteria = public.mi_id_cafeteria() AND id_usuario = (SELECT auth.uid()));
