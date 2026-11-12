# Orby

Aplicación móvil para la cafetería Orby, hecha con **React Native (Expo)** y **Supabase**.

La descripción del proyecto, la arquitectura, las decisiones y los pendientes están en [`docs/`](docs/README.md).

## Equipo y responsabilidades

| Integrante | GitHub | Rol | Rama |
|---|---|---|---|
| Gael Guzmán Alarcón | [@cVerox](https://github.com/cVerox) | Administrador | `Admin` |
| Abigail «Abi» Altamirano González | [@AbigailAltamiranoGonzalez](https://github.com/AbigailAltamiranoGonzalez) | Cocina / barra | `Cocinero` |
| Lizbeth García | [@LizbethGarciac](https://github.com/LizbethGarciac) | Mesero | `Mesero` |
| José Emilio Rubio | [@rubio-dev](https://github.com/rubio-dev) | Despliegue y pruebas completas | `Despliegue` |

> Las cuentas reales viven en Supabase. Gael y Emilio tienen rol de administrador para probar el panel; Lizbeth entra como mesero y Abi como cocina. Los correos y contraseñas no se versionan.

### Administrador — Gael (`Admin`)

- **Inicio:** ventas del día, número de pedidos, variación y productos más vendidos.
- **Menú:** alta de productos con imagen, precio, categoría y descripción; activar o desactivar productos.
- **Personal:** alta y baja de meseros y cocineros dentro de la cafetería.
- **Reportes:** descarga del reporte por periodo.
- **Perfil:** correo y cambio de contraseña.
- **Pruebas unitarias** de las pantallas y la lógica de su módulo.

### Mesero — Lizbeth (`Mesero`)

- **Inicio:** indicadores del turno y accesos rápidos.
- **Mesas:** estado de cada mesa (libre, ocupada o apartada).
- **Tomar pedido:** elegir mesa, navegar el menú por categorías, agregar especificaciones y revisar el total.
- **Envío a cocina:** confirmar la comanda y consultar su resumen.
- **Notificaciones:** avisos de pedidos listos con mesa y tiempo transcurrido.
- **Perfil:** correo y cambio de contraseña.
- **Pruebas unitarias** de las pantallas y la lógica de su módulo.

### Cocina / barra — Abi (`Cocinero`)

- **Inicio:** indicadores operativos y entrada a las comandas.
- **Comandas:** pestañas de «en preparación» y «listos», con mesa, productos, cantidades y tiempo de espera.
- **Detalle de comanda:** marcar productos como en preparación o listos, asignar tiempo estimado, leer especificaciones y cerrar la orden.
- **Historial** de comandas.
- **Perfil:** correo y cambio de contraseña.
- **Pruebas unitarias** de las pantallas y la lógica de su módulo.

### Despliegue y pruebas completas — Emilio (`Despliegue`)

- Verificar que las ramas de los tres roles estén integradas y que `main` compile.
- Configurar Supabase en la nube: vincular el proyecto, aplicar migraciones, desplegar la Edge Function `registrar-empleado` y habilitar Storage.
- Revisar las variables de entorno de producción. En la app solo va la llave pública; la secreta nunca se sube al repo.
- Compilar, firmar y publicar la app con EAS (`build`, `submit` y `update`).
- Correr las **pruebas completas**: unitarias de todos los módulos, integración, pruebas de humo en dispositivos, RLS con los tres roles y comportamiento sin conexión.
- Documentar el proceso de despliegue y los resultados de las pruebas.

### Ramas y flujo de trabajo

| Rama | Uso |
|---|---|
| `main` | Versión estable. No se trabaja directamente en ella. |
| `Admin` | Módulo del administrador. |
| `Mesero` | Módulo del mesero. |
| `Cocinero` | Módulo de cocina / barra. |
| `Despliegue` | Despliegue y pruebas completas (se crea a partir de `main` cuando las ramas de los roles estén listas). |

- Cada rama sale de `main` y se integra de vuelta con un **pull request**.
- Los commits siguen el formato `tipo(alcance): resumen`, por ejemplo `feat(mesero): ...`, `fix(cocina): ...` o `docs: ...`.
- Antes de abrir el PR, la rama debe pasar `pnpm lint`, `pnpm typecheck` y sus pruebas unitarias.
- El PR describe qué cambió, cómo probarlo y qué pantallas o flujos toca.

### Pruebas unitarias

Cada integrante prueba su propio módulo **en su rama** antes de integrarlo.

- **Administrador:** métricas, altas y bajas de personal, catálogo, reportes y permisos.
- **Mesero:** estados de mesa, armado del carrito, totales, especificaciones y notificaciones.
- **Cocina:** cambios de estado por producto, tiempos estimados, cierre de comanda e historial.
- **Despliegue:** además de correr todas las pruebas, valida la app instalada contra Supabase en la nube.

El proyecto todavía no tiene un runner de pruebas configurado. La primera persona que agregue pruebas debe dejar el comando `pnpm test` funcionando y actualizar esta sección. Para Expo, la base recomendada es `jest-expo` con `@testing-library/react-native`.

### Antes de publicar

- [ ] Las ramas de los tres roles están integradas en `main`.
- [ ] `pnpm lint` y `pnpm typecheck` pasan sin errores.
- [ ] Las pruebas unitarias de cada módulo pasan.
- [ ] Las pruebas completas y de humo pasan en un dispositivo real.
- [ ] RLS revisado con los usuarios de administrador, mesero y cocina.
- [ ] No hay `.env`, llaves ni contraseñas en el repositorio.
- [ ] La app apunta a Supabase en la nube y la compilación de EAS está lista.

## Stack

| Pieza | Para qué |
|---|---|
| [Expo](https://docs.expo.dev/) (SDK 58) + Expo Router | La app móvil (Android, iOS y web) |
| [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) | Selección de fotos desde galería y toma de fotos con la cámara |
| [expo-print](https://docs.expo.dev/versions/latest/sdk/print/) | Generación nativa de reportes en PDF a partir de plantillas HTML |
| [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) | Apertura del menú nativo (Share sheet) para previsualizar, compartir e imprimir reportes |
| [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) | Almacenamiento seguro en caché de archivos generados antes de compartirlos |
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
| `pnpm db:start:funcs` | Como el liviano, pero **con `edge-runtime`**: hace falta para probar el alta de empleados, que corre en una Edge Function |
| `pnpm db:start` | Levanta todo, incluido **Studio**, el panel web para ver tablas y datos |
| `pnpm db:status` | Muestra las URLs y llaves locales |
| `pnpm db:stop` | Apaga los contenedores. Los datos se conservan para la próxima vez |
| `pnpm supabase db reset` | Reconstruye la base desde cero: aplica todas las migraciones y vuelve a sembrar. **Córrelo cada vez que alguien cambie `migrations/` o `seed.sql`** |

La primera vez tarda varios minutos porque descarga las imágenes de Docker. Después arranca en segundos.

### Usuarios de prueba

Los crea `supabase/seed.sql` al sembrar la base. Son solo para el Supabase local.

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@orby.com` | `admin123` | Administrador local |

Es el único usuario de la semilla. Desde el panel de administrador puedes dar de alta
meseros y cocina locales. En la nube las cuentas son las reales del equipo y no se
versionan. Si el login falla con un error 500 (*"Database error querying schema"*),
tu base viene de una siembra vieja: corre `pnpm supabase db reset`.

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
2. En `.env` (o `.env.local`, que tiene prioridad), cambiar la URL por `https://<id-del-proyecto>.supabase.co` y poner la *Publishable key* del panel (**Project Settings → API Keys**).
3. Vincular el repo con el proyecto y subir la estructura de la base de datos:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <id-del-proyecto>
   pnpm exec supabase db push
   ```

Las tablas y permisos se escriben como **migraciones**: archivos `.sql` en `supabase/migrations/`, que se crean con `pnpm supabase migration new <nombre>`. Se prueban en local y `db push` las aplica en la nube. Así los dos entornos tienen la misma estructura y todo queda versionado en git.

---

## Imágenes de productos (expo-image-picker y Supabase Storage)

Para la creación y edición de productos en el panel del administrador (`src/app/(admin)/new-product.tsx`), se utiliza [`expo-image-picker`](https://docs.expo.dev/versions/latest/sdk/imagepicker/) para permitir subir fotos desde la galería del dispositivo o capturarlas directamente con la cámara.

### 1. Instalación

Se instala utilizando el comando oficial de Expo para asegurar compatibilidad con la versión del SDK del proyecto (SDK 58):

```bash
npx expo install expo-image-picker
```

> **Importante:** Siempre se debe usar `npx expo install` en lugar de `pnpm add` para dependencias de Expo, ya que resuelve automáticamente la versión homologada y compatible con el SDK instalado.

### 2. Configuración de permisos (`app.json`)

Para que la aplicación declare los permisos necesarios en Android e iOS (tanto en desarrollo con Expo Go como en compilaciones para producción con EAS Build / Continuous Native Generation), el plugin está configurado en `app.json`:

```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    { ... }
  ],
  [
    "expo-image-picker",
    {
      "photosPermission": "Orby necesita acceso a tus fotos para seleccionar imágenes de productos.",
      "cameraPermission": "Orby necesita acceso a tu cámara para tomar fotos de productos."
    }
  ]
]
```

### 3. Uso en la aplicación

En [`src/app/(admin)/new-product.tsx`](src/app/(admin)/new-product.tsx):
- **Galería:** Solicita permiso con `ImagePicker.requestMediaLibraryPermissionsAsync()` y abre el selector con `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true })`.
- **Cámara:** Solicita permiso con `ImagePicker.requestCameraPermissionsAsync()` y abre la cámara nativa con `ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true })`.

### 4. Almacenamiento y persistencia

- **Supabase Storage:** Al guardar o editar un producto, [`src/context/catalog-context.tsx`](src/context/catalog-context.tsx) sube la imagen al bucket público `productos` en la ruta `{id_cafeteria}/{id_producto}-{timestamp}.jpg` y guarda la URL pública generada en `producto.imagen_url`.
- **Soporte offline y Docker local:** Si no hay conexión o si se está trabajando en local con `pnpm db:start:lite` (modo liviano), la imagen se preserva de manera segura (con codificación base64 en `imagen_url` o en cola offline `@orby_cola_catalogo_${id_cafeteria}`) y se sincroniza en cuanto haya conexión disponible con el servidor.

---

## Reportes en PDF del Administrador (expo-print, expo-sharing y expo-file-system)

Para la generación de reportes ejecutivos en el panel de inicio del Administrador (`src/app/(admin)/index.tsx`), se emplean los módulos oficiales de Expo para móviles sin requerir visor web ni herramientas externas pesadas:

### 1. Instalación

Se instalan mediante el comando oficial de Expo para asegurar compatibilidad con el SDK 58:

```bash
npx expo install expo-print expo-sharing expo-file-system
```

### 2. Configuración en `app.json`

Expo agrega automáticamente el plugin en `app.json`:

```json
"plugins": [
  "expo-router",
  ...,
  "expo-sharing"
]
```

### 3. Funcionamiento

- **[`expo-print`](https://docs.expo.dev/versions/latest/sdk/print/):** Transforma una plantilla HTML profesional con membrete dinámico de la cafetería activa autenticada en sesión (consultada en tiempo real desde la tabla `cafeteria`), métricas de caja (ventas, pedidos, ticket promedio) y desglose de productos en un archivo `.pdf` físico en memoria mediante `Print.printToFileAsync({ html })`.
- **[`expo-file-system`](https://docs.expo.dev/versions/latest/sdk/filesystem/):** Copia el archivo temporal a una ruta accesible (`FileSystem.cacheDirectory`) asegurando que el proveedor de archivos de Android (`FileProvider`) tenga permisos completos de lectura.
- **[`expo-sharing`](https://docs.expo.dev/versions/latest/sdk/sharing/):** Despliega la hoja nativa de compartir del sistema operativo móvil (`Sharing.shareAsync(rutaSegura, { mimeType: 'application/pdf', UTI: '.pdf' })`), permitiendo al usuario:
  - Previsualizar el PDF en el visor nativo de Android / iOS.
  - Compartir el corte por WhatsApp o correo.
  - Guardarlo en Google Drive, Descargas o Archivos.
  - Imprimirlo directamente en impresoras inalámbricas térmicas o de oficina.

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
  seed.sql        Catálogos, mesas, categorías, productos y administrador local
  functions/
    registrar-empleado/  Edge Function para alta de meseros y cocineros
assets/           Íconos e imágenes
```

## Seguridad (el repo es público)

- El `.env` **no se sube** a git. Solo se versiona `.env.example`, sin valores reales.
- En la app solo va la **llave pública** (*publishable* o *anon*). La llave secreta (*secret* o *service_role*) nunca va en el código ni en variables `EXPO_PUBLIC_`.
- Toda tabla expuesta debe tener **RLS activado**. La llave pública solo es segura si las reglas de RLS están bien hechas.
