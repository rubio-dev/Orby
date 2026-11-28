-- Arreglo: la cocina no podía cancelar un producto por falta de insumos.
--
-- Qué pasaba: al cancelar desde la cuenta de cocina salía el error
-- "new row violates row-level security policy for table notificacion".
--
-- Por qué: la función cancelar_detalle_comanda guardaba el aviso para el mesero con
-- "INSERT ... ON CONFLICT DO NOTHING". Cuando un INSERT lleva ON CONFLICT, PostgreSQL
-- también revisa que quien inserta pueda LEER la fila nueva. La cocina no puede leer
-- los avisos del mesero (regla notificacion_ver_propia: cada quien ve solo los suyos,
-- y el administrador ve todos). Por eso funcionaba con el administrador, pero fallaba
-- con la cocina.
--
-- Solución: se quita el ON CONFLICT y se hace un INSERT normal (igual que ya lo hace la
-- app de cocina en otros avisos). Para que un reintento no duplique el aviso, si el
-- id_notificacion ya existe se ignora el error de "llave repetida" (unique_violation).
-- Todo lo demás de la función queda exactamente igual.

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
  -- Sin sesión no se puede hacer nada
  IF v_id_cafeteria IS NULL THEN
    RAISE EXCEPTION 'SIN_SESION';
  END IF;

  -- Solo administrador (1), mesero (2) y cocina (3)
  IF v_id_rol NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'SIN_PERMISO';
  END IF;

  -- Busca el producto, su comanda, el mesero que la abrió y el nombre del producto.
  -- Solo dentro de la misma cafetería. FOR UPDATE evita que dos personas lo cambien a la vez.
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

  -- Una cuenta cerrada ya no se modifica
  IF v_id_estado_com <> 1 THEN
    RAISE EXCEPTION 'CUENTA_CERRADA';
  END IF;

  -- Un producto ya entregado no se cancela
  IF v_id_estado_det = 4 THEN
    RAISE EXCEPTION 'DETALLE_ENTREGADO';
  END IF;

  -- Marca el producto como cancelado (5). Si ya lo estaba (reintento), no lo vuelve a escribir.
  IF v_id_estado_det <> 5 THEN
    UPDATE public.detalle_comanda
       SET id_estado = 5
     WHERE id_detalle = p_id_detalle;
  END IF;

  -- Recalcula el total de la cuenta sin los productos cancelados
  UPDATE public.comanda c
     SET total = COALESCE((
       SELECT SUM(d.cantidad * d.precio_unitario)
         FROM public.detalle_comanda d
        WHERE d.id_comanda = c.id_comanda
          AND d.id_estado <> 5
     ), 0)
   WHERE c.id_comanda = v_id_comanda;

  -- Mensaje del aviso: el que manda la app o uno por defecto
  v_mensaje := nullif(trim(p_mensaje), '');
  IF v_mensaje IS NULL THEN
    v_mensaje := 'Se canceló “' || v_nombre || '” por falta de insumos.';
  END IF;

  -- Guarda el aviso para el mesero (tipo 5 = producto cancelado).
  -- INSERT normal, sin ON CONFLICT (ese era el problema con la cocina).
  -- Si el aviso ya existe porque es un reintento, se ignora el error de llave repetida.
  BEGIN
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
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL; -- el aviso ya se había guardado en un intento anterior
  END;

  RETURN 1;
END;
$function$;

-- Los mismos permisos que antes: solo usuarios con sesión pueden usarla
REVOKE EXECUTE ON FUNCTION public.cancelar_detalle_comanda(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_detalle_comanda(uuid, uuid, text) TO authenticated;
