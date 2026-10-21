-- La comanda es la cuenta de una visita: se abre al sentarse la mesa y se cierra al pagar.
-- Mientras está abierta se le agregan productos; si piden algo después de cerrarla, va una comanda nueva.
-- El estado de preparación vive en cada producto (estado_detalles_comanda), no en la comanda.

-- 1. Catálogo de estados de la comanda: abierta, cerrada y cancelada
-- Primero se reasignan las comandas que existan a los ids que tendrán los estados nuevos,
-- porque id_estado tiene llave foránea contra este catálogo.
UPDATE "public"."comanda" SET "id_estado" = CASE
  WHEN "id_estado" IN (1, 2, 3) THEN 1 -- pendiente, en preparación y listo pasan a abierta
  WHEN "id_estado" = 4            THEN 2 -- entregada pasa a cerrada
  WHEN "id_estado" = 5            THEN 3 -- cancelada se conserva
  ELSE "id_estado"
END;

-- Se borran los dos estados que sobran antes de renombrar, porque nombre_estado es único
DELETE FROM "public"."estado_comanda" WHERE "id_estado" IN (4, 5);

UPDATE "public"."estado_comanda" SET "nombre_estado" = 'abierta'   WHERE "id_estado" = 1;
UPDATE "public"."estado_comanda" SET "nombre_estado" = 'cerrada'   WHERE "id_estado" = 2;
UPDATE "public"."estado_comanda" SET "nombre_estado" = 'cancelada' WHERE "id_estado" = 3;

SELECT setval(
  pg_get_serial_sequence('public.estado_comanda', 'id_estado'),
  (SELECT MAX("id_estado") FROM "public"."estado_comanda")
);

-- 2. Hora de alta por producto
-- Con la comanda abierta, la espera se mide desde que se pide cada producto y no desde que
-- se abrió la cuenta: un postre pedido a las 14:30 no lleva esperando desde la 13:00.
-- También permite a la cocina distinguir lo que acaba de entrar de lo que ya se sirvió.
ALTER TABLE "public"."detalle_comanda"
  ADD COLUMN IF NOT EXISTS "fecha_creacion" timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS "idx_detalle_comanda_fecha_creacion"
  ON "public"."detalle_comanda" ("id_comanda", "fecha_creacion");

-- 3. Una sola comanda abierta por mesa
-- Evita que se abran dos cuentas para la misma mesa y los productos queden partidos en dos tickets.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comanda_una_abierta_por_mesa"
  ON "public"."comanda" ("id_mesa") WHERE "id_estado" = 1;
