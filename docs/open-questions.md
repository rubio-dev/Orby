# Dudas y pendientes

Cuando una se resuelve, se borra de aquí y se registra en [decisions.md](decisions.md).

## Repositorio

- **Licencia.** Se quitó la de la plantilla. Sin licencia, el código se puede ver pero no reutilizar (todos los derechos reservados). Falta decidir con el equipo si se publica con una licencia abierta (por ejemplo MIT) y a nombre de quién.
- **Hook de pre-commit.** Una capa extra contra filtraciones: revisar los cambios antes de cada commit, por ejemplo con husky y gitleaks. GitHub ya bloquea los pushes con llaves, pero el hook lo detecta antes de que salga de la máquina.

## Interfaz

- **Paletas propuestas.** Orby oscuro, Miami claro y Miami oscuro esperan aprobación. Se revisan en `/lab`. Solo Orby claro sale del mockup.
- **Selector de tema y modo en la app.** ¿Dónde se cambian (por ejemplo, en Mi cuenta)? ¿La elección es por usuario (se guarda en su perfil) o por dispositivo? Hoy `cambiar_tema` y `cambiar_modo` solo se usan en `src/app/lab/index.tsx`.
- **Botón "Iniciar sesión" oscuro.** El login usa `CustomButton variante="dark"`, mientras que el resto de los botones principales usan `primary`. El código confirma que la variante es intencional, pero no explica por qué se eligió. ¿Se mantiene?
- **Motivo de los componentes propios.** La decisión está tomada y `package.json` no tiene NativeWind ni React Native Reusables, pero el commit no explica por qué se descartaron. ¿Fue para evitar dependencias, para controlar los dos temas o por otra razón?
- **Tableta.** La descripción habla de "teléfono o tableta". Falta definir si se diseña para tableta desde el inicio (por ejemplo, cocina con una tableta fija) y si se permite la orientación horizontal. Hoy `app.json` fija la orientación vertical.

## Diseño

- **Pestaña "Favoritos" y "Categorías".** El código actual ya define qué hacen: "Favoritos" filtra Latte y Frappé, y "Categorías" muestra Bebidas/Comida/Postres sin permitir crear ni editar. ¿Se quedan así o el administrador podrá administrar categorías y favoritos?
- **Mi cuenta muestra la contraseña.** Las tres pantallas de perfil muestran un campo de contraseña con el valor local `password123`; el cambio de contraseña es simulado (en admin con `Alert.prompt`, en mesero y cocina con un aviso). Supabase no guarda la contraseña en claro ni la app puede leerla. Propuesta: mostrar solo el botón "Cambiar contraseña".
- **Historial de cocina: ¿turno o todo?** La pantalla filtra todas las comandas con estado 3 o 4 de la lista local, sin filtro de fecha, pero el texto vacío dice "en el turno". Falta definir si debe mostrar el turno actual, el día o todo el historial.

## Flujo y reglas de negocio

- **Registro público de administrador y cafetería.** `src/app/login.tsx` ofrece "Registrar Admin" y `src/context/auth-context.tsx` llama `supabase.auth.signUp` con `rol: 'administrador'` y `nombre_cafeteria`; el trigger `handle_new_user` crea la cafetería. Esto contradice la suposición anterior de que no había registro público y convive con `enable_signup = true` en `supabase/config.toml`. ¿El alta de administradores es pública a propósito, debe ser por invitación o se quita? Si se desactiva el registro público, ese flujo deja de funcionar.
- **¿Quién cierra la cuenta y libera la mesa?** Ya está decidido que la comanda es la cuenta de la visita y que la mesa se libera al cerrarla (ver [decisions.md](decisions.md)). Falta definir quién la cierra (el mesero desde la mesa, o la administración al cobrar) y si el cobro se registra en la app o solo en la caja.
- **Mesa "apartada".** El esquema y la pantalla de mesas permiten el estado, pero ¿quién la aparta y para qué: reservaciones, mesas unidas?
- **Tiempo promedio de atención.** Los inicios de mesero y cocina muestran `12 min` fijo. Con la cuenta abierta la medida es por producto, desde su `fecha_creacion`: falta definir si se mide hasta que queda `listo` o hasta que se marca `entregado`. Si es lo segundo, hace falta guardar también esa hora en `detalle_comanda`.
- **Variación porcentual (admin).** El contexto usa `17 %` y `8 %` fijos. ¿Contra qué se compara: contra el día anterior o contra el mismo día de la semana pasada?
- **Reporte descargable.** El botón solo muestra un aviso que dice que se generó en PDF/Excel; no se crea ningún archivo. ¿En qué formato (PDF, CSV o Excel) y de qué periodo?

## Técnico

- **Alta de empleados sin la Edge Function.** `src/lib/auth.ts` crea las cuentas con `auth.signUp` y un cliente temporal con la llave pública, en lugar de la Edge Function `registrar-empleado`, que ya valida que el llamante sea administrador y limita los roles. Mientras siga así, `enable_signup` tiene que estar en `true` y cualquiera que conozca el UUID de una cafetería puede registrarse en ella. ¿Se despliega la función y se usa?
- **Menú vacío en las semillas.** `seed.sql` siembra categorías y mesas, pero ni un producto, así que el mesero abre el menú y no ve nada. ¿Se agregan unos productos demo y cuáles?
- **Un administrador no puede entrar a una cafetería existente.** El trigger `handle_new_user` siempre crea una cafetería nueva cuando el rol es `administrador`. No hay forma de dar de alta a un segundo administrador en una cafetería que ya existe.
- **Escritura de comandas y detalle.** `src/` nunca escribe en `detalle_comanda`: no hay una sola referencia. `enviarComandaACocina` solo inserta la cabecera de `comanda` con IDs del estado local (`mesa-4`, `usr-2`) contra columnas UUID con llave foránea. Los errores se capturan con `console.warn`, así que falla en silencio.
- **Realtime entre mesero y cocina.** No hay ninguna suscripción (`channel`, `postgres_changes` o `subscribe`) en `src/`. Las comandas y los avisos viven en el estado local de cada dispositivo; falta la sincronización que el proyecto necesita para que la comanda llegue a cocina y el aviso al mesero.
- **Notificaciones push al mesero.** Las de "pedido listo" se generan localmente en `completarComanda`; las que llegan con la app cerrada requieren `expo-notifications` y un *development build* con EAS. Falta definir cuáles se necesitan.
- **Edge Function en `db:start:lite`.** El comando excluye `edge-runtime` (`supabase start -x ...,edge-runtime,...`), así que `registrar-empleado` no corre con el arranque liviano. Hay que usar `pnpm db:start` o quitar `edge-runtime` de la lista cuando se pruebe el alta de personal.
- **Sesión local sin contraseña.** `iniciarSesion` cae a los usuarios demo y al personal local buscando solo el correo; no compara la contraseña. `seleccionarUsuarioDemo` entra con un toque. Sirve para la demo, pero no debe llegar a producción.
- **Imágenes de productos.** Se guardarán en Supabase Storage, pero `pnpm db:start:lite` excluye ese servicio (`storage-api`). Cuando se implemente, hay que quitarlo de la lista de exclusión o usar `pnpm db:start`.
