-- DATOS DE PRUEBA PARA COCINA (SOLO SUPABASE LOCAL)
--
-- Qué hace: crea unos productos en el menú y tres cuentas de la cafetería demo,
-- con productos en distintos estados y con especificaciones, para probar las pantallas
-- de cocina mientras la parte del mesero que guarda los pedidos no esté lista.
--
--   Mesa 4: cuenta abierta con productos pendientes, en preparación y listos
--           -> aparece en Comandas, pestaña "En preparación".
--   Mesa 6: cuenta abierta con todo listo -> pestaña "Listos".
--   Mesa 9: cuenta cerrada hoy -> Historial.
--
-- Cómo correrlo (con Supabase local encendido: pnpm db:start), desde la terminal de VS Code:
--   docker cp scripts/datos-prueba-cocina.sql supabase_db_orby:/tmp/datos-prueba-cocina.sql
--   docker exec supabase_db_orby psql -U postgres -f /tmp/datos-prueba-cocina.sql
-- Debe terminar con: NOTICE: Listo: mesa 4 (en preparación), mesa 6 (listos) y mesa 9 (historial).
--
-- No usar "Get-Content ... | docker exec -i ...": Windows PowerShell 5.1 convierte a ASCII el
-- texto que pasa con "|" a otro programa, y los acentos se guardan como "?" ("preparaci?n").
-- docker cp copia el archivo tal cual. También se puede pegar en el SQL Editor del panel
-- local (http://127.0.0.1:54323).
--
-- Se puede correr las veces que quieras: borra solo SUS cuentas de prueba (IDs fijos que
-- empiezan con d0c1...) y las vuelve a crear con la hora de ahora, así el tiempo de espera
-- vuelve a empezar. No toca otras cuentas ni otros productos.
--
-- NUNCA en la nube: corre como "postgres", que se salta RLS. Para protegerse, se detiene
-- si no encuentra los usuarios demo de supabase/seed.sql (que solo existen en local).

DO $$
DECLARE
  v_cafeteria constant uuid := '00000000-0000-0000-0000-000000000001';
  v_mesero    constant uuid := '22222222-2222-2222-2222-222222222222'; -- Liz Morales (seed)
  v_cocina    constant uuid := '33333333-3333-3333-3333-333333333333'; -- Emilio Sánchez (seed)

  -- Productos (IDs fijos para poder correr el script varias veces)
  p_latte      constant uuid := 'd0c10000-0000-0000-0000-000000000001';
  p_chocolate  constant uuid := 'd0c10000-0000-0000-0000-000000000002';
  p_chilaquil  constant uuid := 'd0c10000-0000-0000-0000-000000000003';
  p_burritos   constant uuid := 'd0c10000-0000-0000-0000-000000000004';
  p_cheesecake constant uuid := 'd0c10000-0000-0000-0000-000000000005';

  -- Cuentas de prueba
  c_mesa4 constant uuid := 'd0c10000-0000-0000-0000-0000000000a4';
  c_mesa6 constant uuid := 'd0c10000-0000-0000-0000-0000000000a6';
  c_mesa9 constant uuid := 'd0c10000-0000-0000-0000-0000000000a9';

  m4 uuid;
  m6 uuid;
  m9 uuid;
  otra uuid;
BEGIN
  -- 0. Seguridad: solo con los usuarios demo de seed.sql (base local)
  IF NOT EXISTS (SELECT 1 FROM public.usuario WHERE id_usuario = v_mesero AND id_rol = 2)
     OR NOT EXISTS (SELECT 1 FROM public.usuario WHERE id_usuario = v_cocina AND id_rol = 3) THEN
    RAISE EXCEPTION 'No están los usuarios demo de supabase/seed.sql. Este script es solo para tu Supabase local (corre pnpm supabase db reset).';
  END IF;

  SELECT id_mesa INTO m4 FROM public.mesa WHERE id_cafeteria = v_cafeteria AND num_mesa = 4;
  SELECT id_mesa INTO m6 FROM public.mesa WHERE id_cafeteria = v_cafeteria AND num_mesa = 6;
  SELECT id_mesa INTO m9 FROM public.mesa WHERE id_cafeteria = v_cafeteria AND num_mesa = 9;
  IF m4 IS NULL OR m6 IS NULL OR m9 IS NULL THEN
    RAISE EXCEPTION 'Faltan las mesas 4, 6 o 9 de la cafetería demo (revisa supabase/seed.sql).';
  END IF;

  -- 1. Borrar las cuentas de prueba anteriores (sus productos y avisos se borran en cascada)
  DELETE FROM public.comanda WHERE id_comanda IN (c_mesa4, c_mesa6, c_mesa9);

  -- Solo puede haber una cuenta abierta por mesa (idx_comanda_una_abierta_por_mesa).
  -- Si alguien abrió otra en la mesa 4 o 6, no se toca: se avisa y se detiene.
  SELECT id_comanda INTO otra FROM public.comanda
   WHERE id_mesa IN (m4, m6) AND id_estado = 1 LIMIT 1;
  IF otra IS NOT NULL THEN
    RAISE EXCEPTION 'Ya hay otra cuenta abierta en la mesa 4 o 6 (id %). Ciérrala o bórrala antes de correr este script.', otra;
  END IF;

  -- 2. Productos del menú (se actualizan si ya existían)
  INSERT INTO public.producto (id_producto, id_cafeteria, id_categoria, nombre_producto, descripcion, precio, estado)
  VALUES
    (p_latte,      v_cafeteria, 'c0000000-0000-0000-0000-000000000001', 'Latte',               'Espresso con leche vaporizada',   70, true),
    (p_chocolate,  v_cafeteria, 'c0000000-0000-0000-0000-000000000001', 'Chocolate caliente',  'Chocolate de mesa con leche',     50, true),
    (p_chilaquil,  v_cafeteria, 'c0000000-0000-0000-0000-000000000002', 'Chilaquiles',         'Verdes o rojos, con crema y queso', 120, true),
    (p_burritos,   v_cafeteria, 'c0000000-0000-0000-0000-000000000002', 'Burritos de machaca', 'Dos piezas en tortilla de harina', 90, true),
    (p_cheesecake, v_cafeteria, 'c0000000-0000-0000-0000-000000000003', 'Cheesecake',          'Rebanada con mermelada de fresa',  50, true)
  ON CONFLICT (id_producto) DO UPDATE
    SET nombre_producto = EXCLUDED.nombre_producto,
        descripcion     = EXCLUDED.descripcion,
        precio          = EXCLUDED.precio,
        estado          = true;

  -- 3. Mesa 4: cuenta abierta hace 12 min. Estados de producto:
  --    1 pendiente, 2 en preparación, 3 listo, 4 entregado, 5 cancelado
  INSERT INTO public.comanda (id_comanda, id_cafeteria, id_mesa, id_usuario, id_estado, total, fecha_creacion)
  VALUES (c_mesa4, v_cafeteria, m4, v_mesero, 1, 0, now() - interval '12 minutes');

  INSERT INTO public.detalle_comanda
    (id_comanda, id_producto, cantidad, precio_unitario, especificaciones, tiempo_estimado, id_estado, fecha_creacion)
  VALUES
    (c_mesa4, p_chilaquil,  1, 120, 'Sin cebolla, salsa verde',      20,   1, now() - interval '12 minutes'),
    (c_mesa4, p_chocolate,  1,  50, 'Con leche deslactosada',        5,    2, now() - interval '12 minutes'),
    (c_mesa4, p_cheesecake, 1,  50, NULL,                            NULL, 3, now() - interval '10 minutes'),
    -- Pedido después: su espera cuenta desde hace 3 min, no desde que se abrió la cuenta
    (c_mesa4, p_latte,      2,  70, 'Uno sin azúcar',                NULL, 1, now() - interval '3 minutes');

  -- 4. Mesa 6: cuenta abierta con todo listo para llevar
  INSERT INTO public.comanda (id_comanda, id_cafeteria, id_mesa, id_usuario, id_estado, total, fecha_creacion)
  VALUES (c_mesa6, v_cafeteria, m6, v_mesero, 1, 0, now() - interval '25 minutes');

  INSERT INTO public.detalle_comanda
    (id_comanda, id_producto, cantidad, precio_unitario, especificaciones, tiempo_estimado, id_estado, fecha_creacion)
  VALUES
    (c_mesa6, p_burritos, 2, 90, 'Sin frijol', 15,   3, now() - interval '25 minutes'),
    (c_mesa6, p_latte,    1, 70, NULL,         NULL, 3, now() - interval '25 minutes');

  -- 5. Mesa 9: cuenta de hoy ya cerrada (historial). Se usa "ahora" para que siempre sea de hoy.
  INSERT INTO public.comanda (id_comanda, id_cafeteria, id_mesa, id_usuario, id_estado, total, fecha_creacion)
  VALUES (c_mesa9, v_cafeteria, m9, v_mesero, 2, 0, now() - interval '40 minutes');

  INSERT INTO public.detalle_comanda
    (id_comanda, id_producto, cantidad, precio_unitario, especificaciones, tiempo_estimado, id_estado, fecha_creacion)
  VALUES
    (c_mesa9, p_chilaquil, 1, 120, 'Salsa roja', 20,   4, now() - interval '40 minutes'),
    (c_mesa9, p_chocolate, 2,  50, NULL,         NULL, 4, now() - interval '40 minutes');

  -- 6. Totales calculados desde sus productos (sin contar los cancelados)
  UPDATE public.comanda c
     SET total = COALESCE((SELECT SUM(d.cantidad * d.precio_unitario)
                             FROM public.detalle_comanda d
                            WHERE d.id_comanda = c.id_comanda AND d.id_estado <> 5), 0)
   WHERE c.id_comanda IN (c_mesa4, c_mesa6, c_mesa9);

  -- 7. Las mesas con cuenta abierta quedan ocupadas, para que el mesero lo vea igual
  UPDATE public.mesa SET id_estado = 2 WHERE id_mesa IN (m4, m6);

  RAISE NOTICE 'Listo: mesa 4 (en preparación), mesa 6 (listos) y mesa 9 (historial).';
END $$;


-- ============================================================================
-- PRUEBAS EXTRA (opcionales). No se corren con el bloque de arriba: están comentadas.
-- Para usarlas, cópialas SIN los "--" a una pestaña nueva del SQL Editor y córrelas.
-- ============================================================================

-- A) Pedido nuevo en la mesa 4, para ver que llega solo por Realtime (sin recargar):
--
-- INSERT INTO public.detalle_comanda (id_comanda, id_producto, cantidad, precio_unitario, especificaciones, id_estado)
-- VALUES ('d0c10000-0000-0000-0000-0000000000a4', 'd0c10000-0000-0000-0000-000000000005', 1, 50, 'Para llevar', 1);

-- B) Cerrar la cuenta de la mesa 4, para probar el aviso de "la cuenta ya se cerró"
--    (haz primero un cambio sin conexión en la app, luego corre esto y reconecta):
--
-- UPDATE public.comanda SET id_estado = 2 WHERE id_comanda = 'd0c10000-0000-0000-0000-0000000000a4';

-- C) Ver los avisos que la cocina le dejó al mesero (tipo 1 pedido_listo, 3 producto_listo):
--
-- SELECT n.fecha_creacion, t.nombre_tipo, m.num_mesa, n.leida
--   FROM public.notificacion n
--   JOIN public.tipo_notificacion t ON t.id_tipo = n.id_tipo
--   JOIN public.comanda c ON c.id_comanda = n.id_comanda
--   JOIN public.mesa m ON m.id_mesa = c.id_mesa
--  ORDER BY n.fecha_creacion DESC;
