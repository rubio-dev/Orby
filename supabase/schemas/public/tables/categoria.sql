CREATE TABLE "public"."categoria" (
  "id_categoria"     uuid                  NOT NULL DEFAULT gen_random_uuid(),
  "id_cafeteria"     uuid                  NOT NULL,
  "nombre_categoria" character varying(60) NOT NULL,
  CONSTRAINT "categoria_pkey" PRIMARY KEY (id_categoria),
  CONSTRAINT "fk_categoria_cafeteria" FOREIGN KEY (id_cafeteria) REFERENCES public.cafeteria(id_cafeteria) ON DELETE CASCADE
);

ALTER TABLE "public"."categoria"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categoria" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categoria" TO "service_role";

REVOKE ALL ON TABLE "public"."categoria" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categoria" TO "postgres";
