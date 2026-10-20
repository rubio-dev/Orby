CREATE TABLE "public"."usuario" (
  "id_usuario"   uuid                   NOT NULL,
  "id_cafeteria" uuid                   NOT NULL,
  "nombre"       character varying(140) NOT NULL,
  "foto"         character varying(255),
  "id_rol"       integer                NOT NULL,
  "push_token"   character varying(255),
  CONSTRAINT "fk_cafeteria" FOREIGN KEY (id_cafeteria) REFERENCES public.cafeteria(id_cafeteria) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_roles" FOREIGN KEY (id_rol) REFERENCES public.role(id_rol) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_user_auth" FOREIGN KEY (id_usuario) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "usuario_pkey" PRIMARY KEY (id_usuario)
);

ALTER TABLE "public"."usuario"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."usuario" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."usuario" TO "service_role";

REVOKE ALL ON TABLE "public"."usuario" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."usuario" TO "postgres";
