-- Cancelar un producto específico de una comanda abierta y avisar al mesero.
--
-- Cuándo se usa: la cocina se queda sin un insumo y no puede preparar un platillo.
-- El producto se marca como cancelado (id_estado = 5), se recalcula el total de la
-- comanda sin esa línea y se inserta una notificación para el mesero que abrió la cuenta.
--
-- Reglas:
--   - Solo administrador (1), mesero (2) y cocina (3) de la misma cafetería.
--   - La cuenta debe seguir abierta; una cuenta cerrada ya no se puede modificar.
--   - Un producto ya entregado no se cancela: primero tendría que revertirse su estado.
--   - Es idempotente: si el reintento llega después de aplicar el cambio, no duplica
--     la notificación porque recibe un id_notificacion estable desde el teléfono.
--   - El total se recalcula desde los detalles no cancelados, así nunca queda cobrado
--     un platillo que la cocina no pudo preparar.

ALTER TABLE public.notificacion
  ADD COLUMN IF NOT EXISTS mensaje text;

INSERT INTO public.tipo_notificacion (id_tipo, nombre_tipo)
OVERRIDING SYSTEM VALUE VALUES
  (5, 'producto_cancelado')
ON CONFLICT (id_tipo) DO UPDATE SET nombre_tipo = EXCLUDED.nombre_tipo;

SELECT setval(
  pg_get_serial_sequence('public.tipo_notificacion', 'id_tipo'),
  (SELECT MAX(id_tipo) FROM public.tipo_notificacion)
);

CREATE OR REPLACE FUNCTION public.cancelar_detalle_comanda(
  p_id_detalle uuid,
  p_id_notificacion uuid,
  p_mensaje text DEFAULT NULL
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $function$
DECLARE
  v_id_cafeteria  uuid := public.mi_id_cafeteria();
  v_id_rol        integer := public.mi_id_rol();
  v_id_comanda    uuid;
  v_id_usuario    uuid;
  v_id_estado_det integer;
  v_id_estado_com integer;
  v_nombre        text;
  v_mensaje       text;
BEGIN
  IF v_id_cafeteria IS NULL THEN
    RAISE EXCEPTION 'SIN_SESION';
  END IF;

  IF v_id_rol NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'SIN_PERMISO';
  END IF;

  SELECT d.id_comanda,
         d.id_estado,
         c.id_usuario,
         c.id_estado,
         p.nombre_producto
    INTO v_id_comanda,
         v_id_estado_det,
         v_id_usuario,
         v_id_estado_com,
         v_nombre
    FROM public.detalle_comanda d
    JOIN public.comanda c ON c.id_comanda = d.id_comanda
    JOIN public.producto p ON p.id_producto = d.id_producto
   WHERE d.id_detalle = p_id_detalle
     AND c.id_cafeteria = v_id_cafeteria
   FOR UPDATE OF d, c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DETALLE_INVALIDO';
  END IF;

  IF v_id_estado_com <> 1 THEN
    RAISE EXCEPTION 'CUENTA_CERRADA';
  END IF;

  IF v_id_estado_det = 4 THEN
    RAISE EXCEPTION 'DETALLE_ENTREGADO';
  END IF;

  -- Si ya estaba cancelado (reintento), no se vuelve a escribir el detalle.
  IF v_id_estado_det <> 5 THEN
    UPDATE public.detalle_comanda
       SET id_estado = 5
     WHERE id_detalle = p_id_detalle;
  END IF;

  UPDATE public.comanda c
     SET total = COALESCE((
       SELECT SUM(d.cantidad * d.precio_unitario)
         FROM public.detalle_comanda d
        WHERE d.id_comanda = c.id_comanda
          AND d.id_estado <> 5
     ), 0)
   WHERE c.id_comanda = v_id_comanda;

  v_mensaje := nullif(trim(p_mensaje), '');
  IF v_mensaje IS NULL THEN
    v_mensaje := 'Se canceló “' || v_nombre || '” por falta de insumos.';
  END IF;

  INSERT INTO public.notificacion (
    id_notificacion,
    id_cafeteria,
    id_usuario,
    id_comanda,
    id_tipo,
    mensaje
  ) VALUES (
    p_id_notificacion,
    v_id_cafeteria,
    v_id_usuario,
    v_id_comanda,
    5,
    v_mensaje
  )
  ON CONFLICT (id_notificacion) DO NOTHING;

  RETURN 1;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancelar_detalle_comanda(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_detalle_comanda(uuid, uuid, text) TO authenticated;
