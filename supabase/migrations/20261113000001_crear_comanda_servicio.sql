-- Crear una comanda de mesa o para llevar, con sus productos, en una sola transacción.
--
-- Qué reemplaza: la versión de 20261112000001, que solo sabía de mesas.
--
-- Reglas:
--   1. Solo administrador (1) y mesero (2) pueden abrir cuentas.
--   2. En mesa: la mesa debe existir, ser de la cafetería y estar libre u ocupada.
--      Las mesas apartadas o inactivas no aceptan pedidos.
--   3. Para llevar: no lleva mesa y sí necesita un nombre/referencia para llamar al cliente.
--   4. Si la mesa ya tiene una cuenta abierta, los productos se agregan a esa cuenta.
--   5. Los precios salen del catálogo, no del teléfono.
--   6. Es idempotente: el teléfono manda UUID estables para la comanda y cada producto.
--
-- Seguridad: SECURITY INVOKER, así que los INSERT/UPDATE siguen pasando por RLS.

DROP FUNCTION IF EXISTS public.crear_comanda(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.crear_comanda(
  p_id_comanda uuid,
  p_id_mesa uuid,
  p_detalles jsonb,
  p_tipo_servicio text DEFAULT 'mesa',
  p_nombre_cliente text DEFAULT NULL
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

    -- 3 = apartada, 4 = inactiva. Solo se atiende una mesa libre u ocupada.
    IF v_estado_mesa IN (3, 4) THEN
      RAISE EXCEPTION 'MESA_NO_DISPONIBLE';
    END IF;
  ELSE
    IF p_id_mesa IS NOT NULL THEN
      RAISE EXCEPTION 'MESA_INVALIDA';
    END IF;

    IF v_nombre IS NULL THEN
      RAISE EXCEPTION 'NOMBRE_REQUERIDO';
    END IF;
  END IF;

  -- Los productos tienen que existir, ser de la cafetería y estar disponibles
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

  -- En mesa se serializa por mesa; para llevar, por comanda (para los reintentos).
  IF v_tipo = 'mesa' THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_id_mesa::text));
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext(p_id_comanda::text));
  END IF;

  -- ¿Ya existe la comanda de este envío? Pasa cuando se reintenta y la respuesta se perdió.
  SELECT c.id_comanda
    INTO v_id_comanda
    FROM public.comanda c
   WHERE c.id_comanda = p_id_comanda;

  -- En mesa, si no existe, se reutiliza la cuenta abierta de esa mesa.
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
      nombre_cliente
    ) VALUES (
      p_id_comanda,
      v_id_cafeteria,
      CASE WHEN v_tipo = 'mesa' THEN p_id_mesa ELSE NULL END,
      (SELECT auth.uid()),
      1,
      0,
      v_tipo,
      v_nombre
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

  -- La mesa queda ocupada en la misma transacción; para llevar no se toca ninguna mesa.
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

REVOKE EXECUTE ON FUNCTION public.crear_comanda(uuid, uuid, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_comanda(uuid, uuid, jsonb, text, text) TO authenticated;
