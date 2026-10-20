CREATE TABLE "public"."producto" (
  "id_producto"     uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "id_cafeteria"    uuid                   NOT NULL,
  "id_categoria"    uuid                   NOT NULL,
  "nombre_producto" character varying(120) NOT NULL,
  "descripcion"     character varying(200),
  "precio"          numeric(10,2)          NOT NULL,
  "imagen_url"      character varying(255),
  "estado"          boolean                NOT NULL DEFAULT true,
  CONSTRAINT "fk_producto_cafeteria" FOREIGN KEY (id_cafeteria) REFERENCES public.cafeteria(id_cafeteria) ON DELETE CASCADE,
  CONSTRAINT "fk_producto_categoria" FOREIGN KEY (id_categoria) REFERENCES public.categoria(id_categoria) ON DELETE RESTRICT,
  CONSTRAINT "producto_pkey" PRIMARY KEY (id_producto),
  CONSTRAINT "producto_precio_check" CHECK ((precio >= (0)::numeric))
);

ALTER TABLE "public"."producto"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."producto" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."producto" TO "service_role";

REVOKE ALL ON TABLE "public"."producto" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."producto" TO "postgres";
