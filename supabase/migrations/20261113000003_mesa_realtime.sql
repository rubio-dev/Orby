-- Realtime para el estado de las mesas.
--
-- Qué hace: cuando un mesero abre o cierra una mesa, los demás dispositivos se enteran
-- al instante. Antes solo se actualizaba al recargar la pantalla, así que dos meseros
-- podían ver la misma mesa como libre.
--
-- Seguridad: Realtime respeta RLS. mesa_lectura_cafeteria solo deja ver las mesas de
-- la cafetería del usuario.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'mesa'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa';
  END IF;
END $$;
