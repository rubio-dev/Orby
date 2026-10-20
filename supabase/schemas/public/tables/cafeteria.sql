CREATE TABLE "public"."cafeteria" (
  "id_cafeteria"     uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "nombre_cafeteria" character varying(120) NOT NULL,
  "id_estado"        integer                NOT NULL DEFAULT 1,
  CONSTRAINT "cafeteria_pkey" PRIMARY KEY (id_cafeteria),
  CONSTRAINT "fk_estado" FOREIGN KEY (id_estado) REFERENCES public.estado_cafeteria(id_estado) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."cafeteria"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cafeteria" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cafeteria" TO "service_role";

REVOKE ALL ON TABLE "public"."cafeteria" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cafeteria" TO "postgres";
