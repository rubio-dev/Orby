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

-- Cafetería inicial
INSERT INTO "public"."cafeteria" ("id_cafeteria", "nombre_cafeteria", "id_estado")
VALUES ('00000000-0000-0000-0000-000000000001', 'Orby Cafetería', 1)
ON CONFLICT ("id_cafeteria") DO NOTHING;

-- Mesas iniciales (1 a 11 según el diseño del PDF)
INSERT INTO "public"."mesa" ("num_mesa", "id_cafeteria", "id_estado")
VALUES
  (1, '00000000-0000-0000-0000-000000000001', 1),
  (2, '00000000-0000-0000-0000-000000000001', 1),
  (3, '00000000-0000-0000-0000-000000000001', 3),
  (4, '00000000-0000-0000-0000-000000000001', 1),
  (5, '00000000-0000-0000-0000-000000000001', 2),
  (6, '00000000-0000-0000-0000-000000000001', 1),
  (7, '00000000-0000-0000-0000-000000000001', 3),
  (8, '00000000-0000-0000-0000-000000000001', 1),
  (9, '00000000-0000-0000-0000-000000000001', 1),
  (10, '00000000-0000-0000-0000-000000000001', 2),
  (11, '00000000-0000-0000-0000-000000000001', 1)
ON CONFLICT ("num_mesa", "id_cafeteria") DO UPDATE SET "id_estado" = EXCLUDED."id_estado";

-- Categorías iniciales
INSERT INTO "public"."categoria" ("id_categoria", "id_cafeteria", "nombre_categoria")
VALUES
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Bebidas'),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Comida'),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Postres')
ON CONFLICT ("id_categoria") DO NOTHING;

-- Usuario Administrador en Supabase Auth y en public.usuario
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'admin@orby.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"rol":"administrador","nombre":"Gael Guzmán","nombre_cafeteria":"Orby Cafetería"}',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."usuario" ("id_usuario", "id_cafeteria", "nombre", "id_rol")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'Gael Guzmán',
  1
) ON CONFLICT ("id_usuario") DO NOTHING;

-- Usuario Mesero
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'mesero@orby.com',
  crypt('mesero123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"rol":"mesero","nombre":"Liz Morales","id_cafeteria":"00000000-0000-0000-0000-000000000001"}',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."usuario" ("id_usuario", "id_cafeteria", "nombre", "id_rol")
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'Liz Morales',
  2
) ON CONFLICT ("id_usuario") DO NOTHING;

-- Usuario Cocina
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'cocina@orby.com',
  crypt('cocina123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"rol":"cocina","nombre":"Emilio Sánchez","id_cafeteria":"00000000-0000-0000-0000-000000000001"}',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."usuario" ("id_usuario", "id_cafeteria", "nombre", "id_rol")
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000001',
  'Emilio Sánchez',
  3
) ON CONFLICT ("id_usuario") DO NOTHING;
