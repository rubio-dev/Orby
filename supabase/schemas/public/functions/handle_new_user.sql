CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_id_cafeteria UUID;
  v_id_rol INT;
BEGIN
  -- 1. Buscar el ID del rol en tu tabla 'role' usando el texto enviado en metadatos
  SELECT id_rol INTO v_id_rol 
  FROM public.role 
  WHERE nombre_rol = new.raw_user_meta_data->>'rol' 
  LIMIT 1;

  -- 2. Evaluar si es un nuevo administrador creando su cafetería o un empleado
  IF new.raw_user_meta_data->>'rol' = 'administrador' THEN
    -- Crea la cafetería y guarda el UUID generado en la variable
    INSERT INTO public.cafeteria (nombre_cafeteria)
    VALUES (new.raw_user_meta_data->>'nombre_cafeteria')
    RETURNING id_cafeteria INTO v_id_cafeteria;
  ELSE
    -- Toma el UUID de la cafetería que el administrador envió al registrar al empleado
    v_id_cafeteria := (new.raw_user_meta_data->>'id_cafeteria')::uuid;
  END IF;

  -- 3. Insertar el registro final en tu tabla 'usuario'
  INSERT INTO public.usuario (id_usuario, id_cafeteria, nombre, id_rol)
  VALUES (
    new.id,
    v_id_cafeteria,
    new.raw_user_meta_data->>'nombre', 
    v_id_rol
  );
  
  RETURN new;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";
