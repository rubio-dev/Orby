# Cómo funciona Orby, capa por capa

> Documento técnico del funcionamiento interno de la aplicación.
>
> **Alcance:** código del repositorio (Expo/React Native + Supabase).
> **Última revisión:** 12 de noviembre de 2026.
> **Fuente de verdad:** `src/` y `supabase/migrations/`. Cuando este documento y el código difieran, manda el código.

## Contenido

- [0. Vista general](#0-vista-general)
- [1. Capa de presentación](#1-capa-de-presentación)
- [2. Capa de estado y lógica de negocio](#2-capa-de-estado-y-lógica-de-negocio)
- [3. Capa de servicios](#3-capa-de-servicios)
- [4. Capa de backend](#4-capa-de-backend)
- [5. Flujos de extremo a extremo](#5-flujos-de-extremo-a-extremo)
- [6. Configuración y arranque](#6-configuración-y-arranque)
- [7. Hallazgos y deuda técnica](#7-hallazgos-y-deuda-técnica)
- [8. Resumen](#8-resumen)

---

## 0. Vista general

Orby es un punto de venta para cafeterías con tres roles:

| Rol | ID en base de datos | Qué hace |
|---|---|---|
| Administrador | `1` | Ventas, menú, personal, mesas y reportes |
| Mesero | `2` | Mesas, comandas, cuentas, cobro y notificaciones |
| Cocina | `3` | Comandas, preparación, tiempos y entrega |

La app es **Expo SDK 58 + React Native 0.88 + React 19**, con **Expo Router 58** para navegación por archivos y **Supabase** como backend único. No hay servidor propio: el cliente habla directamente con Auth, PostgREST, Realtime y Storage. Las reglas críticas viven en PostgreSQL: funciones RPC y Row Level Security (RLS).

### Capas reales

| Capa | Dónde vive | Responsabilidad |
|---|---|---|
| Presentación | `src/app/`, `src/components/`, `src/theme/` | Rutas, pantallas por rol, componentes y tokens visuales |
| Estado y lógica | `src/context/` | Sesión, catálogo, mesas, comandas, cocina y colas offline |
| Servicios | `src/lib/` | Cliente Supabase, reintentos, auth, PDF, voucher, diálogos y red |
| Backend | `supabase/` | Esquema, migraciones, RLS, RPC, Realtime, Storage y Edge Function |

```text
┌──────────────────────────────────────────────┐
│  Expo Router / pantallas por rol             │
│  src/app/(admin) · (mesero) · (cocina)       │
└──────────────────────┬───────────────────────┘
                       │ hooks useAuth / useCatalog / useOrders / useKitchen
┌──────────────────────▼───────────────────────┐
│  Contextos React + AsyncStorage              │
│  Auth → Catalog → Orders → Kitchen           │
└──────────────────────┬───────────────────────┘
                       │ supabase-js
┌──────────────────────▼───────────────────────┐
│  Supabase                                    │
│  Auth · PostgREST · Realtime · Storage       │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│  PostgreSQL                                  │
│  tablas + RLS + RPC + triggers + publicación │
└──────────────────────────────────────────────┘
```

### Árbol de proveedores

En `src/app/_layout.tsx`:

```text
TemaProvider
└── AuthProvider
    └── CatalogProvider
        └── OrdersProvider
            └── DialogoProvider
                └── Stack raíz
```

En `src/app/(cocina)/_layout.tsx`:

```text
GuardiaRol rol="cocina"
└── KitchenProvider
    └── Stack de cocina
```

`CatalogProvider` y `OrdersProvider` se montan para **todos los roles**, incluida cocina. `KitchenProvider` es exclusivo del grupo `(cocina)` para que Realtime de cocina solo se abra con ese rol.

### Mapa de archivos

```text
src/app/                  Rutas (Expo Router: cada archivo es una ruta)
src/app/(admin)/          Pantallas del administrador
src/app/(mesero)/         Pantallas del mesero
src/app/(cocina)/         Pantallas de cocina
src/app/lab/              Laboratorio visual (solo desarrollo)
src/components/           Componentes propios
src/context/              Estado global y colas offline
src/kitchen/              Aviso de sin conexión de cocina
src/lib/                  Cliente Supabase, auth, PDF, voucher, red
src/theme/                Tokens, paletas y proveedor de tema
src/types/                Tipos compartidos
supabase/migrations/      Esquema, RLS, RPC y Realtime
supabase/functions/       Edge Functions (registrar-empleado)
supabase/seed.sql         Datos locales de ejemplo
scripts/                  Pruebas y datos de cocina
```

---

## 1. Capa de presentación

### 1.1 Enrutamiento con Expo Router

La entrada de la app es `expo-router/entry` (`package.json`). Cada archivo dentro de `src/app/` es una ruta. Los grupos entre paréntesis **no forman parte de la URL**:

- `(admin)`, `(mesero)` y `(cocina)` son grupos.
- Cada grupo tiene su `_layout.tsx` con un `Stack` y un `GuardiaRol`.
- La URL visible no incluye el grupo: `/(admin)/menu` se ve como `/menu`.

#### Rutas raíz

| Archivo | Ruta | Qué hace |
|---|---|---|
| `src/app/index.tsx` | `/` | Bienvenida; “Continuar” lleva al grupo del rol si hay sesión; si no, a `/login` |
| `src/app/login.tsx` | `/login` | Correo/contraseña y redirección por rol |
| `src/app/registro.tsx` | `/registro` | Registro de administrador + cafetería |
| `src/app/lab/index.tsx` | `/lab` | Laboratorio visual; solo en `__DEV__` |

#### Administrador

| Archivo | Ruta | Qué hace |
|---|---|---|
| `(admin)/index.tsx` | `/` | Dashboard: ventas, pedidos, top de productos y reporte PDF |
| `(admin)/menu.tsx` | `/menu` | CRUD de productos y categorías, disponibilidad y cola offline |
| `(admin)/new-product.tsx` | `/new-product?id=` | Alta/edición de producto con imagen |
| `(admin)/staff.tsx` | `/staff` | Equipo de la cafetería y baja de empleados |
| `(admin)/new-staff.tsx` | `/new-staff` | Alta de mesero o cocina |
| `(admin)/tables.tsx` | `/tables` | CRUD de mesas, abrir/cerrar y forzar cierre |
| `(admin)/profile.tsx` | `/profile` | Cambio de contraseña y cierre de sesión |

#### Mesero

| Archivo | Ruta | Qué hace |
|---|---|---|
| `(mesero)/index.tsx` | `/` | Métricas de mesas, pedidos y tiempo promedio |
| `(mesero)/tables.tsx` | `/tables` | Cuadrícula de mesas y acciones contextuales |
| `(mesero)/new-order.tsx` | `/new-order` | Catálogo, carrito y elección mesa/llevar |
| `(mesero)/order-summary.tsx` | `/order-summary` | Resumen, especificaciones, pago y envío a cocina |
| `(mesero)/account.tsx` | `/account?id=` o `?mesa=` | Cuenta, estados, entrega, cobro y voucher |
| `(mesero)/view-menu.tsx` | `/view-menu` | Consulta de menú, solo lectura |
| `(mesero)/notifications.tsx` | `/notifications` | Avisos de pedido listo |
| `(mesero)/mesero-profile.tsx` | `/mesero-profile` | Contraseña y cierre de sesión |

#### Cocina

| Archivo | Ruta | Qué hace |
|---|---|---|
| `(cocina)/index.tsx` | `/` | Métricas de cocina y espera promedio |
| `(cocina)/orders.tsx` | `/orders` | Comandas en preparación y listas |
| `(cocina)/order-detail.tsx` | `/order-detail?id=` | Detalle, estados por producto y tiempos |
| `(cocina)/history.tsx` | `/history` | Comandas cerradas del día |
| `(cocina)/cocina-profile.tsx` | `/cocina-profile` | Contraseña y cierre de sesión |

> **Colisión de URLs:** los tres `index.tsx` de grupo comparten `/` y `/tables` existe en admin y mesero. La navegación interna usa `href` con grupo (`/(admin)/tables`), pero un deep link o un refresh web en `/` puede resolver la bienvenida en lugar del panel del rol.

### 1.2 Arranque

Secuencia en `src/app/_layout.tsx`:

1. `SplashScreen.preventAutoHideAsync()` al importar el módulo.
2. `useFonts()` carga cinco pesos:
   - Josefin Sans 300.
   - Plus Jakarta Sans 400, 500, 600 y 700.
3. Al terminar —o si falla la carga— `SplashScreen.hideAsync()`.
4. Mientras no hay fuentes, el layout devuelve `null`; el splash nativo sigue visible.
5. Se montan los proveedores y el `Stack` raíz con:
   - `headerShown: false`.
   - `animation: 'fade'`.
   - `contentStyle.backgroundColor = colores.background`.

No hay `+not-found.tsx`, `error.tsx` ni Error Boundary de rutas.

### 1.3 Protección de rutas y sesión

`GuardiaRol` (`src/components/GuardiaRol.tsx`) es el portero de cada grupo:

- Si `estaCargando`, muestra un `ActivityIndicator` a pantalla completa.
- Si no hay usuario, `<Redirect href="/login" />`.
- Si el rol no coincide, redirige al inicio del rol real:
  - `administrador → /(admin)`
  - `mesero → /(mesero)`
  - `cocina → /(cocina)`
- Si coincide, renderiza el `Stack`.

Es una protección de **UX y navegación**, no de seguridad. La seguridad real está en RLS y en las RPC de PostgreSQL.

#### Restauración de sesión

En `src/context/auth-context.tsx`:

1. Lee `@orby_usuario_sesion` de AsyncStorage.
2. Si Supabase no está configurado, borra la sesión local.
3. Llama `supabase.auth.getSession()`.
4. Si no hay sesión o el `user.id` no coincide con el guardado, borra la caché.
5. Si hay sesión, relee el perfil real en `public.usuario` por `id_usuario`.
6. Si el perfil ya no existe, borra la caché.
7. Si existe, reconstruye el `Usuario` con `NOMBRES_ROLES[perfil.id_rol]` y actualiza AsyncStorage.
8. Si falla la red, conserva el usuario cacheado para permitir arrancar sin conexión.

#### Login

`iniciarSesion` hace:

1. Valida que Supabase esté configurado.
2. Normaliza el correo a minúsculas y sin espacios.
3. `signInWithPassword`.
4. Lee `public.usuario` con `.single()`.
5. Valida que el `id_rol` exista en `NOMBRES_ROLES`.
6. Guarda el `Usuario` y devuelve `{ exito: true, rol }`.
7. La pantalla redirige con `router.replace` al grupo correspondiente.

#### Registro de administrador

`registrarAdministrador` usa `signUp` con metadata:

```ts
{
  rol: 'administrador',
  nombre,
  nombre_cafeteria
}
```

El trigger `handle_new_user` crea la cafetería y el perfil. Si el proyecto exige confirmación de correo y no devuelve sesión, la app informa “Cuenta creada. Confirma tu correo…”.

#### Registro de personal

`registrarPersonal` exige que el usuario actual sea administrador y que el rol sea `mesero` o `cocina`. Usa `registrar_empleado_supabase` (`src/lib/auth.ts`), que:

- Crea un cliente temporal con `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false` y `storageKey:'orby-registro-empleado'`.
- Hace `signUp` con `rol`, `nombre` e `id_cafeteria`.
- Detecta correo ya registrado por `identities.length === 0`.

No usa la Edge Function `registrar-empleado`; esa función existe pero está pendiente de integrarse.

### 1.4 Pantallas

#### Administrador

- **Dashboard** (`(admin)/index.tsx`):
  - Usa `useCatalog().estadisticas` para ventas totales, pedidos diarios y top 4 de productos.
  - Usa `useOrders().mesas` para el conteo de mesas.
  - El botón “Descargar reporte” abre un modal con periodo día/semana/mes.
  - Genera el reporte con `obtenerDatosReporte()` y `generarHtmlReporte()` de `src/lib/pdf-report.ts`.
  - En web abre una pestaña e imprime; en nativo crea un PDF y lo comparte con `expo-sharing`.

- **Menú** (`(admin)/menu.tsx`):
  - Pestañas Productos/Categorías.
  - Buscador local por nombre.
  - `useFocusEffect` recarga productos al ganar foco.
  - CRUD con `agregarProducto`, `editarProducto`, `eliminarProducto`, `cambiarEstadoProducto`.
  - CRUD de categorías con `agregarCategoria`, `editarCategoria`, `eliminarCategoria`.
  - Banner de cola offline con “Sincronizar ahora”.

- **Nuevo producto** (`(admin)/new-product.tsx`):
  - Distingue alta/edición por el parámetro `id`.
  - Imagen desde galería, cámara o URL.
  - `expo-image-picker` con `allowsEditing`, `aspect: [1,1]`, `quality: 0.7` y `base64`.
  - La imagen se sube a Storage desde `catalog-context.tsx`.

- **Personal** (`(admin)/staff.tsx`):
  - Consulta `cafeteria.nombre_cafeteria` y `usuario` de la cafetería.
  - Lista nombre, rol y si es el usuario actual.
  - Elimina con `eliminarPersonal` → RPC `eliminar_empleado`.

- **Nuevo empleado** (`(admin)/new-staff.tsx`):
  - Tarjetas de rol mesero/cocina.
  - Valida nombre, correo y contraseña.
  - Permite registrar varios empleados seguidos sin salir de la pantalla.

- **Mesas** (`(admin)/tables.tsx`):
  - KPIs de total, abiertas, ocupadas y cerradas.
  - Crear mesa con número sugerido.
  - Abrir, cerrar (con confirmación si está ocupada) y eliminar.
  - Cola offline de mesas.

- **Perfil** (`(admin)/profile.tsx`):
  - Cambio de contraseña con `cambiarContrasena`.
  - Cierre de sesión con confirmación.

#### Mesero

- **Inicio** (`(mesero)/index.tsx`):
  - `mesasActivas`: mesas en estado `ocupada`.
  - `pedidosHoy`: comandas cargadas (solo las de hoy).
  - `tiempoPromedio`: promedio de minutos desde `fecha_creacion` de las comandas abiertas.
  - Reloj local actualizado cada 30 s.

- **Mesas** (`(mesero)/tables.tsx`):
  - Cuadrícula de tarjetas.
  - Modal contextual:
    - Libre: ocupar, apartar o tomar pedido.
    - Ocupada: agregar productos o ver cuenta.
    - Apartada: ocupar o liberar.
    - Inactiva: solo informa.
  - `cambiarEstadoMesa` actualiza primero el estado local y luego hace un `update` directo, sin cola ni rollback.

- **Nueva orden** (`(mesero)/new-order.tsx`):
  - Filtra productos por categoría y `estado !== false`.
  - Carrito con incremento por toque; badge de cantidad.
  - `SegmentedTabs` para “Comer aquí” / “Para llevar”.
  - Para llevar exige nombre del cliente.
  - Para mesa abre un modal; las mesas `apartada` e `inactiva` están deshabilitadas; una mesa `ocupada` se muestra como “Cuenta” y los productos se agregan a la cuenta abierta.

- **Resumen** (`(mesero)/order-summary.tsx`):
  - Métodos de pago: efectivo, tarjeta, transferencia.
  - Permite especificaciones por línea y eliminar productos.
  - Para llevar exige método de pago.
  - Llama `enviarComandaACocina()`.
  - Si es para llevar, abre `VoucherModal`; si es mesa, vuelve a mesas.

- **Cuenta** (`(mesero)/account.tsx`):
  - Busca la comanda por `id` o por `mesa` (primera abierta).
  - Excluye detalles cancelados (`id_estado === 5`).
  - Muestra estados por producto.
  - “Marcar productos listos como entregados” → `marcarComandaEntregada`.
  - “Cobrar y cerrar cuenta” solo si todos están entregados → `cerrarCuentaMesa`.
  - “Agregar más productos” → vuelve a nueva orden.
  - “Ver voucher” si `pagado`.

- **Ver menú** (`(mesero)/view-menu.tsx`): consulta por categorías, sin acciones.

- **Notificaciones** (`(mesero)/notifications.tsx`): lista hasta 50, marca leída, navega a la cuenta y permite limpiar las leídas con confirmación. Las pendientes se conservan.

- **Perfil** (`(mesero)/mesero-profile.tsx`): contraseña y cierre de sesión.

#### Cocina

- **Inicio** (`(cocina)/index.tsx`):
  - `comandasAbiertas` y `comandasCerradasHoy` de `useKitchen()`.
  - `mesasActivas`: mesas únicas entre comandas abiertas de tipo mesa.
  - `pedidosHoy`: abiertas de hoy + cerradas de hoy.
  - `esperaPromedio`: calculada por producto en espera.
  - `AvisoSinConexion` y pull-to-refresh.

- **Comandas** (`(cocina)/orders.tsx`):
  - Pestañas “En preparación” y “Listos” con contadores.
  - `clasificarComanda()` separa por estado de los detalles.
  - Ordena por minutos de espera descendente.
  - Las comandas sin pendientes no se muestran.

- **Detalle** (`(cocina)/order-detail.tsx`):
  - Busca la comanda en abiertas y luego en cerradas de hoy.
  - `editable` solo si `id_estado === 1`.
  - Cada producto permite “En preparación” y “Listo”.
  - Selector de tiempo estimado: 5, 10, 15, 20, 25 o 30 min.
  - “Completar” marca todos los pendientes como listos y crea una notificación de pedido listo.
  - Muestra especificaciones y tiempo estimado total.

- **Historial** (`(cocina)/history.tsx`): comandas cerradas de hoy con productos, total y enlace al detalle. “Hoy” se decide por `fecha_creacion`, no por fecha de cierre.

- **Perfil** (`(cocina)/cocina-profile.tsx`): contraseña y cierre de sesión.

### 1.5 Componentes

| Componente | Propósito |
|---|---|
| `CustomButton` | Botón con variantes `primary`, `dark`, `outline`, `secondary`, `danger`; estados `cargando` y `deshabilitado` |
| `CustomInput` | Input con etiqueta, obligatorio, contraseña con ojito, icono derecho, error accesible y `useId()` |
| `ScreenHeader` | Título, botón atrás y slot derecho |
| `UserHeader` | Avatar genérico, saludo y rol |
| `AdminBottomNav` | Inicio, Menú, Personal, Perfil y Salir |
| `MeseroBottomNav` | Inicio, Notificaciones (con badge), Perfil y Salir |
| `CocinaBottomNav` | Inicio, Comandas, Historial, Perfil y Salir |
| `MetricCard` | Valor, sufijo y cambio porcentual |
| `SegmentedTabs` | Tabs/pills genéricos; sin scroll horizontal |
| `VoucherModal` | Ticket con folio, productos, total, método de pago y compartir PDF |
| `DialogoProvider` | `mostrarAviso()` y `confirmarAccion()` con estética Orby |
| `GuardiaRol` | Protección por rol |
| `OrbyLogo` | Logo SVG |

Los bottom navs de “Salir” no navegan a una ruta: ejecutan confirmación y `router.replace('/login')`.

### 1.6 Tema

- `src/theme/tokens.ts`: espaciado, radios, medidas, fuentes y tipografía.
- `src/theme/themes.ts`: cuatro paletas —Orby/Miami × claro/oscuro—.
- `src/theme/theme-provider.tsx`: `useTema()` expone:
  - `colores`
  - `tema`
  - `modo`
  - `preferencia_modo`
  - `cambiar_tema`
  - `cambiar_modo`
- Regla del proyecto: no usar hex en pantallas/componentes; todo sale de tokens. El logo es la excepción (`coloresMarca`).
- El laboratorio `/lab` permite revisar colores, contrastes y tipografía; solo existe en desarrollo.

---

## 2. Capa de estado y lógica de negocio

### 2.1 `AuthProvider`

Estado:

- `usuario: Usuario | null`
- `estaCargando: boolean`
- Persistencia: `@orby_usuario_sesion`

API:

- `iniciarSesion(correo, contrasena)`
- `registrarAdministrador({ nombre, nombreCafeteria, correo, contrasena })`
- `registrarPersonal({ nombre, correo, contrasena, rol })`
- `eliminarPersonal(id_usuario)`
- `cambiarContrasena(nuevaContrasena)`
- `cerrarSesion()`

Puntos técnicos:

- No hay `supabase.auth.onAuthStateChange` en `AuthProvider`; solo se restaura una vez al montar. Si el token se revoca o expira, el contexto no se entera. Los listeners de auth están en `OrdersProvider` y `KitchenProvider`.
- `cerrarSesion` limpia el usuario y AsyncStorage, y hace `signOut()` con `Promise.race` de 500 ms. No limpia las cachés de catálogo, mesas, comandas ni cocina.
- `registrarAdministrador` exige 6 caracteres de contraseña, aunque la UI y `LARGO_MINIMO_CONTRASENA` exigen 8.
- El registro de empleados confía en `raw_user_meta_data`; la validación de que quien registra es administrador ocurre solo en el cliente, salvo que se use la Edge Function.

### 2.2 `CatalogProvider`

Carga:

- `categoria` de la cafetería, ordenada por nombre.
- `producto` de la cafetería, ordenado por nombre.
- Estadísticas calculadas en el cliente:
  - comandas cerradas de hoy (`id_estado = 2`, `fecha_creacion >= inicio de hoy UTC`);
  - comandas cerradas de ayer;
  - detalles de las comandas de hoy con `producto(nombre_producto)`;
  - ventas, pedidos, variación porcentual y top 4 de productos.

No carga mesas, roles, estados ni tipos de servicio: esos están hardcodeados en `src/types/index.ts`, `src/lib/kitchen-network.ts` y el seed.

Caché en AsyncStorage:

```text
@orby_productos_<id_cafeteria>
@orby_categorias_<id_cafeteria>
@orby_estadisticas_<id_cafeteria>
@orby_cola_catalogo_<id_cafeteria>
```

Estrategia: lee caché al montar, pinta de inmediato y luego consulta Supabase. Es un “stale-while-revalidate” manual, sin TTL ni invalidación por Realtime.

#### Cola offline de catálogo

Operaciones:

```ts
type OperacionColaCatalogo = {
  id_operacion: string;
  tabla: 'producto' | 'categoria';
  accion: 'crear' | 'editar' | 'eliminar';
  id_registro: string;
  datos?: Record<string, unknown>;
  fecha: number;
};
```

`encolarOperacion` compacta:

- `editar` sobre `crear` → fusiona datos en el `crear`.
- `editar` sobre `editar` → fusiona.
- `eliminar` sobre `crear` → elimina ambos.
- `eliminar` sobre `editar` → elimina los `editar` y encola el `eliminar`.

`sincronizarColaPendiente` procesa en orden:

- Categoría crear → `upsert`.
- Categoría editar/eliminar → `update`/`delete`.
- Producto crear/editar con imagen local → sube imagen primero.
- Producto crear → `upsert`.
- Producto editar/eliminar → `update`/`delete`.

Si falla la red, conserva la operación y las siguientes. Si es error no-red, la descarta silenciosamente.

#### Imágenes

- Data URLs base64 se convierten con `base64ToArrayBuffer`.
- URIs `file://`, `content://`, `ph://` o `blob:` se leen con `fetch(uri).arrayBuffer()`.
- Se suben a `productos/<id_cafeteria>/<id_producto>-<timestamp>.<ext>`.
- Se guarda la URL pública en `producto.imagen_url`.

No hay Realtime de `producto`/`categoria`: el mesero puede seguir viendo precios o disponibilidad cacheados hasta reiniciar o hasta que el admin recargue.

### 2.3 `OrdersProvider`

Maneja mesas, comandas del día, notificaciones, carrito y cola offline de mesas.

#### Verificación de sesión real

Antes de operar distingue entre usuario cacheado y sesión real:

```ts
revisionSesion: { idUsuario, real } | null
estadoSesion: 'verificando' | 'real' | 'falsa'
sesionReal = estadoSesion === 'real'
conectado = supabase_configurado && sesionReal && esUuidValido(idCafeteria)
```

Llama `supabase.auth.getSession()` y se suscribe a `onAuthStateChange`. Si el error es de red/timeout, asume `real: true` para no bloquear sin conexión. Si `estadoSesion === 'verificando'`, `enviarComandaACocina` bloquea el envío con “Estamos verificando tu sesión…”.

#### Mesas

Consulta:

```ts
.from('mesa')
.select('id_mesa, id_cafeteria, num_mesa, id_estado, estado_mesa(nombre_estado)')
.eq('id_cafeteria', cafeteriaId)
.order('num_mesa', { ascending: true })
```

Mapea `estado_mesa.nombre_estado` a `libre | ocupada | apartada | inactiva` y cachea en `@orby_mesas_<id_cafeteria>`.

Operaciones:

- `crearMesa`: valida entero > 0 y duplicado local; inserta con `id_estado = 1`; si falla la red, crea una mesa temporal `mesa-<timestamp>` y encola `crear`.
- `abrirMesa`: `id_estado = 1`.
- `cerrarMesa`: `id_estado = 4` (“inactiva”); bloquea si está ocupada salvo que se fuerce.
- `eliminarMesa`: `delete`; solo bloquea localmente si está ocupada.
- `cambiarEstadoMesa`: actualiza local y hace `update` directo, sin reintentos ni cola ni rollback.

#### Comandas del día

`cargarComandas` consulta `comanda` de la cafetería con `fecha_creacion >= inicioDeHoyIso()` y orden descendente. Incluye `mesa(num_mesa)`, `detalle_comanda(...)` y `producto(nombre_producto)` mediante `SELECT_COMANDA_COCINA` de `src/lib/kitchen-network.ts`. No filtra por `id_estado` ni por `id_usuario`: el mesero ve todas las comandas de su cafetería.

`cargarNotificaciones` consulta `notificacion` de la cafetería y del usuario, orden descendente, límite 50.

`limpiarNotificacionesLeidas` borra en el servidor únicamente las notificaciones propias con `leida = true` y actualiza el estado local. La operación está protegida por la política RLS `notificacion_eliminar_propia`; las notificaciones pendientes no se tocan.

#### Carrito

- `agregarAlCarrito` incrementa cantidad si el producto ya existe; no distingue especificaciones, así que dos líneas del mismo producto con notas distintas se fusionan.
- `quitarDelCarrito` elimina todas las unidades de esa línea.
- `actualizarEspecificaciones` actualiza la línea por `id_producto`.
- `limpiarCarrito` vacía carrito, tipo de servicio y nombre.

#### Envío a cocina

`enviarComandaACocina`:

1. Valida carrito no vacío.
2. Bloquea si la sesión se está verificando.
3. Valida `conectado` y `idUsuario`.
4. Exige nombre para llevar y método de pago.
5. Exige mesa para servicio en mesa.
6. Rechaza mesas temporales offline y productos que no sean UUID.
7. Genera **un** `id_comanda` y un `id_detalle` por línea.
8. Llama la RPC:

```ts
supabase.rpc('crear_comanda', {
  p_id_comanda: idComanda,
  p_id_mesa: idMesa,
  p_detalles: detalles,
  p_tipo_servicio: tipoServicio,
  p_nombre_cliente: esLlevar ? nombreLimpio : null,
  p_pagado: esLlevar,
  p_metodo_pago: esLlevar ? metodoPago : null,
})
```

9. Si falla la red, devuelve error y **no encola**.
10. Si es mesa, actualiza localmente el estado a “ocupada”.
11. Relee la comanda con `SELECT_COMANDA_COCINA`, limpia carrito y recarga comandas.

#### Cierre y entrega

- `cerrarCuentaMesa(num_mesa, metodo_pago)` llama `cerrar_comanda` con `p_id_mesa` y `p_metodo_pago`. Traduce:
  - `CUENTA_NO_ABIERTA`
  - `MESA_INVALIDA`
  - `PEDIDOS_PENDIENTES`
  - `PEDIDOS_NO_ENTREGADOS`
  - `METODO_PAGO_INVALIDO`
- Luego marca la mesa local como libre.
- `marcarComandaEntregada(id_comanda)` llama `entregar_comanda` y devuelve cuántos detalles pasaron a entregado.

#### Realtime

Canales:

```text
mesero-<id_cafeteria>-<id_usuario>
  postgres_changes: comanda          filter id_cafeteria=eq.<id>
  postgres_changes: detalle_comanda  sin filtro (RLS)
  postgres_changes: notificacion     filter id_usuario=eq.<id>

mesas-<id_cafeteria>
  postgres_changes: mesa             filter id_cafeteria=eq.<id>
```

- `programarRecarga` aplica debounce de 400 ms y recarga comandas + notificaciones.
- El canal de mesas actualiza el estado directamente con `payload.new`; para `DELETE` usa `payload.old.id_mesa`.
- Al `SUBSCRIBED` tras una caída, recarga.
- `AppState` recarga al volver a `active`; además hay un intervalo de 12 s para sincronizar la cola de mesas si hay pendientes.

#### Cola offline de mesas

Operaciones: `crear`, `abrir`, `cerrar`, `eliminar`. Se guarda en `@orby_cola_mesas_<id_cafeteria>`.

- La sincronización reemplaza el ID temporal por el real tras un `insert` exitoso.
- Si falla la red, conserva la operación y las siguientes.
- Un error no-red se descarta silenciosamente.
- `crear` no es idempotente: no envía `id_mesa` de cliente. Si el `insert` remoto tuvo éxito pero se perdió la respuesta, el reintento choca con la unique `(num_mesa, id_cafeteria)` y la mesa local queda con el ID temporal.

### 2.4 `KitchenProvider`

Se monta solo en `(cocina)/_layout.tsx`, dentro de `GuardiaRol`. Maneja:

- `comandasAbiertas`: comandas con `id_estado = 1`.
- `comandasCerradasHoy`: comandas con `id_estado = 2` y `fecha_creacion >= inicio de hoy`.
- Copia local en `@orby_cocina_comandas_<id_cafeteria>`.
- Cola en `@orby_cola_cocina_<id_cafeteria>`.

Carga con `SELECT_COMANDA_COCINA`, verifica que la cafetería no haya cambiado durante la petición y guarda copia local. Si hay error de red, marca `sinConexion`; si es error no-red, avisa.

#### Cola de cocina

La lógica pura vive en `src/lib/kitchen-network.ts`:

- `crearOperacionesCambioEstado`: al pasar a `listo` (3), agrega también una notificación `producto_listo` (tipo 3) que depende del cambio.
- `crearOperacionesCompletarComanda`: marca todos los pendientes/en preparación como listos y agrega **una** notificación `pedido_listo` (tipo 1) que depende de todos los cambios.
- `crearOperacionTiempoEstimado`: cambia el tiempo estimado.
- `aplicarColaSobreComandas`: vista optimista antes de confirmar con el servidor.
- `procesarCola`: envía en orden; si una operación se detiene por red o sesión, devuelve el resto sin saltarse nada; las notificaciones cuyos cambios fueron descartados también se descartan.

La aplicación de estados usa **CAS** (compare-and-swap):

```ts
update { id_estado }
  .eq('id_detalle', id)
  .eq('id_estado', estado_anterior)
  .select('id_detalle')
```

Si 0 filas, distingue entre:

- cuenta cerrada/cancelada,
- detalle eliminado,
- ya estaba en el estado nuevo (reintento exitoso),
- conflicto con otro estado.

Las notificaciones usan `id_notificacion` generado de antemano y tratan `23505` (duplicado) como aplicada, lo que las hace idempotentes. El cambio de tiempo estimado **no** tiene CAS: es last-write-wins.

#### Realtime de cocina

```text
cocina-<id_cafeteria>
  postgres_changes: comanda          filter id_cafeteria=eq.<id>
  postgres_changes: detalle_comanda  sin filtro (RLS)
```

Debounce de 400 ms; al reconectar recarga; `AppState` recarga al volver y, si hay cola o `sinConexion`, corre un intervalo de 12 s.

### 2.5 Máquina de estados real

| Entidad | Estados |
|---|---|
| `comanda` | `1 abierta` → `2 cerrada` o `3 cancelada` |
| `detalle_comanda` | `1 pendiente` → `2 en preparación` → `3 listo` → `4 entregado`; `5 cancelado` |
| `mesa` | `1 libre`, `2 ocupada`, `3 apartada`, `4 inactiva` |

Matices:

- La app crea los detalles directamente en `2` (“en preparación”), no en `1`.
- `pendiente` y `cancelado` existen en el esquema, pero la app no los usa para crear/cancelar.
- La cocina mueve `2 → 3`; el mesero mueve `3 → 4` con `entregar_comanda`.
- `cerrar_comanda` exige que no queden detalles en `1`, `2` ni `3`; es decir, todo debe estar entregado o cancelado.
- Los IDs de catálogo están duplicados en TypeScript (`ID_ROLES`, `NOMBRES_ROLES`, `ESTADO_COMANDA`, `ESTADO_DETALLE`) y en el seed SQL.

---

## 3. Capa de servicios

### 3.1 `src/lib/env.ts`

```ts
export const supabase_url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabase_llave = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const supabase_configurado = supabase_url !== '' && supabase_llave !== '';
```

Usa referencias estáticas completas porque Expo reemplaza `process.env.NOMBRE` en build. Solo se usan URL y llave **publishable**; cualquier `EXPO_PUBLIC_*` queda embebido en el binario.

### 3.2 `src/lib/supabase.ts`

`obtener_supabase()` crea el cliente de forma perezosa:

- Si falta configuración, lanza un error claro solo cuando alguien intenta usar Supabase; importar el módulo nunca tumba la app.
- En nativo usa `AsyncStorage`; en web deja que supabase-js use `localStorage`.
- Opciones:
  - `autoRefreshToken: true`
  - `persistSession: true`
  - `detectSessionInUrl: false`
- En nativo registra `AppState`:
  - al volver a `active` llama `startAutoRefresh()`;
  - al pasar a segundo plano, `stopAutoRefresh()`.

### 3.3 `src/lib/auth.ts`

Contiene:

- `LARGO_MINIMO_CONTRASENA = 8`, `TIMEOUT_CONEXION_MS = 7000`, `MAX_INTENTOS_CONEXION = 3`.
- `validar_correo`, `validar_contrasena`.
- `traducir_error` para credenciales, correo existente, correo sin confirmar, misma contraseña, contraseña débil, sesión vencida, etc.
- `con_reintentos`: ejecuta una operación hasta 3 veces con timeout de 7 s y 800 ms entre intentos; distingue errores de red de errores de negocio.
- `registrar_empleado_supabase`: cliente temporal + `signUp` + detección de correo existente.
- `cambiar_contrasena_supabase`: cliente de verificación, intento de login con la nueva contraseña para detectar “misma contraseña” y luego `updateUser({ password })`.

### 3.4 `src/lib/voucher.ts`

- `generarHtmlVoucher(comanda, nombreCafeteria, metodoPago)` produce un ticket HTML de 80 mm.
- Filtra detalles cancelados (`id_estado !== 5`).
- Folio: primeros 8 caracteres del UUID en mayúsculas; no es secuencial.
- Formato de moneda `es-MX`/MXN.
- `compartirVoucherPdf`:
  - Web: abre pestaña, escribe HTML y llama `print()`; si el navegador bloquea la pestaña, descarga un `.html`.
  - Nativo: `Print.printToFileAsync`, escribe el PDF en `cacheDirectory` o `documentDirectory` y abre `Sharing.shareAsync`; si no se puede compartir, cae a `Print.printAsync`.

### 3.5 `src/lib/pdf-report.ts`

- `obtenerDatosReporte(idCafeteria, inicio, fin)`:
  - consulta comandas cerradas (`id_estado = 2`) con `fecha_creacion` en el rango;
  - suma `comanda.total`;
  - calcula ticket promedio;
  - consulta detalles en lotes de 100 IDs para agrupar productos.
- `generarHtmlReporte` produce un documento carta con KPIs y tabla de productos.
- `verificarConexionServidor` hace un `select` a `cafeteria` con timeout; sirve como ping de red, no como validación de sesión/permisos.
- `ejecutarConTimeout` usa `Promise.race` con 8 s.
- En web, el dashboard abre la ventana después de varios `await`, lo que puede ser bloqueado por el navegador; en nativo genera el PDF y lo comparte.

### 3.6 `src/lib/confirm.ts` y `DialogoProvider`

`confirm.ts` mantiene un registro global de un “presentador” de avisos:

- `registrarPresentador(funcion)`.
- `mostrarAviso(titulo, mensaje?, botones?)`: si hay presentador, lo usa; si no, cae a `Alert.alert`.
- `confirmarAccion({ titulo, mensaje, textoConfirmar, textoCancelar, destructivo, alConfirmar })`.

`DialogoProvider` se monta una vez en el layout raíz, registra `setAviso` y renderiza un modal con estética Orby. Si el usuario toca el fondo o presiona atrás, ejecuta el botón `cancel` si existe. Los errores de acciones asíncronas solo se registran en consola; no se muestran al usuario.

### 3.7 `src/lib/kitchen-network.ts`

Es la pieza más robusta de la capa offline:

- No usa React, React Native ni AsyncStorage; recibe el cliente Supabase y `con_reintentos` como parámetros.
- Define `DetalleCocina`, `ComandaCocina`, `SELECT_COMANDA_COCINA`, `mapearComandaCocina`, `etiquetaComanda`, `clasificarComanda`, `minutosDeEspera`, `esperaPromedioMinutos`.
- Implementa la cola pura: crear operaciones, aplicar vista optimista, procesar en orden, CAS de estados, idempotencia de notificaciones y detección de cuenta cerrada.
- Al ser pura, `scripts/prueba-cocina.mjs` puede importarla con Node y probar la misma lógica que usa la app.

---

## 4. Capa de backend

### 4.1 Esquema de datos

El esquema efectivo es el resultante de aplicar las migraciones en orden. `supabase/schemas/` es un esquema declarativo **desactualizado**; no debe usarse como fuente de verdad.

#### Catálogos

| Tabla | Columnas clave |
|---|---|
| `role` | `id_rol`, `nombre_rol` |
| `estado_cafeteria` | `id_estado`, `nombre_estado` |
| `estado_comanda` | `id_estado`, `nombre_estado` |
| `estado_detalles_comanda` | `id_estado`, `nombre_estado` |
| `estado_mesa` | `id_estado`, `nombre_estado` |
| `tipo_notificacion` | `id_tipo`, `nombre_tipo` |

Valores sembrados:

- `role`: `1 administrador`, `2 mesero`, `3 cocina`.
- `estado_cafeteria`: `1 activa`, `2 inactiva`, `3 suspendida`.
- `estado_mesa`: `1 libre`, `2 ocupada`, `3 apartada`, `4 inactiva`.
- `estado_detalles_comanda`: `1 pendiente`, `2 en preparación`, `3 listo`, `4 entregado`, `5 cancelado`.
- `estado_comanda`: `1 abierta`, `2 cerrada`, `3 cancelada`.
- `tipo_notificacion`: `1 pedido_listo`, `2 nueva_comanda`, `3 producto_listo`, `4 comanda_cancelada`.

#### Entidades

| Tabla | Columnas clave | Relaciones importantes |
|---|---|---|
| `cafeteria` | `id_cafeteria`, `nombre_cafeteria`, `id_estado` | FK a `estado_cafeteria` |
| `categoria` | `id_categoria`, `id_cafeteria`, `nombre_categoria` | FK a `cafeteria` con `ON DELETE CASCADE` |
| `producto` | `id_producto`, `id_cafeteria`, `id_categoria`, `nombre_producto`, `descripcion`, `precio`, `imagen_url`, `estado` | FK a `cafeteria` con cascade; FK a `categoria` con `RESTRICT`; `precio >= 0` |
| `mesa` | `id_mesa`, `id_cafeteria`, `num_mesa`, `id_estado` | unique `(num_mesa, id_cafeteria)`; FKs con cascade |
| `usuario` | `id_usuario`, `id_cafeteria`, `nombre`, `foto`, `id_rol`, `push_token` | FK a `auth.users` con cascade; FK a `cafeteria` y `role` con cascade |
| `comanda` | `id_comanda`, `id_cafeteria`, `id_mesa`, `id_usuario`, `id_estado`, `total`, `fecha_creacion`, `tipo_servicio`, `nombre_cliente`, `pagado`, `metodo_pago`, `fecha_pago`, `fecha_entrega` | FKs con cascade a `cafeteria`, `mesa` y `usuario`; check de `tipo_servicio` y `metodo_pago`; índice único parcial `id_mesa` donde `id_estado = 1` |
| `detalle_comanda` | `id_detalle`, `id_comanda`, `id_producto`, `cantidad`, `precio_unitario`, `especificaciones`, `tiempo_estimado`, `id_estado`, `fecha_creacion` | FK a `comanda` con cascade; FK a `producto` sin cascade; `cantidad > 0` |
| `notificacion` | `id_notificacion`, `id_cafeteria`, `id_usuario`, `id_comanda`, `id_tipo`, `leida`, `fecha_creacion` | FKs con cascade a `cafeteria`, `usuario` y `comanda` |

Consecuencia del modelo: el aislamiento multi-cafetería se apoya en `id_cafeteria` en las tablas principales, pero `detalle_comanda` no lo tiene y se alcanza vía `comanda`. No hay FKs compuestas que garanticen que `comanda.id_mesa`, `comanda.id_usuario` o `detalle.id_producto` pertenezcan a la misma cafetería.

### 4.2 Migraciones, en orden

| Migración | Qué hace |
|---|---|
| `20261020000000_esquema_inicial.sql` | Crea las 14 tablas, habilita RLS, inserta catálogos y crea `handle_new_user` + trigger `on_auth_user_created` |
| `20261021000000_politicas_rls.sql` | Políticas permisivas `USING (true)` para arrancar |
| `20261021000001_politicas_acceso.sql` | Crea `mi_id_cafeteria()` y `mi_id_rol()`; políticas de lectura propia y de equipo |
| `20261022000000_comanda_abierta_o_cerrada.sql` | La comanda pasa a ser la cuenta de la visita: `abierta/cerrada/cancelada`; índice único de una cuenta abierta por mesa; `fecha_creacion` en detalles |
| `20261022000001_rls_por_rol_y_cafeteria.sql` | Elimina políticas permisivas y crea las definitivas por rol/cafetería |
| `20261106000000_eliminar_empleado.sql` | RPC `eliminar_empleado` con validación de administrador y cafetería |
| `20261106000001_storage_productos.sql` | `producto.imagen_url` a `text`; bucket `productos` y políticas de Storage |
| `20261107000000_cocina_realtime.sql` | Agrega `comanda` y `detalle_comanda` a `supabase_realtime` |
| `20261107000001_detalle_solo_cuenta_abierta.sql` | Solo permite actualizar detalles si la comanda está abierta |
| `20261112000000_notificacion_realtime.sql` | Agrega `notificacion` a Realtime |
| `20261112000001_crear_comanda.sql` | Primera RPC `crear_comanda` (3 argumentos) |
| `20261113000000_comanda_tipo_servicio.sql` | Agrega `tipo_servicio` (`mesa`/`llevar`), `nombre_cliente` y check |
| `20261113000001_crear_comanda_servicio.sql` | `crear_comanda` de 5 argumentos con tipo y nombre |
| `20261113000002_cerrar_comanda.sql` | Primera `cerrar_comanda` (1 argumento) |
| `20261113000003_mesa_realtime.sql` | Agrega `mesa` a Realtime |
| `20261113000004_pago_entrega.sql` | Agrega pago/entrega, `crear_comanda` de 7 argumentos, `entregar_comanda` y `cerrar_comanda` de 2 argumentos |
| `20261114000000_notificacion_limpiar_leidas.sql` | Política DELETE para que cada usuario borre sus propias notificaciones leídas |

### 4.3 Funciones RPC

#### `crear_comanda(...)`

Firma final:

```sql
crear_comanda(
  p_id_comanda uuid,
  p_id_mesa uuid,
  p_detalles jsonb,
  p_tipo_servicio text DEFAULT 'mesa',
  p_nombre_cliente text DEFAULT NULL,
  p_pagado boolean DEFAULT false,
  p_metodo_pago text DEFAULT NULL
) RETURNS uuid
```

- `SECURITY INVOKER`, `search_path = ''`.
- Valida sesión (`mi_id_cafeteria()`), rol `1`/`2`, tipo de servicio, método de pago y que `p_detalles` sea un array no vacío.
- Para mesa:
  - exige `p_id_mesa`;
  - valida que sea de la cafetería y que no esté `apartada` (3) ni `inactiva` (4);
  - fuerza método de pago `NULL` porque se cobra al final.
- Para llevar:
  - exige `p_id_mesa` nulo;
  - exige nombre de cliente;
  - exige `p_pagado = true` y método de pago.
- Valida cada producto: debe existir, ser de la cafetería y estar activo.
- Usa `pg_advisory_xact_lock` por mesa o por comanda.
- Busca una comanda existente por `p_id_comanda`; si no, para mesa busca la comanda abierta de esa mesa con `FOR UPDATE`.
- Si no hay, inserta la cabecera con estado 1 y total 0; para llevar marca `pagado`, método y `fecha_pago`.
- Inserta cada detalle:
  - `precio_unitario` se toma del catálogo, no del cliente;
  - `id_estado` por defecto 2;
  - `tiempo_estimado` por defecto 15;
  - `ON CONFLICT (id_detalle) DO NOTHING`;
  - solo suma al total si la fila se insertó.
- Actualiza `comanda.total`.
- Si es mesa, marca la mesa como ocupada (estado 2).
- Devuelve el UUID de la comanda.

#### `entregar_comanda(p_id_comanda)`

- `SECURITY INVOKER`; roles 1/2.
- Valida que la comanda sea de la cafetería.
- Advisory lock por comanda.
- Pasa detalles de `3` (listo) a `4` (entregado).
- Actualiza `fecha_entrega` en la cabecera.
- Si es para llevar y ya no quedan detalles en 1/2/3, cierra la comanda (estado 2).
- Devuelve cuántos detalles entregó.

#### `cerrar_comanda(p_id_mesa, p_metodo_pago)`

- `SECURITY INVOKER`; roles 1/2.
- Valida método (`efectivo`, `tarjeta`, `transferencia`) y que la mesa sea de la cafetería.
- Advisory lock por mesa.
- Busca la comanda abierta (`id_estado = 1`) con `FOR UPDATE`; si no hay, `CUENTA_NO_ABIERTA`.
- Rechaza si hay detalles en 1/2 (`PEDIDOS_PENDIENTES`) o en 3 (`PEDIDOS_NO_ENTREGADOS`).
- Marca la comanda como cerrada, pagada, con método y `fecha_pago`.
- Libera la mesa (estado 1).
- Devuelve el UUID de la comanda.
- **No recalcula el total** desde los detalles.

#### `eliminar_empleado(p_id_usuario)`

- `SECURITY DEFINER`, `search_path = public, auth`.
- Exige que quien llama sea administrador (`mi_id_rol() = 1`), que no sea uno mismo y que el objetivo sea de su cafetería y no administrador.
- Borra `auth.users`; el perfil y sus comandas caen por cascade.

#### `handle_new_user()`

- `SECURITY DEFINER`, sin `SET search_path`.
- Se ejecuta `AFTER INSERT ON auth.users`.
- Busca el rol por `raw_user_meta_data->>'rol'`.
- Si es `administrador`, crea una cafetería con `nombre_cafeteria` y usa su UUID.
- Si no, toma `raw_user_meta_data->>'id_cafeteria'` y lo castea a UUID.
- Inserta el perfil en `public.usuario`.

No hay triggers para recalcular totales, sincronizar estados de mesa, crear notificaciones, validar transiciones o auditar cambios. Toda la consistencia depende de que el cliente use las RPC o de que las escrituras directas respeten las reglas.

### 4.4 RLS: qué puede hacer cada rol

Todas las políticas son **PERMISSIVE**: si cualquier política permite la fila, se permite. `service_role` y el propietario se saltan RLS.

| Tabla | Mesero | Cocina | Administrador |
|---|---|---|---|
| Catálogos (`role`, estados, tipos) | Lee | Lee | Lee |
| `usuario` | Lee y actualiza **su propia fila** | Igual | Lee a todo su equipo; puede borrar a otros; no puede actualizar el perfil de otros |
| `cafeteria` | Lee la suya | Lee la suya | Lee y edita la suya |
| `categoria` | Lee | Lee | CRUD en su cafetería |
| `producto` | Lee | Lee | CRUD en su cafetería |
| `mesa` | Lee y actualiza estado | Lee | CRUD en su cafetería |
| `comanda` | Lee; inserta; actualiza cualquier comanda de su cafetería | Lee; actualiza cualquier comanda de su cafetería | Lee; inserta; actualiza; borra |
| `detalle_comanda` | Lee; inserta/borra si la cuenta está abierta; actualiza si está abierta | Lee; actualiza si la cuenta está abierta | Lee; inserta/borra si está abierta; actualiza |
| `notificacion` | Lee las propias; inserta para cualquiera de su cafetería; actualiza y borra las propias (la app limita el borrado a las leídas) | Igual | Igual, y puede leer todas; no borra las ajenas |
| Storage `productos` | — | — | Sube/edita/borra en la carpeta de su cafetería |

Matices importantes:

- `usuario_editar_propio` permite actualizar **cualquier columna** de la propia fila, incluidos `id_rol` e `id_cafeteria`. Eso es una escalada de privilegios: un mesero puede cambiarse a administrador o moverse a otra cafetería si conoce el UUID.
- `comanda_actualizar` no comprueba rol ni estado: cualquier autenticado de la cafetería puede actualizar `total`, `pagado`, `metodo_pago`, `id_estado`, etc.
- `detalle_actualizar_cuenta_abierta` tampoco comprueba rol: cocina puede cambiar precio, cantidad, producto o estado de cualquier detalle mientras la cuenta esté abierta.
- `comanda_mesero_abre` permite insertar con cualquier `id_usuario`, `id_mesa`, `id_estado` y `total`, siempre que `id_cafeteria` coincida.
- No hay política para que un administrador actualice el perfil/rol de su equipo.
- `anon` solo tiene política de lectura en `role`; no ve el resto de tablas y no escribe.

### 4.5 Realtime

Tablas publicadas en `supabase_realtime`:

- `comanda`
- `detalle_comanda`
- `notificacion`
- `mesa`

Las migraciones agregan las tablas con comprobación previa en `pg_publication_tables`, así que son idempotentes respecto a la pertenencia.

Los clientes se suscriben con filtros:

- `comanda`: `id_cafeteria=eq.<id>`
- `notificacion`: `id_usuario=eq.<id>`
- `mesa`: `id_cafeteria=eq.<id>`
- `detalle_comanda`: sin filtro; se apoya en RLS porque la tabla no tiene `id_cafeteria`.

Realtime autoriza cada evento contra las políticas `SELECT` del suscriptor. Limitación de plataforma: RLS no se aplica a `DELETE`; con la identidad de réplica por defecto, el payload `old` solo lleva la PK. La app maneja `DELETE` de mesas con `payload.old.id_mesa`, pero no hay aislamiento completo en deletes cross-tenant.

### 4.6 Storage

- Bucket `productos`, público, límite 5 MiB.
- MIME permitidos: JPEG, PNG, WebP.
- Políticas:
  - lectura pública;
  - inserción/actualización/borrado solo administrador y solo dentro de la carpeta de su cafetería (`<id_cafeteria>/...`).
- La app sube la imagen y guarda la URL pública en `producto.imagen_url`.

### 4.7 Edge Function `registrar-empleado`

- Recibe `{ nombre, correo, contrasena, rol }`.
- Valida el `Authorization` del llamante con un cliente anon.
- Verifica en `public.usuario` que el llamante sea administrador (`id_rol = 1`).
- Usa un cliente con `service_role` para:

```ts
auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nombre, rol, id_cafeteria },
})
```

- El trigger `handle_new_user` crea el perfil.
- **La app no la invoca.** `src/lib/auth.ts` usa un cliente temporal con `signUp`; la función existe pero está pendiente de integrarse.

### 4.8 Seed

`supabase/seed.sql` crea:

- Cafetería `Orby Cafetería` con UUID fijo `00000000-0000-0000-0000-000000000001`.
- 11 mesas.
- 3 categorías: Bebidas, Comida, Postres.
- 10 productos.
- Un solo usuario local: `admin@orby.com` / `admin123`, con UUID fijo y rol administrador.

Los scripts `scripts/prueba-cocina.mjs` y `scripts/datos-prueba-cocina.sql` esperan además `mesero@orby.com`, `cocina@orby.com` y UUID fijos `2222…`/`3333…` que el seed actual **no crea**. En una base recién reseteada, esos scripts fallan.

---

## 5. Flujos de extremo a extremo

### 5.1 Arranque y login

```text
Splash → fuentes → providers → AuthProvider.restaurarSesion()
  ├─ sin sesión → /login
  ├─ sesión válida → perfil en public.usuario → rol
  └─ red caída → usuario cacheado → permite entrar
```

En `/login`:

```text
validar correo/contraseña
→ signInWithPassword
→ leer public.usuario
→ mapear id_rol a RolUsuario
→ AsyncStorage
→ router.replace('/(admin)' | '/(mesero)' | '/(cocina)')
```

### 5.2 Crear una comanda

**Mesa**

```text
Mesero elige mesa → new-order
→ agrega productos (carrito)
→ order-summary
→ RPC crear_comanda(tipo='mesa', pagado=false)
  → valida mesa/productos
  → reutiliza cuenta abierta si existe
  → inserta detalles con precio del catálogo
  → suma total
  → marca mesa ocupada
→ Realtime avisa a cocina
```

**Para llevar**

```text
Mesero elige “Para llevar” → nombre del cliente
→ agrega productos
→ elige método de pago
→ RPC crear_comanda(tipo='llevar', pagado=true, metodo_pago)
  → inserta cabecera pagada y detalles
→ VoucherModal
```

### 5.3 Ciclo de cocina

```text
Cocina ve comanda abierta
→ mueve detalle a “en preparación” (2)
→ mueve a “listo” (3)
   → cola crea notificación producto_listo (tipo 3)
→ Realtime notifica al mesero
→ Mesero ve “Pedido listo” y abre la cuenta
→ Mesero marca listos como entregados (3 → 4) con entregar_comanda
→ Cocina puede “Completar” la orden
   → todos los detalles pendientes pasan a 3
   → una notificación pedido_listo (tipo 1)
```

### 5.4 Cobro y cierre

```text
Mesero abre la cuenta
→ si hay listos, “Marcar productos listos como entregados”
→ cuando todos están entregados, “Cobrar y cerrar cuenta”
→ elige efectivo/tarjeta/transferencia
→ RPC cerrar_comanda(id_mesa, metodo)
  → valida que no haya detalles 1/2/3
  → marca comanda cerrada, pagada, fecha_pago
  → libera mesa
→ VoucherModal → compartir PDF
```

Para llevar, el cobro ocurre al crear la comanda; al entregar todos los productos, `entregar_comanda` cierra la comanda automáticamente.

### 5.5 Reporte del administrador

```text
Dashboard → “Descargar reporte”
→ elige día/semana/mes
→ verificarConexionServidor()
→ obtenerDatosReporte(idCafeteria, inicio, fin)
   → comandas cerradas (id_estado=2) por fecha_creacion
   → suma comanda.total
   → detalles en lotes de 100
→ generarHtmlReporte()
→ web: window.print()
→ nativo: Print.printToFileAsync + Sharing.shareAsync
```

### 5.6 Offline

| Contexto | Qué guarda | Cómo sincroniza |
|---|---|---|
| Catálogo | `@orby_cola_catalogo_<id>` | Al montar, al volver a `active` y al cambiar la cola; procesa en orden |
| Mesas | `@orby_cola_mesas_<id>` | Cada 12 s si hay pendientes, al volver a `active` y manualmente |
| Cocina | `@orby_cola_cocina_<id>` | Inmediato al encolar, al volver a `active`, cada 12 s si hay pendientes |
| Comandas | No se encolan | Si no hay red, `enviarComandaACocina` falla y conserva el carrito |
| Cobro | No se encola | Requiere conexión |

La cola de cocina es la más madura: snapshot + append para no perder operaciones concurrentes, CAS de estados, idempotencia de notificaciones y mensajes claros cuando la cuenta se cerró. Las colas de catálogo y mesas son más simples y tienen carreras de lectura/escritura.

---

## 6. Configuración y arranque

### 6.1 Comandos

```bash
pnpm install
pnpm db:start:lite     # Supabase local sin Studio/Storage/Edge Runtime
pnpm db:start          # Supabase completo
pnpm db:status         # URLs y llaves locales
pnpm start             # Expo
pnpm lint
pnpm typecheck
```

`db:start:lite` excluye `storage-api` y `edge-runtime`: no se pueden probar imágenes ni la Edge Function en ese modo.

### 6.2 Variables de entorno

`.env.example` define:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Solo URL y llave publishable. La llave secreta (`service_role`) nunca debe ir en la app.

Precedencia real de Expo: `.env.local` gana sobre `.env`. En este repo existe `.env.local` apuntando al proyecto en la nube; si sigues el README y copias `.env.example` a `.env`, la app seguirá apuntando a la nube. Además, `scripts/prueba-cocina.mjs` solo lee `.env`, no `.env.local`.

### 6.3 Configuración Expo

`app.json` define:

- `name: "Orby"`, `slug: "Orby"`, `scheme: "orby"`.
- `orientation: "portrait"`.
- `userInterfaceStyle: "automatic"`.
- `web.output: "server"`.
- Plugins: `expo-router`, `expo-splash-screen`, `expo-image-picker`, `expo-sharing`, `expo-font`, `expo-image`, `expo-status-bar`, `expo-web-browser`.
- Experimentos: `typedRoutes: true`, `reactCompiler: true`.

No hay `eas.json`, ni `ios.bundleIdentifier`, ni `android.package`, ni `extra.eas.projectId`. El proyecto usa CNG: no hay carpetas `ios/` ni `android/`; se generan con prebuild/EAS.

### 6.4 TypeScript y lint

- `tsconfig.json` extiende `expo/tsconfig.base`, con `strict: true` y alias:
  - `@/* → src/*`
  - `@/assets/* → assets/*`
- Excluye `supabase/functions` porque usa imports de Deno.
- ESLint 9 con flat config de `eslint-config-expo`; sin reglas propias ni Prettier.
- `expo-env.d.ts` es generado y no se versiona.

### 6.5 Scripts de prueba

- `scripts/prueba-cocina.mjs`:
  - prueba de integración contra Supabase local;
  - usa la misma lógica de `kitchen-network.ts`;
  - simula falta de red con un cliente al puerto 9;
  - prueba aislamiento por cafetería, permisos de cocina, notificaciones, cola offline, orden de operaciones, conflictos y cuenta cerrada.
- `scripts/datos-prueba-cocina.sql`:
  - crea datos visuales para cocina (mesas 4, 6 y 9, productos y comandas);
  - se ejecuta con `docker cp` + `psql` o en Studio.
- Ambos dependen de usuarios demo que el seed actual no crea. En una base limpia fallan.

---

## 7. Hallazgos y deuda técnica

### Crítico

1. **Escalada de privilegios por `usuario_editar_propio`.**
   Cualquier autenticado puede hacer:

   ```sql
   UPDATE public.usuario
      SET id_rol = 1,
          id_cafeteria = '<uuid>'
    WHERE id_usuario = auth.uid();
   ```

   Como `mi_id_rol()` y `mi_id_cafeteria()` leen esa fila, el cambio surte efecto inmediato en todas las políticas RLS.

2. **Registro público confiando en metadata.**
   `handle_new_user` usa `raw_user_meta_data->>'rol'` e `id_cafeteria` sin verificar invitación ni administrador. Con la llave publishable y `enable_signup = true`, se puede crear un administrador con cafetería propia o unirse como mesero/cocina a cualquier cafetería cuyo UUID se conozca. La Edge Function segura existe, pero no se usa.

3. **Escrituras directas demasiado amplias.**
   `comanda_actualizar` permite a cualquier autenticado de la cafetería modificar total, pago, estado, mesa o usuario. `detalle_actualizar_cuenta_abierta` permite a cocina cambiar precios, cantidades y estados. Las RPC son la vía “correcta”, pero PostgREST permite saltarlas.

### Alto

4. **El total no se recalcula.**
   `cerrar_comanda` cobra `comanda.total` almacenado. Borrar o cancelar un detalle directamente deja el total viejo; `crear_comanda` solo suma, nunca resta. No hay trigger de totales.

5. **Borrados en cascada destruyen historial.**
   `comanda.id_usuario` y `comanda.id_mesa` tienen `ON DELETE CASCADE`. Eliminar un empleado o una mesa borra sus comandas y detalles. `eliminar_empleado` no comprueba si hay cuentas abiertas.

6. **Reportes y estadísticas usan `fecha_creacion`, no `fecha_pago`.**
   Una cuenta abierta ayer y cobrada hoy se reporta ayer. Además, el reporte no pagina: `max_rows = 1000` en Supabase puede truncar un mes con muchas cuentas.

7. **Cortes de “hoy” inconsistentes.**
   Las estadísticas del catálogo usan límites UTC; las comandas del mesero y de cocina usan hora local. Los totales pueden no coincidir entre pantallas.

8. **Sin índices para consultas frecuentes.**
   Faltan índices en:
   - `comanda(id_cafeteria, id_estado, fecha_creacion)`
   - `comanda(id_usuario)`
   - `comanda(id_mesa)`
   - `mesa(id_cafeteria)`
   - `producto(id_cafeteria)`
   - `usuario(id_cafeteria)`
   - `detalle(id_producto)`
   - `notificacion(id_usuario, leida, fecha_creacion)`

### Medio

9. **Condiciones de carrera en colas de catálogo y mesas.**
   Leen la cola al inicio y escriben `restantes` al final; una operación encolada durante el proceso se pierde. `encolarOperacion` también es read-modify-write sin mutex.

10. **Errores no-red se descartan silenciosamente.**
    Un `UPDATE`/`DELETE` bloqueado por RLS devuelve 0 filas sin error y la operación se elimina de la cola. Un `INSERT` bloqueado devuelve 403 y también se descarta.

11. **`enviarComandaACocina` puede duplicar productos.**
    La RPC es idempotente para los mismos UUID, pero si el reintento agota los 3 intentos y el usuario vuelve a enviar, se generan UUID nuevos y se agregan líneas otra vez a la cuenta abierta.

12. **`crear_comanda` confía en `p_id_comanda` existente.**
    No valida que sea de la misma mesa, tipo o estado. También acepta `id_estado`, `tiempo_estimado` y `cantidad` enviados por el cliente.

13. **`entregar_comanda` no exige cuenta abierta.**
    Puede actualizar `fecha_entrega` de una comanda cerrada y devolver 0 entregados sin error.

14. **`OrdersProvider` global.**
    Cocina y admin también cargan comandas, notificaciones y abren canales de mesero; `CatalogProvider` carga catálogo y estadísticas para todos. Es trabajo innecesario y más superficie de error.

15. **Sin `onAuthStateChange` en `AuthProvider`.**
    La sesión no se invalida si el token se revoca o expira; `signOut` con `Promise.race` de 500 ms puede dejar la sesión persistida.

16. **Caché sin invalidación.**
    El mesero puede ver precios/disponibilidad viejos; no hay Realtime de `producto`/`categoria`. `recargarDesdeSupabase` puede sobrescribir la caché con listas vacías si RLS devuelve 0 filas.

17. **No hay tests automatizados ni EAS configurado.**
    `package.json` no tiene `test`, no hay `eas.json`, y las credenciales de build no están versionadas.

### Documentación

`docs/architecture.md` describe tres capas conceptuales, pero el código tiene cuatro capas runtime. Hay desfases:

- `docs/project-overview.md` dice que no hay registro público, pero existe `/registro`.
- `docs/data-model.md` no menciona `tipo_servicio`, `pagado`, `metodo_pago`, `fecha_pago` ni `fecha_entrega`.
- `docs/security.md` afirma que RLS quedó resuelto, pero siguen abiertos los puntos críticos anteriores.

---

## 8. Resumen

Orby es una app Expo/React Native que usa **Expo Router** para tres paneles por rol, **contextos con AsyncStorage** para estado y caché offline, **supabase-js** para hablar directo con **PostgREST/Auth/Realtime/Storage**, y **PostgreSQL** como fuente de verdad, donde las RPC (`crear_comanda`, `entregar_comanda`, `cerrar_comanda`, `eliminar_empleado`) y las políticas RLS implementan la lógica de negocio y el aislamiento por cafetería.

La arquitectura cubre el flujo completo:

- login y restauración de sesión;
- mesas y comandas;
- cocina en tiempo real;
- entrega y cobro;
- voucher y reportes;
- colas offline para catálogo, mesas y cocina.

Hoy tiene dos deudas mayores:

1. **El modelo de permisos permite escalada de privilegios y escrituras financieras directas.**
2. **La consistencia de totales e historial depende del cliente**, porque no hay triggers ni restricciones que la protejan.
