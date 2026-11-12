-- Realtime para los avisos del mesero: agrega notificacion a la publicación supabase_realtime.
--
-- Qué hace: el mesero recibe al instante los avisos que crea la cocina ("pedido listo")
-- sin tener que recargar la pantalla. La migración de cocina (20261107000000) ya agregó
-- comanda y detalle_comanda; faltaba esta tabla.
--
-- Seguridad: Realtime respeta RLS. La política notificacion_ver_propia solo deja ver
-- los avisos propios (o todos, si es administrador), así que cada usuario recibe los suyos.
--
-- Se revisa antes de agregar porque ALTER PUBLICATION ... ADD TABLE falla si la tabla
-- ya está en la publicación (por ejemplo, si alguien la activó desde el panel).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'notificacion'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacion';
  END IF;
END $$;
