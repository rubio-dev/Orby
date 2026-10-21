CREATE TABLE "public"."detalle_comanda" (
  "id_detalle"       uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "id_comanda"       uuid                   NOT NULL,
  "id_producto"      uuid                   NOT NULL,
  "cantidad"         smallint               NOT NULL,
  "precio_unitario"  numeric(10,2)          NOT NULL,
  "especificaciones" character varying(255),
  "tiempo_estimado"  smallint,
  "id_estado"        integer                NOT NULL DEFAULT 1,
  "fecha_creacion"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "detalle_comanda_cantidad_check" CHECK ((cantidad > 0)),
  CONSTRAINT "detalle_comanda_pkey" PRIMARY KEY (id_detalle),
  CONSTRAINT "fk_detalle_comanda" FOREIGN KEY (id_comanda) REFERENCES public.comanda(id_comanda) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_estado_detalle" FOREIGN KEY (id_estado) REFERENCES public.estado_detalles_comanda(id_estado),
  CONSTRAINT "fk_detalle_producto" FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto)
);

CREATE INDEX "idx_detalle_comanda_fecha_creacion"
  ON "public"."detalle_comanda" ("id_comanda", "fecha_creacion");

ALTER TABLE "public"."detalle_comanda"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."detalle_comanda" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."detalle_comanda" TO "service_role";

REVOKE ALL ON TABLE "public"."detalle_comanda" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."detalle_comanda" TO "postgres";
