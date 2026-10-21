-- Políticas de seguridad a nivel de fila (RLS) para Orby

-- 1. Tablas de catálogos (lectura para usuarios anon y autenticados)
DROP POLICY IF EXISTS "Permitir lectura de roles" ON "public"."role";
CREATE POLICY "Permitir lectura de roles" ON "public"."role" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura de estado_cafeteria" ON "public"."estado_cafeteria";
CREATE POLICY "Permitir lectura de estado_cafeteria" ON "public"."estado_cafeteria" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura de estado_mesa" ON "public"."estado_mesa";
CREATE POLICY "Permitir lectura de estado_mesa" ON "public"."estado_mesa" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura de estado_comanda" ON "public"."estado_comanda";
CREATE POLICY "Permitir lectura de estado_comanda" ON "public"."estado_comanda" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura de estado_detalles_comanda" ON "public"."estado_detalles_comanda";
CREATE POLICY "Permitir lectura de estado_detalles_comanda" ON "public"."estado_detalles_comanda" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura de tipo_notificacion" ON "public"."tipo_notificacion";
CREATE POLICY "Permitir lectura de tipo_notificacion" ON "public"."tipo_notificacion" FOR SELECT USING (true);

-- 2. Cafetería
DROP POLICY IF EXISTS "Permitir inserción de cafetería durante registro" ON "public"."cafeteria";
CREATE POLICY "Permitir inserción de cafetería durante registro" ON "public"."cafeteria" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de cafetería" ON "public"."cafeteria";
CREATE POLICY "Permitir lectura de cafetería" ON "public"."cafeteria" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualización de cafetería" ON "public"."cafeteria";
CREATE POLICY "Permitir actualización de cafetería" ON "public"."cafeteria" FOR UPDATE USING (true);

-- 3. Usuario
DROP POLICY IF EXISTS "Permitir inserción de usuario" ON "public"."usuario";
CREATE POLICY "Permitir inserción de usuario" ON "public"."usuario" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de usuarios" ON "public"."usuario";
CREATE POLICY "Permitir lectura de usuarios" ON "public"."usuario" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualización de usuario" ON "public"."usuario";
CREATE POLICY "Permitir actualización de usuario" ON "public"."usuario" FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir eliminación de usuario" ON "public"."usuario";
CREATE POLICY "Permitir eliminación de usuario" ON "public"."usuario" FOR DELETE USING (true);

-- 4. Mesa
DROP POLICY IF EXISTS "Permitir gestión de mesas" ON "public"."mesa";
CREATE POLICY "Permitir gestión de mesas" ON "public"."mesa" FOR ALL USING (true);

-- 5. Categoría
DROP POLICY IF EXISTS "Permitir gestión de categorías" ON "public"."categoria";
CREATE POLICY "Permitir gestión de categorías" ON "public"."categoria" FOR ALL USING (true);

-- 6. Producto
DROP POLICY IF EXISTS "Permitir gestión de productos" ON "public"."producto";
CREATE POLICY "Permitir gestión de productos" ON "public"."producto" FOR ALL USING (true);

-- 7. Comandas y detalles
DROP POLICY IF EXISTS "Permitir gestión de comandas" ON "public"."comanda";
CREATE POLICY "Permitir gestión de comandas" ON "public"."comanda" FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir gestión de detalles de comanda" ON "public"."detalle_comanda";
CREATE POLICY "Permitir gestión de detalles de comanda" ON "public"."detalle_comanda" FOR ALL USING (true);

-- 8. Notificaciones
DROP POLICY IF EXISTS "Permitir gestión de notificaciones" ON "public"."notificacion";
CREATE POLICY "Permitir gestión de notificaciones" ON "public"."notificacion" FOR ALL USING (true);

