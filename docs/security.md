# Seguridad y credenciales

> **El repositorio es público en GitHub.** Cualquiera puede leer todo lo que se suba, incluido el historial de commits. Una llave que se sube por error se considera comprometida aunque se borre después.

## Qué puede ir en el código y qué no

| Dato | ¿Va en el repo? | Dónde vive |
|---|---|---|
| URL del proyecto de Supabase | En `.env`, no en el código | `.env` (local) o variables de EAS |
| Llave **pública** (*publishable* o *anon*) | En `.env`, no en el código | `.env`. Es pública por diseño, pero solo es segura con RLS |
| Llave **secreta** (*secret* o *service_role*) | **Nunca** | Secretos de Edge Functions o de GitHub Actions |
| Contraseña de la base de datos | **Nunca** | Gestor de contraseñas del equipo |
| Credenciales de firma (keystore, `.p8`, `.p12`) | **Nunca** | EAS las administra en la nube |
| Llaves y contraseñas del Supabase **local** | No hace falta | Son las de ejemplo de Supabase y solo sirven en tu PC. Nunca se usan en la nube |
| Correos y datos personales reales | **Nunca** | Para ejemplos se usa `usuario@ejemplo.com` |

## Reglas

1. **Todo lo que empieza con `EXPO_PUBLIC_` termina dentro de la app** y cualquiera puede extraerlo del instalable. Ahí solo va la URL y la llave pública.
2. **Toda tabla expuesta lleva RLS activado.** La llave pública le da acceso a la API a cualquiera; lo único que protege los datos son las reglas de RLS.

   > **Estado actual (2026-10-20):** resuelto. `supabase/migrations/20261022000001_rls_por_rol_y_cafeteria.sql` reemplaza las políticas permisivas de `20261021000000_politicas_rls.sql` por reglas por rol y por cafetería, y le quita a `anon` todo permiso de escritura. Ver [decisions.md](decisions.md).
3. **Lo que necesite la llave secreta va en una Edge Function**, nunca en la app. Por ejemplo, crear cuentas de empleados.
4. **Los archivos `.env*` no se suben.** Solo se versiona `.env.example`, sin valores reales.
5. **Los secretos en la nube se cargan por el panel o por CLI**, nunca en archivos del repo:
   - Edge Functions: `pnpm supabase secrets set NOMBRE=valor`
   - GitHub Actions: *Settings → Secrets and variables → Actions*
   - Builds de EAS: `eas env:create`
6. **Las capturas, los mockups y los datos de prueba** no deben mostrar llaves, correos reales ni datos de clientes.

## Qué protege el `.gitignore`

- `.env*` (excepto `.env.example`), en cualquier carpeta, incluida `supabase/`.
- Credenciales de firma: `*.jks`, `*.keystore`, `*.p8`, `*.p12`, `*.key`, `*.pem`, `*.mobileprovision`.
- Credenciales de publicación: `credentials.json` y `*service-account*.json`.

## Protección en GitHub

El repo [rubio-dev/Orby](https://github.com/rubio-dev/Orby) tiene activados:

- **Secret scanning:** GitHub revisa el código en busca de llaves conocidas.
- **Push protection:** GitHub rechaza el push si detecta una llave. Si te bloquea, **no lo saltes**: quita la llave del commit y, si ya salió de tu máquina, rótala.

Los commits se firman con el correo *noreply* de GitHub, para no exponer correos personales en el historial público. Cada integrante lo configura en su clon con `git config user.email "<id>+<usuario>@users.noreply.github.com"`. El suyo aparece en *GitHub → Settings → Emails*.

## Si se sube una llave por error

1. **Rotar la llave de inmediato** en el panel de Supabase (*Project Settings → API Keys*). Borrar el commit **no basta**: GitHub y los forks pueden conservar copias.
2. Avisar al equipo.
3. Después limpiar el historial si hace falta. El orden importa: primero rotar y luego limpiar.

## Revisiones hechas

| Fecha | Qué se revisó | Resultado |
|---|---|---|
| 2026-10-19 | Todos los archivos del repo (sin `node_modules`), incluido el contenido descomprimido del mockup (`docs/design/mockups.html`) | Sin llaves, tokens ni correos reales. En `supabase/config.toml` solo hay referencias `env(...)`, no valores |
| 2026-10-19 | Antes del primer push: todos los archivos del commit inicial (llaves de Supabase, JWT, tokens de GitHub, OpenAI y Google, llaves privadas, correo e IP personales) | Sin hallazgos. `.env` no existe y está ignorado |
