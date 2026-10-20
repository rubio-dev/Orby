-- Semilla de catálogos base para entorno local (ID 1 = registro activo/inicial)

INSERT INTO "public"."estado_cafeteria" ("id_estado", "nombre_estado")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'activa'),
  (2, 'inactiva'),
  (3, 'suspendida')
ON CONFLICT ("id_estado") DO UPDATE SET "nombre_estado" = EXCLUDED."nombre_estado";

SELECT setval(pg_get_serial_sequence('public.estado_cafeteria', 'id_estado'), (SELECT MAX(id_estado) FROM public.estado_cafeteria));

INSERT INTO "public"."role" ("id_rol", "nombre_rol")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'administrador'),
  (2, 'mesero'),
  (3, 'cocina')
ON CONFLICT ("id_rol") DO UPDATE SET "nombre_rol" = EXCLUDED."nombre_rol";

SELECT setval(pg_get_serial_sequence('public.role', 'id_rol'), (SELECT MAX(id_rol) FROM public.role));

INSERT INTO "public"."estado_mesa" ("id_estado", "nombre_estado")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'libre'),
  (2, 'ocupada'),
  (3, 'apartada'),
  (4, 'inactiva')
ON CONFLICT ("id_estado") DO UPDATE SET "nombre_estado" = EXCLUDED."nombre_estado";

SELECT setval(pg_get_serial_sequence('public.estado_mesa', 'id_estado'), (SELECT MAX(id_estado) FROM public.estado_mesa));

INSERT INTO "public"."estado_comanda" ("id_estado", "nombre_estado")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'pendiente'),
  (2, 'en preparación'),
  (3, 'listo'),
  (4, 'entregada'),
  (5, 'cancelada')
ON CONFLICT ("id_estado") DO UPDATE SET "nombre_estado" = EXCLUDED."nombre_estado";

SELECT setval(pg_get_serial_sequence('public.estado_comanda', 'id_estado'), (SELECT MAX(id_estado) FROM public.estado_comanda));

INSERT INTO "public"."estado_detalles_comanda" ("id_estado", "nombre_estado")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'pendiente'),
  (2, 'en preparación'),
  (3, 'listo'),
  (4, 'entregado'),
  (5, 'cancelado')
ON CONFLICT ("id_estado") DO UPDATE SET "nombre_estado" = EXCLUDED."nombre_estado";

SELECT setval(pg_get_serial_sequence('public.estado_detalles_comanda', 'id_estado'), (SELECT MAX(id_estado) FROM public.estado_detalles_comanda));

INSERT INTO "public"."tipo_notificacion" ("id_tipo", "nombre_tipo")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'pedido_listo'),
  (2, 'nueva_comanda'),
  (3, 'producto_listo'),
  (4, 'comanda_cancelada')
ON CONFLICT ("id_tipo") DO UPDATE SET "nombre_tipo" = EXCLUDED."nombre_tipo";

SELECT setval(pg_get_serial_sequence('public.tipo_notificacion', 'id_tipo'), (SELECT MAX(id_tipo) FROM public.tipo_notificacion));

