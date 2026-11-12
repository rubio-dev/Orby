-- Pago, entrega y cierre de cuentas.
--
-- Flujo:
--   - Para llevar: se cobra al crear la comanda (pagado = true, metodo_pago, fecha_pago).
--   - En mesa: se cobra al final, al cerrar la cuenta.
--   - La cocina marca los productos como listos; el mesero los marca como entregados.
--   - La cuenta no se puede cerrar mientras haya productos pendientes o sin entregar.
--
-- Qué agrega a comanda:
--   pagado, metodo_pago ('efectivo', 'tarjeta', 'transferencia'), fecha_pago y fecha_entrega.

ALTER TABLE public.comanda
  ADD COLUMN IF NOT EXISTS pagado boolean NOT NULL DEFAULT false;

ALTER TABLE public.comanda
  ADD COLUMN IF NOT EXISTS metodo_pago text;

ALTER TABLE public.comanda
  ADD COLUMN IF NOT EXISTS fecha_pago timestamp with time zone;

ALTER TABLE public.comanda
  ADD COLUMN IF NOT EXISTS fecha_entrega timestamp with time zone;

ALTER TABLE public.comanda
  DROP CONSTRAINT IF EXISTS comanda_metodo_pago_check;

ALTER TABLE public.comanda
  ADD CONSTRAINT comanda_metodo_pago_check CHECK (
    metodo_pago IS NULL OR metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')
  );

-- ---------------------------------------------------------------------------
-- crear_comanda: agrega el cobro inmediato de los pedidos para llevar.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.crear_comanda(uuid, uuid, jsonb, text, text);

CREATE OR REPLACE FUNCTION public.crear_comanda(
  p_id_comanda uuid,
  p_id_mesa uuid,
  p_detalles jsonb,
  p_tipo_servicio text DEFAULT 'mesa',
  p_nombre_cliente text DEFAULT NULL,
  p_pagado boolean DEFAULT false,
  p_metodo_pago text DEFAULT NULL
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $function$
DECLARE
  v_id_cafeteria uuid := public.mi_id_cafeteria();
  v_id_rol       integer := public.mi_id_rol();
  v_tipo         text := lower(coalesce(nullif(trim(p_tipo_servicio), ''), 'mesa'));
  v_nombre       text := nullif(trim(p_nombre_cliente), '');
  v_metodo       text := lower(nullif(trim(p_metodo_pago), ''));
  v_estado_mesa  integer;
  v_id_comanda   uuid;
  v_total_nuevo  numeric(10,2) := 0;
  v_precio_linea numeric(10,2);
  v_item         jsonb;
BEGIN
  IF v_id_cafeteria IS NULL THEN
    RAISE EXCEPTION 'SIN_SESION';
  END IF;

  IF v_id_rol NOT IN (1, 2) THEN
    RAISE EXCEPTION 'SIN_PERMISO';
  END IF;

  IF v_tipo NOT IN ('mesa', 'llevar') THEN
    RAISE EXCEPTION 'TIPO_INVALIDO';
  END IF;

  IF v_metodo IS NOT NULL AND v_metodo NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'METODO_PAGO_INVALIDO';
  END IF;

  IF p_detalles IS NULL
     OR jsonb_typeof(p_detalles) <> 'array'
     OR jsonb_array_length(p_detalles) = 0 THEN
    RAISE EXCEPTION 'SIN_PRODUCTOS';
  END IF;

  IF v_tipo = 'mesa' THEN
    IF p_id_mesa IS NULL THEN
      RAISE EXCEPTION 'MESA_INVALIDA';
    END IF;

    SELECT m.id_estado
      INTO v_estado_mesa
      FROM public.mesa m
     WHERE m.id_mesa = p_id_mesa
       AND m.id_cafeteria = v_id_cafeteria;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'MESA_INVALIDA';
    END IF;

    IF v_estado_mesa IN (3, 4) THEN
      RAISE EXCEPTION 'MESA_NO_DISPONIBLE';
    END IF;

    -- En mesa se cobra al final, no al crear la comanda.
    v_metodo := NULL;
  ELSE
    IF p_id_mesa IS NOT NULL THEN
      RAISE EXCEPTION 'MESA_INVALIDA';
    END IF;

    IF v_nombre IS NULL THEN
      RAISE EXCEPTION 'NOMBRE_REQUERIDO';
    END IF;

    IF NOT coalesce(p_pagado, false) OR v_metodo IS NULL THEN
      RAISE EXCEPTION 'PAGO_REQUERIDO';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_detalles) AS d
      LEFT JOIN public.producto p ON p.id_producto = (d.value->>'id_producto')::uuid
     WHERE p.id_producto IS NULL
        OR p.id_cafeteria <> v_id_cafeteria
        OR p.estado = false
  ) THEN
    RAISE EXCEPTION 'PRODUCTO_INVALIDO';
  END IF;

  IF v_tipo = 'mesa' THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_id_mesa::text));
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext(p_id_comanda::text));
  END IF;

  SELECT c.id_comanda
    INTO v_id_comanda
    FROM public.comanda c
   WHERE c.id_comanda = p_id_comanda;

  IF v_id_comanda IS NULL AND v_tipo = 'mesa' THEN
    SELECT c.id_comanda
      INTO v_id_comanda
      FROM public.comanda c
     WHERE c.id_mesa = p_id_mesa
       AND c.id_estado = 1
     FOR UPDATE;
  END IF;

  IF v_id_comanda IS NULL THEN
    INSERT INTO public.comanda (
      id_comanda,
      id_cafeteria,
      id_mesa,
      id_usuario,
      id_estado,
      total,
      tipo_servicio,
      nombre_cliente,
      pagado,
      metodo_pago,
      fecha_pago
    ) VALUES (
      p_id_comanda,
      v_id_cafeteria,
      CASE WHEN v_tipo = 'mesa' THEN p_id_mesa ELSE NULL END,
      (SELECT auth.uid()),
      1,
      0,
      v_tipo,
      v_nombre,
      CASE WHEN v_tipo = 'llevar' THEN true ELSE false END,
      CASE WHEN v_tipo = 'llevar' THEN v_metodo ELSE NULL END,
      CASE WHEN v_tipo = 'llevar' THEN now() ELSE NULL END
    )
    RETURNING id_comanda INTO v_id_comanda;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_detalles)
  LOOP
    INSERT INTO public.detalle_comanda (
      id_detalle,
      id_comanda,
      id_producto,
      cantidad,
      precio_unitario,
      especificaciones,
      tiempo_estimado,
      id_estado
    ) VALUES (
      (v_item->>'id_detalle')::uuid,
      v_id_comanda,
      (v_item->>'id_producto')::uuid,
      (v_item->>'cantidad')::smallint,
      (SELECT p.precio FROM public.producto p WHERE p.id_producto = (v_item->>'id_producto')::uuid),
      nullif(trim(v_item->>'especificaciones'), ''),
      coalesce((v_item->>'tiempo_estimado')::smallint, 15),
      coalesce((v_item->>'id_estado')::integer, 2)
    )
    ON CONFLICT (id_detalle) DO NOTHING
    RETURNING cantidad * precio_unitario INTO v_precio_linea;

    IF FOUND THEN
      v_total_nuevo := v_total_nuevo + v_precio_linea;
    END IF;
  END LOOP;

  IF v_total_nuevo > 0 THEN
    UPDATE public.comanda
       SET total = coalesce(total, 0) + v_total_nuevo
     WHERE id_comanda = v_id_comanda;
  END IF;

  IF v_tipo = 'mesa' THEN
    UPDATE public.mesa
       SET id_estado = 2
     WHERE id_mesa = p_id_mesa
       AND id_cafeteria = v_id_cafeteria
       AND id_estado <> 2;
  END IF;

  RETURN v_id_comanda;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.crear_comanda(uuid, uuid, jsonb, text, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_comanda(uuid, uuid, jsonb, text, text, boolean, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- entregar_comanda: el mesero marca como entregados los productos listos.
-- Para llevar, cuando ya no queda nada pendiente, la comanda se cierra.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.entregar_comanda(uuid);

CREATE OR REPLACE FUNCTION public.entregar_comanda(p_id_comanda uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $function$
DECLARE
  v_id_cafeteria uuid := public.mi_id_cafeteria();
  v_id_rol       integer := public.mi_id_rol();
  v_tipo         text;
  v_entregados   integer := 0;
BEGIN
  IF v_id_cafeteria IS NULL THEN
    RAISE EXCEPTION 'SIN_SESION';
  END IF;

  IF v_id_rol NOT IN (1, 2) THEN
    RAISE EXCEPTION 'SIN_PERMISO';
  END IF;

  SELECT c.tipo_servicio
    INTO v_tipo
    FROM public.comanda c
   WHERE c.id_comanda = p_id_comanda
     AND c.id_cafeteria = v_id_cafeteria;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMANDA_INVALIDA';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_id_comanda::text));

  UPDATE public.detalle_comanda
     SET id_estado = 4 -- entregado
   WHERE id_comanda = p_id_comanda
     AND id_estado = 3; -- listo

  GET DIAGNOSTICS v_entregados = ROW_COUNT;

  UPDATE public.comanda
     SET fecha_entrega = now()
   WHERE id_comanda = p_id_comanda;

  -- Para llevar no hay mesa ni cuenta posterior: al entregar todo, se cierra.
  IF v_tipo = 'llevar'
     AND NOT EXISTS (
       SELECT 1 FROM public.detalle_comanda d
        WHERE d.id_comanda = p_id_comanda
          AND d.id_estado IN (1, 2, 3)
     ) THEN
    UPDATE public.comanda
       SET id_estado = 2
     WHERE id_comanda = p_id_comanda;
  END IF;

  RETURN v_entregados;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.entregar_comanda(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entregar_comanda(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- cerrar_comanda: cobra la cuenta de una mesa, la cierra y libera la mesa.
-- Exige que ya no haya productos pendientes ni sin entregar.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.cerrar_comanda(uuid);

CREATE OR REPLACE FUNCTION public.cerrar_comanda(
  p_id_mesa uuid,
  p_metodo_pago text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $function$
DECLARE
  v_id_cafeteria uuid := public.mi_id_cafeteria();
  v_id_rol       integer := public.mi_id_rol();
  v_metodo       text := lower(nullif(trim(p_metodo_pago), ''));
  v_id_comanda   uuid;
BEGIN
  IF v_id_cafeteria IS NULL THEN
    RAISE EXCEPTION 'SIN_SESION';
  END IF;

  IF v_id_rol NOT IN (1, 2) THEN
    RAISE EXCEPTION 'SIN_PERMISO';
  END IF;

  IF v_metodo IS NULL OR v_metodo NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'METODO_PAGO_INVALIDO';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.mesa m
     WHERE m.id_mesa = p_id_mesa
       AND m.id_cafeteria = v_id_cafeteria
  ) THEN
    RAISE EXCEPTION 'MESA_INVALIDA';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_id_mesa::text));

  SELECT c.id_comanda
    INTO v_id_comanda
    FROM public.comanda c
   WHERE c.id_mesa = p_id_mesa
     AND c.id_estado = 1
   FOR UPDATE;

  IF v_id_comanda IS NULL THEN
    RAISE EXCEPTION 'CUENTA_NO_ABIERTA';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.detalle_comanda d
     WHERE d.id_comanda = v_id_comanda
       AND d.id_estado IN (1, 2)
  ) THEN
    RAISE EXCEPTION 'PEDIDOS_PENDIENTES';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.detalle_comanda d
     WHERE d.id_comanda = v_id_comanda
       AND d.id_estado = 3
  ) THEN
    RAISE EXCEPTION 'PEDIDOS_NO_ENTREGADOS';
  END IF;

  UPDATE public.comanda
     SET id_estado = 2,
         pagado = true,
         metodo_pago = v_metodo,
         fecha_pago = now()
   WHERE id_comanda = v_id_comanda;

  UPDATE public.mesa
     SET id_estado = 1
   WHERE id_mesa = p_id_mesa
     AND id_cafeteria = v_id_cafeteria;

  RETURN v_id_comanda;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cerrar_comanda(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cerrar_comanda(uuid, text) TO authenticated;
