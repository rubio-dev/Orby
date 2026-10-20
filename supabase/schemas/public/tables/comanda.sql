CREATE TABLE "public"."comanda" (
  "id_comanda"     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "id_cafeteria"   uuid                     NOT NULL,
  "id_mesa"        uuid                     NOT NULL,
  "id_usuario"     uuid                     NOT NULL,
  "id_estado"      integer                  NOT NULL DEFAULT 1,
  "total"          numeric(10,2)            DEFAULT 0.00,
  "fecha_creacion" timestamp with time zone DEFAULT now(),
  CONSTRAINT "comanda_pkey" PRIMARY KEY (id_comanda),
  CONSTRAINT "fk_comanda_cafeteria" FOREIGN KEY (id_cafeteria) REFERENCES public.cafeteria(id_cafeteria) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_estado_comanda" FOREIGN KEY (id_estado) REFERENCES public.estado_comanda(id_estado),
  CONSTRAINT "fk_comanda_mesa" FOREIGN KEY (id_mesa) REFERENCES public.mesa(id_mesa) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_comanda_usuario" FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."comanda"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comanda" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comanda" TO "service_role";

REVOKE ALL ON TABLE "public"."comanda" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comanda" TO "postgres";
