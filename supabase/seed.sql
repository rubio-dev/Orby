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
  (1, 'abierta'),
  (2, 'cerrada'),
  (3, 'cancelada')
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

-- Normalizar las columnas de token de los usuarios demo
-- GoTrue (auth) las lee como texto, no como nulos: si quedan en NULL, el login falla con
-- "Database error querying schema" (HTTP 500) aunque el correo y la contraseña sean correctos.
UPDATE auth.users SET
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
WHERE email IN ('admin@orby.com', 'mesero@orby.com', 'cocina@orby.com');

-- Identidad de correo por usuario: es lo que auth consulta al iniciar sesión
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.email IN ('admin@orby.com', 'mesero@orby.com', 'cocina@orby.com')
  AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');

-- Poner al administrador en la cafetería demo
-- El trigger handle_new_user, al ver rol = 'administrador' en los metadatos, CREA una cafetería
-- nueva con UUID aleatorio. Por eso el INSERT explícito de arriba (con la cafetería 0001) choca
-- con la fila que ya creó el trigger y se descarta por ON CONFLICT DO NOTHING: el administrador
-- acababa en una cafetería vacía, sin su equipo, sin mesas y sin menú.
UPDATE public.usuario u
   SET id_cafeteria = '00000000-0000-0000-0000-000000000001'
 WHERE u.id_usuario = (SELECT id FROM auth.users WHERE email = 'admin@orby.com')
   AND u.id_cafeteria <> '00000000-0000-0000-0000-000000000001';

-- Borrar la cafetería huérfana que creó el trigger
DELETE FROM public.cafeteria c
 WHERE c.id_cafeteria <> '00000000-0000-0000-0000-000000000001'
   AND NOT EXISTS (SELECT 1 FROM public.usuario u WHERE u.id_cafeteria = c.id_cafeteria);
