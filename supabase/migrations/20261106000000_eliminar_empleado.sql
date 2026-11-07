-- Baja completa de un empleado.
--
-- Borrar solo la fila de public.usuario dejaba la cuenta en auth.users, así que el correo
-- seguía ocupado y no se podía volver a registrar. Esta función borra la cuenta en auth.users;
-- por el ON DELETE CASCADE (fk_user_auth) también desaparece su perfil en public.usuario.
--
-- Es SECURITY DEFINER porque el cliente no puede escribir en el esquema auth. Por eso valida
-- todo en el servidor: que quien llama sea administrador y que el empleado sea de SU cafetería.
-- Roles: 1 administrador, 2 mesero, 3 cocina.

CREATE OR REPLACE FUNCTION public.eliminar_empleado(p_id_usuario uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, auth
  AS $function$
DECLARE
  v_id_rol       integer;
  v_id_cafeteria uuid;
BEGIN
  IF public.mi_id_rol() IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Solo el administrador puede eliminar empleados.' USING ERRCODE = '42501';
  END IF;

  IF p_id_usuario = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta.' USING ERRCODE = '42501';
  END IF;

  SELECT id_rol, id_cafeteria INTO v_id_rol, v_id_cafeteria
  FROM public.usuario
  WHERE id_usuario = p_id_usuario;

  -- Mismo mensaje si no existe o es de otra cafetería, para no revelar usuarios ajenos
  IF NOT FOUND OR v_id_cafeteria IS DISTINCT FROM public.mi_id_cafeteria() THEN
    RAISE EXCEPTION 'Empleado no encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_id_rol = 1 THEN
    RAISE EXCEPTION 'No se puede eliminar a un administrador.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = p_id_usuario;
END;
$function$;

-- Solo usuarios con sesión pueden llamarla (y la propia función revisa que sean administradores)
REVOKE ALL ON FUNCTION public.eliminar_empleado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_empleado(uuid) TO authenticated;
