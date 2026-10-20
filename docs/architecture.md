# Arquitectura

## Capas

### Presentación

Vistas independientes que se asignan según el rol detectado en el login. Están pensadas como paneles reactivos para uso táctil en teléfono o tableta.

### Lógica de negocio

Tres módulos:

1. **Autenticación centralizada** con control de acceso basado en roles (RBAC), gestionado desde el backend.
2. **Gestión de mesas** y ordenamiento cronológico de comandas.
3. **Máquina de estados del pedido:** `pendiente → en preparación → listo`.

### Servicios de información

- **Sincronización instantánea de comandas** entre meseros y cocina. Es lo que elimina el ir y venir a la cocina.
- **Almacenamiento centralizado del historial de ventas** para generar reportes periódicos.

## Stack

| Según la descripción | Elección concreta | Estado |
|---|---|---|
| Frontend: React Native | **Expo SDK 58** con **Expo Router** (rutas por archivo en `src/app/`) | Decidido |
| Backend como servicio sobre PostgreSQL, vía API, con auth, base de datos y tiempo real | **Supabase** | Decidido |
| Node.js con pnpm | Node 20.19+ y pnpm 11 | Decidido |
| Librerías de componentes (Tailwind, ShadCN, etc.) | Por definir: shadcn/ui no funciona en React Native (ver [open-questions](open-questions.md)) | Pendiente |

## Cómo se cubre cada pieza con Supabase

Es una propuesta: el diseño de la base de datos lo define el compañero a cargo.

| Necesidad | Pieza de Supabase |
|---|---|
| Login con correo y contraseña | **Auth** |
| Saber el rol del usuario y redirigirlo | Rol guardado en el perfil del empleado y leído después del login |
| RBAC "desde el backend" | **RLS (Row Level Security)**: reglas en Postgres que limitan qué filas lee o modifica cada rol |
| Comandas al instante entre mesero y cocina | **Realtime**: la app se suscribe a los cambios de las tablas de órdenes |
| Aviso de "pedido listo" al mesero | **Realtime** dentro de la app. Las notificaciones push quedan pendientes (ver [open-questions](open-questions.md)) |
| Leer y escribir datos sin programar endpoints | **API REST automática (PostgREST)** a través de `supabase-js` |
| Imagen de productos | **Storage** |
| Crear cuentas de empleados desde el admin | **Edge Function**: requiere la llave secreta, que no puede ir en la app |
| Reportes e indicadores | Consultas o vistas en Postgres sobre el historial de órdenes |

## Entornos

| Entorno | Para qué | Cómo |
|---|---|---|
| Local | Desarrollo. **Es temporal**, mientras se publica en la nube | Supabase CLI en Docker (`pnpm db:start:lite` o `pnpm db:start`) |
| Nube | Pruebas reales y producción | Proyecto en supabase.com. Las migraciones se suben con `supabase db push` |

En los dos entornos, la app solo usa la **llave pública** (*publishable*). La configuración vive en `.env` (ver `.env.example`).

### Cliente de Supabase

- El cliente se pide con `obtener_supabase()` y se crea **la primera vez que se usa**, no al importar el archivo.
- Si falta el `.env`, solo falla la parte que intenta usar Supabase, con un mensaje que explica qué hacer. El resto de la app (por ejemplo, el laboratorio) sigue funcionando.
- **Regla general:** importar un módulo nunca debe tumbar la app por falta de configuración. Antes, `createClient` se ejecutaba al importar y, sin `.env`, la app entera mostraba `supabaseUrl is required`.

## Código actual

```
src/app/              Pantallas (Expo Router: cada archivo es una ruta)
src/app/lab/          Laboratorio visual (solo en desarrollo)
src/lab/              Secciones del laboratorio
src/lib/env.ts        Variables de entorno (URL y llave pública) y si están completas
src/lib/supabase.ts   Cliente de Supabase compartido: obtener_supabase()
src/theme/            Tokens, temas (Orby y Miami) y proveedor de tema
supabase/config.toml  Configuración del Supabase local
```
