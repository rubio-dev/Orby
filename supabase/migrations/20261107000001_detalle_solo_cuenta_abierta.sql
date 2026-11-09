-- Los productos de una comanda solo se pueden actualizar mientras la cuenta esté abierta.
--
-- Qué reemplaza: la política "detalle_actualizar" de 20261022000001_rls_por_rol_y_cafeteria.sql.
-- Esa política solo revisaba que la comanda fuera de la cafetería del usuario, así que
-- dejaba cambiar el estado de un producto aunque la cuenta ya estuviera cerrada o cancelada.
--
-- Por qué: la cocina puede trabajar sin conexión y enviar sus cambios más tarde. Si mientras
-- tanto el mesero cerró o canceló la cuenta, ese cambio atrasado no debe aplicarse.
-- La app también lo revisa antes de enviar (para mostrar un mensaje claro), pero
-- la regla tiene que estar en la base para que se cumpla aunque la app falle.
--
-- Igual que en las inserciones (detalle_mesero_agrega): solo en una cuenta abierta (id_estado = 1).
-- Ojo: RLS no da error cuando bloquea un UPDATE; deja la operación en 0 filas.
-- La app tiene que revisar las filas devueltas para saber si el cambio se aplicó.

DROP POLICY IF EXISTS "detalle_actualizar" ON "public"."detalle_comanda";

CREATE POLICY "detalle_actualizar_cuenta_abierta" ON "public"."detalle_comanda"
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.comanda c
                  WHERE c.id_comanda = detalle_comanda.id_comanda
                    AND c.id_cafeteria = public.mi_id_cafeteria()
                    AND c.id_estado = 1))
  WITH CHECK (EXISTS (SELECT 1 FROM public.comanda c
                       WHERE c.id_comanda = detalle_comanda.id_comanda
                         AND c.id_cafeteria = public.mi_id_cafeteria()
                         AND c.id_estado = 1));
