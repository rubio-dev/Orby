-- Cerrar la cuenta abierta de una mesa y liberarla.
--
-- Cuándo se usa: el mesero cobra y cierra la visita. La comanda pasa a 'cerrada'
-- (id_estado = 2) para que cuente en las ventas del administrador, y la mesa vuelve
-- a 'libre' (id_estado = 1). Todo pasa en una sola transacción.
--
-- Reglas:
--   - Solo administrador (1) y mesero (2).
--   - La mesa debe tener una cuenta abierta; si no, se avisa con CUENTA_NO_ABIERTA.
--   - No se borra nada: el historial de la comanda y sus productos se conserva.

CREATE OR REPLACE FUNCTION public.cerrar_comanda(p_id_mesa uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $function$
DECLARE
  v_id_cafeteria uuid := public.mi_id_cafeteria();
  v_id_rol       integer := public.mi_id_rol();
  v_id_comanda   uuid;
BEGIN
  IF v_id_cafeteria IS NULL THEN
    RAISE EXCEPTION 'SIN_SESION';
  END IF;

  IF v_id_rol NOT IN (1, 2) THEN
    RAISE EXCEPTION 'SIN_PERMISO';
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

  UPDATE public.comanda
     SET id_estado = 2
   WHERE id_comanda = v_id_comanda;

  UPDATE public.mesa
     SET id_estado = 1
   WHERE id_mesa = p_id_mesa
     AND id_cafeteria = v_id_cafeteria;

  RETURN v_id_comanda;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cerrar_comanda(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cerrar_comanda(uuid) TO authenticated;
