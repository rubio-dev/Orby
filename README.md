# Orby

Aplicación móvil para la cafetería Orby, hecha con **React Native (Expo)** y **Supabase**.

La descripción del proyecto, la arquitectura, las decisiones y los pendientes están en [`docs/`](docs/README.md).

## Stack

| Pieza | Para qué |
|---|---|
| [Expo](https://docs.expo.dev/) (SDK 58) + Expo Router | La app móvil (Android, iOS y web) |
| [Supabase](https://supabase.com/docs) | Base de datos Postgres, login, API y tiempo real. Es nuestro backend: no hay un servidor propio |
| Docker | Corre Supabase en local mientras desarrollamos |
| pnpm | Gestor de paquetes del equipo (no usar npm ni yarn) |

## Requisitos

- [Node.js](https://nodejs.org/) 20.19 o superior
- [pnpm](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), abierto antes de levantar Supabase
- La app **Expo Go** en tu teléfono ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

**No hace falta instalar Android Studio ni Xcode.** Más abajo se explica por qué.

## Arranque rápido

```bash
pnpm install                # 1. Instalar dependencias
pnpm db:start:lite          # 2. Levantar Supabase en Docker (versión liviana)
cp .env.example .env        # 3. Crear el archivo de entorno
pnpm db:status              # 4. Copiar la "Publishable key" al .env
pnpm start                  # 5. Levantar la app y escanear el QR con Expo Go
```

Si todo está bien, la pantalla de inicio muestra **"Conectado a Supabase"**. En desarrollo también aparece **"Abrir laboratorio"**, que lleva a una pantalla de pruebas con los colores, contrastes y tipografía de los temas Orby y Miami (ver [docs/design-system.md](docs/design-system.md#laboratorio-visual)).

Si Metro muestra `Unable to resolve module ./node_modules/expo-router/entry` u otro error raro después de instalar o quitar paquetes, limpia su caché con `pnpm start --clear`.

---

## Supabase en local (temporal)

Supabase es open source. Todo lo que corre en supabase.com también se puede correr en tu PC con Docker. Usamos esa versión local **mientras publicamos el proyecto en la nube**: podemos probar sin costo y sin miedo a romper datos reales.

El CLI de Supabase viene instalado como dependencia del proyecto. No hay que escribir ningún `docker-compose`, porque el CLI descarga y levanta los contenedores por su cuenta.

### Comandos

| Comando | Qué hace |
|---|---|
| `pnpm db:start:lite` | Levanta solo lo esencial: Postgres, login, API y tiempo real. **Recomendado si tu máquina tiene menos de 8 GB de RAM** |
| `pnpm db:start` | Levanta todo, incluido **Studio**, el panel web para ver tablas y datos |
| `pnpm db:status` | Muestra las URLs y llaves locales |
| `pnpm db:stop` | Apaga los contenedores. Los datos se conservan para la próxima vez |

La primera vez tarda varios minutos porque descarga las imágenes de Docker. Después arranca en segundos.

### Direcciones locales

| Servicio | URL |
|---|---|
| API (la que usa la app) | http://127.0.0.1:54321 |
| Studio (solo con `pnpm db:start`) | http://127.0.0.1:54323 |
| Postgres directo (para clientes SQL como DBeaver) | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Estas contraseñas y llaves locales son las de ejemplo de Supabase y solo funcionan en tu PC. **Nunca las uses en la nube.**

### ¿Por qué no basta con un Postgres solo?

La app no se conecta directamente a Postgres: necesita algo en medio que reciba las peticiones y revise permisos. Supabase ya trae esas piezas:

- **Auth**: login de los usuarios.
- **API (PostgREST)**: lectura y escritura de las tablas sin programar endpoints.
- **RLS**: reglas en la base de datos que deciden qué puede ver o cambiar cada usuario.
- **Realtime**: avisos al instante, por ejemplo cuando entra un pedido nuevo.

---

## Probar en el teléfono

### Con Expo Go (lo normal)

1. El teléfono y la PC tienen que estar **en la misma red WiFi**.
2. Corre `pnpm start` y escanea el QR: en Android desde Expo Go y en iPhone desde la cámara.
3. Al guardar un archivo, la app se recarga sola en el teléfono.

### Conectar el teléfono al Supabase local

En el teléfono, `127.0.0.1` es **el propio teléfono**, no tu PC. Por eso en el `.env` hay que poner la IP de tu PC en la red:

1. Busca tu IP con `ipconfig` (en macOS/Linux, `ifconfig`). Es la **Dirección IPv4** del adaptador WiFi, algo como `192.168.1.50`.
2. En `.env`, pon:
   ```
   EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.50:54321
   ```
3. Reinicia Expo con `pnpm start --clear` para que tome el cambio.

Si el teléfono sigue sin conectar:

- **Firewall de Windows:** la primera vez Windows pregunta si permite a Docker y Node en redes privadas. Hay que aceptar. Si no apareció la pregunta, revisa *Firewall de Windows → Permitir una aplicación*.
- **Red pública o de invitados:** muchas redes de escuela, de oficina o de cafetería aíslan a los dispositivos entre sí. Una alternativa es usar el hotspot del teléfono.
- `pnpm start --tunnel` sirve cuando el teléfono no ve a Expo, pero **no** soluciona la conexión a Supabase local. Para eso hay que estar en la misma red, o usar Supabase en la nube.

### ¿Android Studio o Xcode?

| Herramienta | ¿La necesitamos? |
|---|---|
| **Expo Go** | Sí. Alcanza para casi todo el desarrollo |
| **Android Studio** | No. Solo serviría para el emulador en la PC, que consume mucha RAM |
| **Xcode** | No. Solo existe para macOS. En Windows, iOS se prueba con Expo Go en un iPhone físico |
| **EAS Build** | Más adelante. Compila la app en la nube de Expo y genera un instalable (APK o IPA), sin SDK local. Hará falta cuando agreguemos librerías nativas que Expo Go no trae |

---

## Pasar a Supabase en la nube

Cuando el proyecto esté listo para publicarse:

1. Crear el proyecto en [supabase.com](https://supabase.com/dashboard).
2. En `.env`, cambiar la URL por `https://<id-del-proyecto>.supabase.co` y poner la *Publishable key* del panel (**Project Settings → API Keys**).
3. Vincular el repo con el proyecto y subir la estructura de la base de datos:
   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <id-del-proyecto>
   pnpm supabase db push
   ```

Las tablas y permisos se escriben como **migraciones**: archivos `.sql` en `supabase/migrations/`, que se crean con `pnpm supabase migration new <nombre>`. Se prueban en local y `db push` las aplica en la nube. Así los dos entornos tienen la misma estructura y todo queda versionado en git.

---

## Estructura

```
src/
  app/            Pantallas (cada archivo es una ruta de Expo Router)
    (admin)/      Pantallas del administrador
    (cocina)/     Pantallas de cocina
    (mesero)/     Pantallas del mesero
    lab/          Laboratorio visual (solo en desarrollo)
  components/     Componentes reutilizables (botones, inputs, cabeceras y navegación por rol)
  context/        Estado global: sesión, catálogo y comandas (AsyncStorage + Supabase)
  lab/            Secciones del laboratorio
  lib/
    env.ts        Variables de entorno
    supabase.ts   Cliente de Supabase compartido (obtener_supabase)
  theme/          Tokens, temas Orby y Miami, proveedor de tema y colores de marca
  types/          Tipos de usuarios, roles, productos, mesas y comandas
supabase/
  config.toml     Configuración del Supabase local
  migrations/     Cambios de la base de datos en SQL
  schemas/        Esquemas declarativos de tablas, funciones y extensiones
  seed.sql        Catálogos, mesas, categorías y usuarios demo para local
  functions/
    registrar-empleado/  Edge Function para alta de meseros y cocineros
assets/           Íconos e imágenes
```

## Seguridad (el repo es público)

- El `.env` **no se sube** a git. Solo se versiona `.env.example`, sin valores reales.
- En la app solo va la **llave pública** (*publishable* o *anon*). La llave secreta (*secret* o *service_role*) nunca va en el código ni en variables `EXPO_PUBLIC_`.
- Toda tabla expuesta debe tener **RLS activado**. La llave pública solo es segura si las reglas de RLS están bien hechas.
