-- Crear una comanda con sus productos en una sola transacción.
--
-- Qué reemplaza: los INSERT separados que hacía src/context/orders-context.tsx (cabecera en
-- comanda y, antes, ningún producto en detalle_comanda). Así la cocina nunca recibe una
-- cuenta vacía y no queda una cabecera a medias si falla un producto.
--
-- Reglas:
--   1. Solo administrador (1) y mesero (2) pueden abrir cuentas.
--   2. La mesa y los productos tienen que ser de la cafetería de quien llama.
--   3. Si la mesa ya tiene una cuenta abierta, los productos se agregan a esa cuenta;
--      si no, se crea una nueva. Es la misma regla del índice idx_comanda_una_abierta_por_mesa.
--   4. La mesa queda ocupada en la misma transacción.
--   5. Es idempotente: el teléfono manda un UUID para la comanda y uno por producto.
--      Si la petición se reintenta porque se perdió la respuesta, los productos que ya
--      existen se ignoran (ON CONFLICT) y el total no se suma dos veces.
--
-- Seguridad: es SECURITY INVOKER, así que los INSERT/UPDATE siguen pasando por RLS con el
-- usuario de la sesión. Las funciones mi_id_cafeteria() y mi_id_rol() son SECURITY DEFINER
-- y solo devuelven datos del usuario autenticado.
--
-- Errores: la app traduce los textos SIN_SESION, SIN_PERMISO, SIN_PRODUCTOS, MESA_INVALIDA
-- y PRODUCTO_INVALIDO a mensajes en español.

-- Por si quedó una versión anterior con otra firma durante el desarrollo.
DROP FUNCTION IF EXISTS public.crear_comanda(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.crear_comanda(
  p_id_comanda uuid,
  p_id_mesa uuid,
  p_detalles jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $function$
DECLARE
  v_id_cafeteria uuid := public.mi_id_cafeteria();
  v_id_rol       integer := public.mi_id_rol();
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

  IF p_detalles IS NULL
     OR jsonb_typeof(p_detalles) <> 'array'
     OR jsonb_array_length(p_detalles) = 0 THEN
    RAISE EXCEPTION 'SIN_PRODUCTOS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.mesa m
     WHERE m.id_mesa = p_id_mesa
       AND m.id_cafeteria = v_id_cafeteria
  ) THEN
    RAISE EXCEPTION 'MESA_INVALIDA';
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

  -- Serializa dos meseros que envían a la misma mesa al mismo tiempo: el segundo espera
  -- y encuentra la cuenta que acaba de abrir el primero.
  PERFORM pg_advisory_xact_lock(hashtext(p_id_mesa::text));

  -- ¿Ya existe la comanda de este envío? Pasa cuando se reintenta y la respuesta se perdió.
  SELECT c.id_comanda
    INTO v_id_comanda
    FROM public.comanda c
   WHERE c.id_comanda = p_id_comanda;

  -- Si no, se reutiliza la cuenta abierta de la mesa (si hay) o se crea una nueva.
  IF v_id_comanda IS NULL THEN
    SELECT c.id_comanda
      INTO v_id_comanda
      FROM public.comanda c
     WHERE c.id_mesa = p_id_mesa
       AND c.id_estado = 1
     FOR UPDATE;
  END IF;

  IF v_id_comanda IS NULL THEN
    INSERT INTO public.comanda (id_comanda, id_cafeteria, id_mesa, id_usuario, id_estado, total)
    VALUES (p_id_comanda, v_id_cafeteria, p_id_mesa, (SELECT auth.uid()), 1, 0)
    RETURNING id_comanda INTO v_id_comanda;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_detalles)
  LOOP
    -- El precio sale del catálogo, no de lo que manda el teléfono: así nadie puede
    -- cambiar el cobro desde la app. ON CONFLICT hace que un reintento no duplique.
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

  -- Solo se suma lo que de verdad se insertó: un reintento deja el total igual.
  IF v_total_nuevo > 0 THEN
    UPDATE public.comanda
       SET total = coalesce(total, 0) + v_total_nuevo
     WHERE id_comanda = v_id_comanda;
  END IF;

  UPDATE public.mesa
     SET id_estado = 2
   WHERE id_mesa = p_id_mesa
     AND id_cafeteria = v_id_cafeteria
     AND id_estado <> 2;

  RETURN v_id_comanda;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.crear_comanda(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_comanda(uuid, uuid, jsonb) TO authenticated;
