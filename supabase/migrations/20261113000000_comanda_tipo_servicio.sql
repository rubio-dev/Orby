-- Tipo de servicio de la comanda: en mesa o para llevar.
--
-- Qué agrega:
--   - tipo_servicio: 'mesa' o 'llevar'.
--   - nombre_cliente: referencia para llamar al cliente en los pedidos para llevar.
--   - id_mesa deja de ser obligatorio: un pedido para llevar no ocupa mesa.
--
-- La regla de negocio queda en la base: una comanda de mesa siempre lleva id_mesa;
-- una para llevar nunca. Así no se puede guardar un estado incoherente desde la app.
--
-- El índice idx_comanda_una_abierta_por_mesa sigue funcionando: en Postgres los NULL
-- no chocan entre sí, así que puede haber varias comandas para llevar abiertas.

ALTER TABLE public.comanda
  ALTER COLUMN id_mesa DROP NOT NULL;

ALTER TABLE public.comanda
  ADD COLUMN IF NOT EXISTS tipo_servicio text NOT NULL DEFAULT 'mesa';

ALTER TABLE public.comanda
  ADD COLUMN IF NOT EXISTS nombre_cliente character varying(80);

ALTER TABLE public.comanda
  DROP CONSTRAINT IF EXISTS comanda_servicio_check;

ALTER TABLE public.comanda
  ADD CONSTRAINT comanda_servicio_check CHECK (
    tipo_servicio IN ('mesa', 'llevar')
    AND (
      (tipo_servicio = 'mesa' AND id_mesa IS NOT NULL)
      OR (tipo_servicio = 'llevar' AND id_mesa IS NULL)
    )
  );

CREATE INDEX IF NOT EXISTS idx_comanda_tipo_servicio
  ON public.comanda (id_cafeteria, tipo_servicio, fecha_creacion DESC);
