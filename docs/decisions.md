# Registro de decisiones

Cada decisión lleva su fecha, qué se decidió y por qué. Las más recientes van arriba.

---

## 2026-10-20: La comanda es la cuenta de una visita: abierta o cerrada

- **Decisión:** la comanda representa la cuenta de una mesa mientras los clientes están en el local. Se abre al tomar el primer pedido y se le agregan productos mientras siga abierta. Al cerrarla, si los clientes piden algo más, va una comanda nueva.
- **Estados de la comanda:** `abierta` (1), `cerrada` (2) y `cancelada` (3). Se quitaron `pendiente`, `en preparación`, `listo` y `entregada`, que eran los estados del producto copiados un nivel más arriba.
- **Estados del producto:** siguen igual en `estado_detalles_comanda` (`pendiente`, `en preparación`, `listo`, `entregado`, `cancelado`). La preparación y la entrega son por producto: el café sale a los 3 minutos y el sándwich a los 10, y cada uno se lleva a la mesa cuando está.
- **Motivo:** con la cuenta abierta, "listo" no es un estado estable de la comanda. Es cierto cinco minutos, hasta que piden un postre. Si hace falta saber si no hay nada pendiente, se calcula mirando los detalles en vez de guardarlo.
- **Hora por producto:** `detalle_comanda` gana `fecha_creacion`. La espera se mide desde que se pide cada producto, no desde que se abrió la cuenta: un postre pedido a las 14:30 no lleva esperando desde la 13:00. También permite a la cocina separar lo que acaba de entrar de lo que ya se sirvió.
- **Una cuenta por mesa:** un índice único parcial sobre `comanda (id_mesa) WHERE id_estado = 1` impide dos cuentas abiertas en la misma mesa, para que los productos no queden partidos en dos tickets.
- **Migración:** `supabase/migrations/20261022000000_comanda_abierta_o_cerrada.sql`.
- **Verificación:** las tres migraciones y `seed.sql` se aplican sin errores sobre un Postgres limpio; se probó que la segunda cuenta abierta en la misma mesa se rechaza, que al cerrar la primera la mesa admite otra, y que el detalle nuevo trae su `fecha_creacion`.
- **Pendiente en la app:** `src/types/index.ts` (`EstadoComanda`) y los contextos de `src/context/` siguen con el vocabulario anterior (`'en preparación'`, `'listo'`) y con `id_estado` 2 y 3 escritos a mano. Se alinean cuando se conecten los contextos a Supabase; ver [open-questions](open-questions.md#técnico).

## 2026-10-20: Migración de colores fijos a tokens del tema

- **Decisión:** todos los colores de `src/app/` y `src/components/` salen de `useTema()` (`colores.*`), salvo el logotipo (ver la entrada siguiente). Se eliminaron los hexadecimales y los `rgba(...)` de pantallas y componentes; los overlays usan `colores.overlay`.
- **Tokens nuevos:** `on_danger`, `on_warning`, `success` y `shadow`, definidos en las 4 paletas de `src/theme/themes.ts`.
  - `on_danger` / `on_warning`: en modo oscuro `danger` y `warning` son claros (`#FF8A80` y `#E8B85C`), así que el texto encima tiene que ser oscuro. El blanco no alcanzaba el contraste.
  - `success`: no existía un token para la variación positiva de las métricas; antes era el verde fijo `#10B981`.
  - `shadow`: `shadowColor` era `#000`; la opacidad sigue definiéndose en cada estilo.
- **Verificación:** los pares nuevos están en la sección de contrastes de `/lab`; `pnpm typecheck` y `pnpm lint` pasan. `grep` no encuentra hex ni `rgba` en `src/app/` ni en `src/components/`.
- **Commits:** `758e604` (componentes), `6c978a7` (mesero), `ad2c787` (cocina), `a37b371` (admin), `8911b79` (bienvenida y login); la documentación de los tokens quedó en `101c747`.
- **Motivo:** con colores fijos, el tema Miami y el modo oscuro no funcionaban en las pantallas nuevas: los colores no seguían el tema activo.

## 2026-10-20: El logotipo usa colores de marca, no tokens de tema

- **Decisión:** los colores de la ilustración de `OrbyLogo` viven en `coloresMarca` (`src/theme/tokens.ts`), no en las 4 paletas. El texto "Orby" usa `colores.text`.
- **Motivo:** la identidad del logo no cambia con el tema ni con el modo. Meter sus colores en las paletas obligaría a duplicarlos en Orby/Miami y claro/oscuro sin que el logo cambie.
- **Consecuencia:** `src/components/OrbyLogo.tsx` es la única pieza de `src/components/` que no usa solo tokens semánticos; se documenta como excepción.

## 2026-10-20: Contextos de React con AsyncStorage y Supabase en segundo plano

- **Decisión:** el estado global vive en tres contextos: `AuthProvider`, `CatalogProvider` y `OrdersProvider` (`src/context/`), montados en `src/app/_layout.tsx`.
- **Fuente de datos:** AsyncStorage es la fuente inmediata. Claves: `@orby_usuario_sesion`, `@orby_personal_registrado`, `@orby_productos`, `@orby_mesas`, `@orby_comandas` y `@orby_notificaciones`.
- **Escrituras:** cada acción actualiza el estado y AsyncStorage primero; si `supabase_configurado`, después intenta escribir en Supabase dentro de `try/catch` y solo registra `console.warn` si falla. La interfaz no espera a la red.
- **Auth:** intenta `signInWithPassword` contra Supabase y, si falla o no está configurado, cae a usuarios demo y al personal registrado en local. `registrarPersonal` invoca la Edge Function `registrar-empleado`; `registrarAdministrador` usa `auth.signUp`.
- **Catálogo:** lee productos de Supabase solo si no hay caché local; los cambios de estado y las altas se guardan en local y se intentan sincronizar.
- **Comandas:** mesas, comandas y notificaciones son locales; `enviarComandaACocina` inserta la cabecera en Supabase, pero no el detalle.
- **Motivo:** no consta en el commit. Se deduce que se buscó que la app funcione sin Supabase (modo demo) y que la interfaz no se bloquee si la red falla; la razón explícita no está documentada.
- **Consecuencia:** los IDs locales (`mesa-4`, `usr-2`) no son UUID y el detalle no se escribe; ver [open-questions](open-questions.md#técnico).

## 2026-10-20: Componentes propios con StyleSheet

- **Decisión:** la interfaz se construye con componentes propios en `src/components/`, con `StyleSheet.create` y los tokens de `@/theme`. No se usan NativeWind ni React Native Reusables.
- **Verificación:** `package.json` no tiene `nativewind` ni `react-native-reusables`; los 10 componentes de `src/components/` usan `StyleSheet`.
- **Motivo:** el commit no explica por qué se descartaron NativeWind y Reusables. Se deduce que se evitó una dependencia extra y se mantuvo el control de los dos temas, pero es una deducción; el motivo explícito queda como pregunta abierta.
- **Consecuencia:** la pregunta "Librería de componentes" de `open-questions.md` se cierra.

## 2026-10-20: Pantallas y flujos de los tres roles

- **Decisión:** se implementan las pantallas de administrador, mesero y cocina en las rutas `(admin)`, `(mesero)` y `(cocina)`, con datos de demostración y navegación por rol.
- **Qué incluye:** inicio, menú, personal, perfil y alta de producto (admin); inicio, mesas, nuevo pedido, resumen, menú, notificaciones y perfil (mesero); inicio, comandas, detalle, historial y perfil (cocina).
- **Flujos:** el historial de cocina existe; "Favoritos" filtra Latte y Frappé; "Categorías" muestra Bebidas/Comida/Postres y no permite crearlas; cocina marca cada producto y cierra la comanda a mano.
- **Motivo:** es el primer diseño funcional de Orby; el commit no documenta por qué se eligieron esos flujos ni si son definitivos. Las dudas de producto que siguen abiertas están en [open-questions](open-questions.md).

## 2026-10-20: Autenticación, contraseñas y alta de personal

- **Decisión:** un solo login para los tres roles; la contraseña mínima es 6 en `src/app/login.tsx` y en `supabase/config.toml`; "¿Olvidaste tu contraseña?" muestra un aviso para contactar al administrador (no hay recuperación por correo); el administrador da de alta meseros y cocineros desde Personal.
- **Alta de personal:** `registrarPersonal` invoca la Edge Function `registrar-empleado`, que valida el JWT, comprueba que el llamante sea administrador (`id_rol = 1`), permite solo roles `mesero` y `cocina` y crea el usuario con `auth.admin.createUser`; el trigger `handle_new_user` crea el perfil.
- **Registro de administrador:** `login.tsx` también ofrece "Registrar Admin" y `auth-context.tsx` llama `supabase.auth.signUp` con `rol: 'administrador'` y `nombre_cafeteria`; el trigger crea la cafetería. Esto contradice la suposición anterior de que no había registro público; queda abierto en [open-questions](open-questions.md#flujo-y-reglas-de-negocio).
- **Modo demo:** el login tiene accesos rápidos y `iniciarSesion` acepta usuarios demo/personal local sin comprobar contraseña.
- **Motivo:** el commit no documenta estas decisiones; se registra el comportamiento actual.

## 2026-10-20: Políticas RLS iniciales permisivas

- **Decisión:** `supabase/migrations/20261021000000_politicas_rls.sql` crea políticas para las tablas, pero todas usan `USING (true)` y/o `WITH CHECK (true)`: catálogos con `SELECT` libre; cafetería y usuario con inserción, lectura y actualización (usuario también borrado); mesas, categorías, productos, comandas, detalles y notificaciones con `FOR ALL`.
- **Motivo:** no consta en el commit. Parece una base para que la app funcione mientras se define el RLS por rol, pero no se puede afirmar; queda como pregunta abierta de seguridad.
- **Consecuencia:** con la llave pública cualquiera puede leer todas las tablas y escribir en cafetería, usuario, mesa, categoría, producto, comanda, detalle_comanda y notificación. No usar en producción hasta reemplazarlas.

## 2026-10-20: Esquema inicial de la base de datos y semillas

- **Decisión:** se agrega `supabase/migrations/20261020000000_esquema_inicial.sql` con 14 tablas: catálogos (`estado_cafeteria`, `estado_comanda`, `estado_detalles_comanda`, `estado_mesa`, `tipo_notificacion`, `role`) y entidades (`cafeteria`, `categoria`, `mesa`, `producto`, `usuario`, `comanda`, `detalle_comanda`, `notificacion`).
- **Detalles:** las entidades usan PK UUID (`gen_random_uuid()`; `usuario` referencia `auth.users`), los catálogos usan enteros `identity`, los precios son `numeric(10,2)`, las FKs usan `ON DELETE CASCADE`/`RESTRICT`, todas las tablas tienen RLS activado y el trigger `on_auth_user_created` ejecuta `handle_new_user()` para crear la cafetería del administrador o vincular al empleado con su cafetería.
- **Semillas:** `supabase/seed.sql` carga catálogos con IDs fijos (roles 1/2/3, estados y tipos de notificación), la cafetería `Orby Cafetería`, 11 mesas, 3 categorías y 3 usuarios demo (`admin@orby.com`, `mesero@orby.com`, `cocina@orby.com`).
- **Esquemas declarativos:** `supabase/schemas/` guarda la exportación declarativa de tablas, funciones y extensiones; `ad6fe3e` limpió un comentario con el project-ref de la migración inicial.
- **Motivo:** no está documentado en el commit. El esquema cubre las entidades y estados que usan las pantallas; las razones de las decisiones concretas (UUID, `numeric`, trigger) no se deducen del historial.
- **Consecuencia:** las políticas RLS de la migración siguiente son permisivas; ver la entrada de RLS y [open-questions](open-questions.md#técnico).

## 2026-10-19: Primer push a GitHub

- **Repositorio:** [rubio-dev/Orby](https://github.com/rubio-dev/Orby), público, rama `main`.
- **Autor de los commits:** se usa el correo *noreply* de GitHub (`133939024+rubio-dev@users.noreply.github.com`), configurado solo para este repo. Así el correo personal no queda expuesto en el historial público.
- **Licencia:** se quitó el `LICENSE` de la plantilla, que estaba a nombre de Expo. Por ahora el repo no tiene licencia (todos los derechos reservados); está pendiente en [open-questions](open-questions.md).
- **Mockup:** se versiona en `docs/design/mockups.html` (antes `Mockups app de comandas.html` en la raíz).
- **`AGENTS.md` y `.claude/`:** se quedan. Son instrucciones de Expo para asistentes de IA y no contienen datos sensibles.
- **Seguridad en GitHub:** el repo ya tiene activados *Secret scanning* y *Push protection*.

## 2026-10-19: Plus Jakarta Sans para el texto

- **Decisión:** el texto y la interfaz usan **Plus Jakarta Sans** (pesos 400, 500, 600 y 700), junto con Josefin Sans Light en los títulos. El texto de 15 px va en Regular.
- **Motivo:** el equipo la eligió en `/lab/fonts` comparándola junto a Josefin. Regular en vez de Light porque el texto de una comanda se lee rápido y a veces de lejos.
- **Limpieza:** se desinstalaron Inter, Manrope, DM Sans y Outfit, y se borró la pantalla temporal `/lab/fonts`. La app solo trae las 5 fuentes que usa.

## 2026-10-19: Josefin Sans Light para títulos

- **Decisión:** la bienvenida (`display`), los títulos de pantalla (`titulo`) y las cifras grandes (`cifra`) usan **Josefin Sans Light**, en los dos temas. El resto del texto sigue en Inter mientras se elige su fuente.
- **Motivo:** al equipo le gustan las fuentes delgadas, y Josefin tiene líneas finas de estilo art déco que encajan con Orby y con Miami.
- **Regla:** la fuente delgada solo se usa en 20 px o más. Debajo de eso se pierde en modo oscuro y leída a distancia, por ejemplo en la cocina.
- **Ajuste:** los títulos subieron de tamaño (bienvenida 30 → 34 px, título 20 → 22 px, cifra 24 → 28 px) porque las minúsculas de Josefin son más bajas que las de Inter. Como ahora son delgados, los títulos se distinguen por tamaño y fuente, no por grosor.
- **Descartadas:** Monoton, Righteous, Pacifico y Bungee (desinstaladas).

## 2026-10-19: Modo claro y oscuro para cada tema

- **Decisión:** la apariencia tiene dos ejes, **tema** (Orby o Miami) y **modo** (claro u oscuro). En total son 4 paletas. El modo sigue al sistema por defecto, pero se puede forzar.
- **Motivo:** petición del equipo. Separar tema y modo evita mezclar identidad visual con preferencia de brillo, y deja agregar temas nuevos sin duplicar la lógica.
- **Detalle:** el color principal cambia de tono según el modo para mantener el contraste. Por ejemplo, el rosa de Miami de día es más oscuro que el de Miami de noche.

## 2026-10-19: Construir por pasos, empezando por los tokens y un laboratorio visual

- **Decisión:** el sistema de diseño se construye de a poco. Primero los tokens y los dos temas (`src/theme/`), luego un **laboratorio visual** dentro de la app (ruta `/lab`, solo en desarrollo), y después los componentes de uno en uno, cada uno revisado en el laboratorio antes de usarse en pantallas.
- **Motivo:** cada pieza se valida en los dos temas antes de que algo dependa de ella. Los tokens no dependen de la librería de componentes que se elija.
- **Descartado:** Storybook para React Native. Necesita configuración extra de Metro y consume más RAM; una ruta de la app basta por ahora.
- **Detalle:** las fuentes se importan peso por peso (por ejemplo `@expo-google-fonts/plus-jakarta-sans/400Regular`). Importar un paquete completo metía 18 archivos de fuente en la app.

## 2026-10-19: El mockup es el diseño principal y habrá un segundo tema, "Miami"

- **Decisión:** `docs/design/mockups.html` es el diseño principal (tema **Orby**). Se agrega un segundo tema, **Miami**, con colores inspirados en Vice City (GTA VI). Ver [design-system.md](design-system.md).
- **Motivo:** petición del equipo para subirse al tren de GTA VI.
- **Condición:** la paleta solo se *inspira* en GTA VI. No se usan logotipos, tipografías, nombres ni imágenes de Rockstar.
- **Consecuencia:** los componentes usan tokens semánticos en lugar de colores fijos, para poder cambiar de tema en tiempo de ejecución.

## 2026-10-19: Reglas de credenciales para un repo público

- **Decisión:** el repo es público, así que las reglas de [security.md](security.md) son obligatorias. El `.gitignore` ahora ignora cualquier `.env*` (excepto `.env.example`) y las credenciales de firma y publicación.
- **Motivo:** cualquier cosa que se suba queda expuesta para siempre en el historial. Una llave filtrada hay que rotarla aunque se borre el commit.

## 2026-10-19: Se prueba en teléfonos sin Android Studio ni Xcode

- **Decisión:** las pruebas en teléfonos se hacen con **Expo Go**. Cuando haga falta un instalable o una librería nativa que Expo Go no trae, se usa **EAS Build**, que compila en la nube.
- **Motivo:** Xcode solo existe en macOS. El emulador de Android consume mucha RAM y parte del equipo tiene menos de 8 GB.

## 2026-10-19: Supabase en local con Docker, de forma temporal

- **Decisión:** mientras se publica el proyecto en supabase.com, Supabase corre en local con el CLI (`pnpm db:start:lite`). Por eso `config.toml` tiene apagados los servicios de logs y analítica.
- **Motivo:** permite desarrollar y probar sin costo y sin tocar datos reales. Además, las migraciones mantienen la misma estructura en local y en la nube.

## 2026-10-19: Supabase es el backend; no hay servidor propio

- **Decisión:** no se programa un backend aparte (Express u otro). Supabase cubre login, API, permisos (RLS) y tiempo real.
- **Motivo:** la app no puede conectarse directo a Postgres. Habría que poner las credenciales de la base de datos dentro de la app, y React Native no tiene un driver adecuado. Supabase ya resuelve esa capa intermedia.
- **Descartado:** un contenedor solo con Postgres más un backend propio. Es más trabajo y duplica lo que Supabase ya ofrece.

## 2026-10-19: Se reinicia el repositorio desde cero

- **Decisión:** se descartó un proyecto anterior que estaba en stage y nunca se commiteó. Se generó una base nueva con `create-expo-app`.
- **Motivo:** empezar con una base limpia.

## 2026-10-17: Stack y convenciones del equipo

- **Expo** (no React Native "pelado"), con Expo Router.
- **pnpm** es el gestor de paquetes. No se usan npm ni yarn.
- **Idioma:** carpetas y nombres de archivo en inglés; comentarios, documentación y textos en español.
- **Base de datos:** el esquema lo diseña y mantiene un compañero del equipo.
- **Repositorio público:** nunca se suben llaves ni el `.env`. En la app solo va la llave pública, y toda tabla expuesta lleva RLS.
- **Commits:** van firmados únicamente por los integrantes del equipo.
