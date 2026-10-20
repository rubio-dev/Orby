# Dudas y pendientes

Cuando una se resuelve, se borra de aquí y se registra en [decisions.md](decisions.md).

## Repositorio

- **Licencia.** Se quitó la de la plantilla. Sin licencia, el código se puede ver pero no reutilizar (todos los derechos reservados). Falta decidir con el equipo si se publica con una licencia abierta (por ejemplo MIT) y a nombre de quién.
- **Hook de pre-commit.** Una capa extra contra filtraciones: revisar los cambios antes de cada commit, por ejemplo con husky y gitleaks. GitHub ya bloquea los pushes con llaves, pero el hook lo detecta antes de que salga de la máquina.

## Interfaz

- **Librería de componentes.** La descripción menciona Tailwind y shadcn, pero **shadcn/ui es solo para web** y no funciona en React Native. Opciones equivalentes:
  - [NativeWind](https://www.nativewind.dev/): Tailwind para React Native.
  - [React Native Reusables](https://reactnativereusables.com/): versión de shadcn para React Native, construida sobre NativeWind.
  - Componentes propios con `StyleSheet` y un objeto de tema. Sin dependencias extra.

  La decisión debe contemplar **dos temas** (Orby y Miami) que se cambian en tiempo de ejecución.
- **Paletas propuestas.** Orby oscuro, Miami claro y Miami oscuro esperan aprobación. Se revisan en `/lab`.
- **Selector de tema y modo en la app.** ¿Dónde se cambian (por ejemplo, en Mi cuenta)? ¿La elección es por usuario (se guarda en su perfil) o por dispositivo? Por ahora solo existen en el laboratorio.

## Diseño

Diferencias entre el mockup y la descripción del proyecto:

- **Historial de cocina:** está en la descripción pero no tiene mockup.
- **Pestaña "Favoritos"** (menú del mesero) y **pestaña "Categorías"** (menú del admin): están en el mockup pero no en la descripción. ¿Qué hace cada una? ¿El admin puede crear categorías nuevas o son fijas (bebidas, comida, postres)?
- **"¿Olvidaste tu contraseña?"** en el login. ¿Se implementa la recuperación por correo? En la nube requiere configurar un servidor de correo (SMTP).
- **Mi cuenta muestra la contraseña** en un campo de solo lectura. No se puede: Supabase guarda la contraseña cifrada y nadie la conoce. Propuesta: mostrar solo el botón "Cambiar contraseña".
- **Largo mínimo de contraseña:** el login dice "Mínimo 8 caracteres", pero `supabase/config.toml` tiene `minimum_password_length = 6`. Hay que alinearlos.
- **Botón "Iniciar sesión" en negro** (`#1A1D1C`), mientras que el resto de los botones principales son verdes. ¿Es intencional?
- **Logo y nombre:** la bienvenida tiene `[NOMBRE DE LA APP]` y el círculo del logo está vacío. Falta el logo de Orby.
- **Tableta.** La descripción habla de "teléfono o tableta". Falta definir si se diseña para tableta desde el inicio (por ejemplo, cocina con una tableta fija) y si se permite la orientación horizontal. Hoy `app.json` fija la orientación vertical.

## Flujo y reglas de negocio

- **¿Qué pasa después de "listo"?** La máquina de estados termina en `listo`, pero el mesero todavía entrega el pedido y en algún momento la mesa vuelve a quedar libre. ¿Se agregan estados como "entregado" o "pagado"? ¿Quién libera la mesa y cuándo?
- **Estado por producto o por orden.** Cocina marca cada producto como en preparación o listo y le asigna un tiempo estimado. ¿La orden pasa a "listo" sola cuando todos sus productos están listos, o cocina la cierra a mano?
- **Mesa "apartada".** ¿Quién la aparta y para qué: reservaciones, mesas unidas?
- **Tiempo promedio de atención.** ¿Se mide desde que se crea la orden hasta que queda lista, o hasta que se entrega?
- **Variación porcentual (admin).** ¿Contra qué se compara: contra el día anterior o contra el mismo día de la semana pasada?
- **Reporte descargable.** ¿En qué formato (PDF, CSV o Excel)? ¿De qué periodo?
- **Historial de cocina.** ¿Muestra solo el turno o día actual, o todo el historial?

## Técnico

- **Notificaciones al mesero.**
  - Las que se ven **con la app abierta** se resuelven con Realtime y funcionan en Expo Go.
  - Las **push**, que llegan con la app cerrada, requieren `expo-notifications` y un *development build* con EAS. Expo Go no basta.
  - Falta definir cuáles se necesitan.
- **Alta de cuentas por el administrador.**
  - Como no hay registro público, hay que desactivarlo: `enable_signup = false` en `supabase/config.toml` y lo mismo en el proyecto de la nube.
  - Crear usuarios requiere la llave secreta, así que debe hacerse en una **Edge Function**, nunca desde la app.
- **Imágenes de productos.** Se guardarán en Supabase Storage, pero `pnpm db:start:lite` excluye ese servicio (`storage-api`). Cuando se implemente, hay que quitarlo de la lista de exclusión o usar `pnpm db:start`.
