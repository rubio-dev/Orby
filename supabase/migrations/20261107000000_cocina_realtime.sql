-- Realtime para la cocina: agrega comanda y detalle_comanda a la publicación supabase_realtime.
--
-- Qué hace: Postgres solo avisa por Realtime de los cambios en las tablas que están en esta
-- publicación. Hasta ahora ninguna tabla de Orby lo estaba, así que la cocina no se enteraba
-- de las comandas nuevas y tenía que recargar a mano.
-- Qué reemplaza: nada; ninguna migración anterior tocaba la publicación.
-- Por qué estas dos tablas: el mesero abre la cuenta (comanda) y le agrega productos
-- (detalle_comanda); la cocina necesita enterarse de las dos cosas al instante.
--
-- Seguridad: Realtime respeta RLS. Cada usuario solo recibe los cambios de las filas que
-- podría leer con un SELECT normal, es decir, solo los de su cafetería.
--
-- Se revisa antes de agregar porque ALTER PUBLICATION ... ADD TABLE falla si la tabla
-- ya está en la publicación (por ejemplo, si alguien la activó desde el panel).

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['comanda', 'detalle_comanda']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
