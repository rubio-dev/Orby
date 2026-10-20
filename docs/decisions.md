# Registro de decisiones

Cada decisión lleva su fecha, qué se decidió y por qué. Las más recientes van arriba.

---

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
