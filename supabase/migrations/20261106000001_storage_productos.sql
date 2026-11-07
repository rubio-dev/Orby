-- Ampliar la columna imagen_url para permitir URLs completas de Supabase Storage
ALTER TABLE "public"."producto"
  ALTER COLUMN "imagen_url" TYPE text;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'productos',
      'productos',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    DROP POLICY IF EXISTS "productos_imagenes_lectura" ON storage.objects;
    CREATE POLICY "productos_imagenes_lectura"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'productos');

    DROP POLICY IF EXISTS "productos_imagenes_admin_insertar" ON storage.objects;
    CREATE POLICY "productos_imagenes_admin_insertar"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'productos'
        AND public.mi_id_rol() = 1
        AND (storage.foldername(name))[1] = public.mi_id_cafeteria()::text
      );

    DROP POLICY IF EXISTS "productos_imagenes_admin_actualizar" ON storage.objects;
    CREATE POLICY "productos_imagenes_admin_actualizar"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'productos'
        AND public.mi_id_rol() = 1
        AND (storage.foldername(name))[1] = public.mi_id_cafeteria()::text
      );

    DROP POLICY IF EXISTS "productos_imagenes_admin_eliminar" ON storage.objects;
    CREATE POLICY "productos_imagenes_admin_eliminar"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'productos'
        AND public.mi_id_rol() = 1
        AND (storage.foldername(name))[1] = public.mi_id_cafeteria()::text
      );
  END IF;
END $$;
