CREATE TABLE "public"."notificacion" (
  "id_notificacion" uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "id_cafeteria"    uuid                     NOT NULL,
  "id_usuario"      uuid                     NOT NULL,
  "id_comanda"      uuid                     NOT NULL,
  "id_tipo"         integer                  NOT NULL,
  "leida"           boolean                  NOT NULL DEFAULT false,
  "fecha_creacion"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "fk_notificacion_cafeteria" FOREIGN KEY (id_cafeteria) REFERENCES public.cafeteria(id_cafeteria) ON DELETE CASCADE,
  CONSTRAINT "fk_notificacion_comanda" FOREIGN KEY (id_comanda) REFERENCES public.comanda(id_comanda) ON DELETE CASCADE,
  CONSTRAINT "notificacion_pkey" PRIMARY KEY (id_notificacion),
  CONSTRAINT "fk_tipo_alerta" FOREIGN KEY (id_tipo) REFERENCES public.tipo_notificacion(id_tipo),
  CONSTRAINT "fk_notificacion_usuario" FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE
);

ALTER TABLE "public"."notificacion"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notificacion" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notificacion" TO "service_role";

REVOKE ALL ON TABLE "public"."notificacion" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notificacion" TO "postgres";
