CREATE TABLE "public"."mesa" (
  "id_mesa"      uuid    NOT NULL DEFAULT gen_random_uuid(),
  "id_cafeteria" uuid    NOT NULL,
  "num_mesa"     integer NOT NULL,
  "id_estado"    integer NOT NULL DEFAULT 1,
  CONSTRAINT "fk_cafeteria" FOREIGN KEY (id_cafeteria) REFERENCES public.cafeteria(id_cafeteria) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_estado" FOREIGN KEY (id_estado) REFERENCES public.estado_mesa(id_estado) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "mesa_pkey" PRIMARY KEY (id_mesa),
  CONSTRAINT "uq_mesa_cafeteria" UNIQUE (num_mesa, id_cafeteria)
);

ALTER TABLE "public"."mesa"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mesa" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mesa" TO "service_role";

REVOKE ALL ON TABLE "public"."mesa" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mesa" TO "postgres";
