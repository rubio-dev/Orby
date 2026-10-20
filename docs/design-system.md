# Sistema de diseño

**Fuente:** [`docs/design/mockups.html`](design/mockups.html), con 16 pantallas de 390 × 844 px. Es el **diseño principal** de Orby.

La apariencia se define con dos ejes independientes:

- **Tema:** la identidad visual, Orby o Miami.
- **Modo:** claro u oscuro. Por defecto sigue el ajuste del teléfono ("Sistema"), pero se puede forzar.

| | Claro | Oscuro |
|---|---|---|
| **Orby** (principal) | El del mockup: verde azulado sobre gris claro | Gris verdoso oscuro con verde aclarado (`#4FB89E`) y texto oscuro encima |
| **Miami** (inspirado en Vice City / GTA VI) | "Miami de día": fondo rosado claro, rosa intenso `#D6246E` con texto blanco | "Miami de noche": morado noche, rosa neón `#FF3E9A` con texto oscuro |

Las 4 paletas pasan todos los contrastes del laboratorio. Solo Orby claro sale del mockup; las otras 3 son propuestas, falta aprobarlas.

Las pantallas usan **tokens semánticos** (`primary`, `surface`, `danger`, etc.) y nunca colores directos. Así, cambiar de tema o de modo solo cambia los valores.

## En el código

| Archivo | Contenido |
|---|---|
| `src/theme/tokens.ts` | Lo común a todos los temas: espaciado, radios, medidas táctiles, fuentes y variantes tipográficas |
| `src/theme/themes.ts` | Las paletas de cada tema (`paletas.claro` y `paletas.oscuro`). El tipo `ColoresTema` obliga a que las 4 paletas definan los mismos tokens |
| `src/theme/theme-provider.tsx` | `TemaProvider` y el hook `useTema()` |
| `src/theme/index.ts` | Punto de entrada: todo se importa desde `@/theme` |

`useTema()` devuelve:

| Campo | Qué es |
|---|---|
| `colores` | La paleta lista para usar, según el tema y el modo efectivo. **Es lo que usan casi todos los componentes** |
| `tema` | El tema activo (nombre y etiqueta) |
| `modo` | El modo efectivo: `'claro'` u `'oscuro'` |
| `preferencia_modo` | Lo que eligió el usuario: `'sistema'`, `'claro'` u `'oscuro'` |
| `cambiar_tema(nombre)` / `cambiar_modo(preferencia)` | Para cambiarlos |

```tsx
import { tipografia, useTema } from '@/theme';

const { colores } = useTema();
<Text style={[tipografia.titulo, { color: colores.text }]}>Mesa 4</Text>
```

**Reglas:**

- Nunca escribir un color en hexadecimal dentro de una pantalla o componente. Si falta un color, se agrega como token en **las 4 paletas**.
- Los colores salen de `useTema()`. Las medidas y la tipografía se importan directo de los tokens.
- Por ahora el tema y el modo viven en memoria: al reiniciar la app vuelven a Orby y al modo del sistema.

## Laboratorio visual

Es una ruta de la app, **`/lab`**, que **solo existe en desarrollo**: en un build de producción redirige al inicio. Se abre desde el botón "Abrir laboratorio" de la pantalla de inicio.

Ahí se revisa cada pieza del sistema de diseño en los 2 temas y los 2 modos **antes** de usarla en una pantalla real. Arriba hay dos selectores: tema (Orby o Miami) y modo (Sistema, Claro u Oscuro).

- **Colores:** todas las muestras, agrupadas.
- **Contrastes:** los pares de texto sobre fondo que usa el diseño, calculados en vivo. Marca ✗ si un par no alcanza el mínimo WCAG (4.5 para texto normal, 3 para texto grande o elementos gráficos).
- **Tipografía:** todas las variantes, con texto real de la app.

El código vive en `src/app/lab/` (la ruta) y `src/lab/` (las secciones). Cada componente nuevo se agrega primero como una sección del laboratorio.

---

## Tokens del tema Orby

Valores extraídos del mockup.

### Color

| Token | Valor | Uso en el mockup |
|---|---|---|
| `background` | `#F4F6F5` | Fondo de las pantallas internas |
| `background_auth` | `#EEF4F2` | Fondo de bienvenida y login |
| `surface` | `#FFFFFF` | Tarjetas, barras inferiores, inputs |
| `surface_muted` | `#EFF2F1` | Inputs de solo lectura |
| `placeholder` | `#E6EAE8` | Miniatura de producto sin imagen, pista de barras |
| `primary` | `#2F7D6B` | Botón principal, tab activa, switch encendido, barras de ranking |
| `on_primary` | `#FFFFFF` | Texto sobre `primary` (contraste 4.92) |
| `primary_strong` | `#1F5A4C` | Precios, totales, texto sobre fondos suaves |
| `primary_soft` | `#DCEBE6` | Tab inactiva, etiqueta de rol, botón de carrito |
| `primary_subtle` | `#E6EEEB` | Aviso informativo ("Tienes 3 pedidos listos…") |
| `avatar` | `#CFDFD9` | Círculo del avatar |
| `border` | `#DDE2E0` | Borde de tarjetas e inputs |
| `border_strong` | `#C8D5D0` | Botón secundario, selects |
| `border_dashed` | `#B9C2BF` | Zona para subir imagen, mesa libre |
| `divider` | `#EEF1F0` | Separador entre filas |
| `text` | `#1A1D1C` | Texto principal |
| `text_secondary` | `#4F5553` | Etiquetas y subtítulos |
| `text_muted` | `#6B7270` | Descripciones y ayudas (contraste 4.92) |
| `text_subtle` | `#8A918E` | Posición en el ranking (contraste 3.22: solo para números o texto grande) |
| `danger` | `#B3261E` | Mesa ocupada, cerrar sesión, campo obligatorio `*`, contador de avisos |
| `danger_soft` / `danger_border` | `#FBE7E5` / `#E3ADA8` | Opción "Ocupada", botón de cerrar sesión |
| `warning` | `#8A5A00` | Mesa apartada, alerta de comanda atrasada |
| `warning_soft` / `warning_border` | `#F7EDD8` / `#D8C08A` | Opción "Apartada", aviso de cocina |
| `info` / `info_soft` / `info_border` | `#1F5A4C` / `#E6EEEB` / `#CFDFD9` | Aviso informativo. En Orby coincide con el verde; en Miami es cian |
| `overlay` | `#0E1413` al 42 % | Fondo detrás de los diálogos |

### Tipografía

- **Títulos:** **Josefin Sans Light** (300) para `display` (34 px), `titulo` (22 px) y `cifra` (28 px). Regla: la fuente delgada solo en 20 px o más.
- **Texto e interfaz:** **Plus Jakarta Sans**, pesos 400 (cuerpo y detalle), 500 (etiquetas), 600 (botones y nombres de producto) y 700.
- **Tamaños usados:** 11, 12, 13, 14, 15, 16, 17, 20, 24 y 30 px.
- **En el mockup**, los títulos de pantalla eran Inter de 20 px en peso 700 y las cifras de 23–24 px en peso 700. Se reemplazaron por Josefin Sans Light, más grande.

### Forma y medidas

- **Radios:** 8 (selects pequeños), 10 (inputs y miniaturas), 12 (tarjetas y botones), 14 (mesas), 18 (diálogos) y 999 (pastillas).
- **Áreas táctiles:** mínimo 44 px. Inputs de 46–48 px, botón principal de 52–54 px, accesos rápidos de 60 px y el botón "Comandas" de cocina de 76 px.
- **Márgenes de pantalla:** 20 px a los lados.
- **Iconos:** de trazo, 1.8 px de grosor, 20–22 px de tamaño, extremos redondeados.

---

## Tema Miami (propuesta)

Inspirado en la estética de Vice City: noche morada, rosa neón, atardecer naranja y cian. Los contrastes ya están calculados contra la superficie (`surface`).

La tabla de abajo es el **modo oscuro** ("Miami de noche"). El modo claro ("Miami de día") usa un rosa más profundo, `#D6246E`, para que el texto blanco encima sea legible (4.84). Sus valores completos están en `src/theme/themes.ts`. Orby oscuro está en el mismo archivo.

| Token | Valor | Contraste | Nota |
|---|---|---|---|
| `background` | `#1A1033` | — | Morado noche |
| `surface` | `#251845` | — | Tarjetas |
| `surface_muted` | `#2F2055` | — | |
| `border` / `border_strong` | `#3D2C66` / `#5A4390` | — | |
| `text` | `#FFF5FA` | 15.20 | |
| `text_secondary` | `#C9B8E8` | 8.88 | |
| `text_muted` | `#9A86C2` | 5.07 | |
| `primary` | `#FF3E9A` | 4.95 | Rosa neón |
| `on_primary` | `#1A1033` | 5.50 | **Texto oscuro** sobre rosa: el blanco solo da 3.28 y no alcanza |
| `primary_strong` | `#FF7AB8` | 6.74 | Precios y totales |
| `text_subtle` | `#8B78B5` | 4.21 | |
| `info` / `info_soft` | `#2DE2E6` / `#12324A` | 10.14 / 8.31 sobre su fondo suave | Cian (mesa libre, avisos informativos) |
| `danger` / `danger_soft` | `#FF5C5C` / `#4A1A2A` | 5.36 / 4.71 sobre su fondo suave | |
| `warning` / `warning_soft` | `#FFC145` / `#3D2E1A` | 10.01 / 8.08 sobre su fondo suave | |

La lista completa está en `src/theme/themes.ts`. El naranja de atardecer (`#FF9A3D`) quedó fuera por ahora: ningún token lo necesita todavía.

**Puntos de diseño pendientes:**

- **Estados de mesa.** El rosa (`primary`) y el rojo de "Ocupada" (`danger`) se parecen. Propuesta: libre en cian, ocupada en rojo y apartada en ámbar, y además texto dentro de la mesa, para no depender solo del color.
- **Marca.** Usamos una paleta *inspirada en* GTA VI, pero no logotipos, tipografías, nombres ni imágenes de Rockstar. En la app el tema se llama solo "Miami".

---

## Componentes

**Estado actual:** ya están listos los tokens, los dos temas y el laboratorio. **Todavía no hay ningún componente.** Antes de construir el primero falta elegir la librería (ver [open-questions](open-questions.md#interfaz)).

Inventario sacado del mockup. Los nombres de archivo van en inglés.

### Base

| Componente | Variantes o detalles | Dónde aparece |
|---|---|---|
| `Button` | primario, secundario (borde), peligro (borde rojo), punteado, texto | En casi todas las pantallas |
| `TextField` | etiqueta, obligatorio `*`, contraseña con botón de mostrar, solo lectura, búsqueda con ícono | Login, Mi cuenta, Agregar producto, Catálogo |
| `TextArea` | contador `0 / 200` | Agregar producto |
| `Select` | mesa, categoría, tiempo estimado | Nuevo pedido, Agregar producto, Detalle de comanda |
| `Switch` | con etiqueta debajo ("Disponible") o en fila con descripción | Catálogo, Agregar producto |
| `Badge` | contador (rojo o verde), estado, rol | Barra inferior, carrito, notificaciones, Mi cuenta |
| `Card` | blanca, con borde, radio 12 | Base de casi todas las filas |
| `Avatar` | círculo con ícono, 54, 60 o 104 px | Inicios y Mi cuenta |
| `Banner` | informativo (verde) o advertencia (ámbar) | Inicio de mesero e inicio de cocina |
| `Icon` | íconos de trazo del mockup | Toda la app |

### Estructura

| Componente | Detalles | Dónde aparece |
|---|---|---|
| `ScreenHeader` | botón de volver, título y subtítulo opcional | Pantallas internas |
| `BottomNav` | Inicio, Avisos (con contador), Perfil, Salir | Pantallas principales de cada rol |
| `SegmentedTabs` | dos pastillas | Menú/Favoritos, En preparación/Listos, Productos/Categorías |
| `CategoryChips` | fila de pastillas | Menú, Nuevo pedido |
| `BottomActionBar` | barra fija abajo con total y botón | Detalle del pedido, Detalle de comanda, Agregar producto |
| `Dialog` | fondo oscuro y tarjeta centrada | Cambiar estado de mesa |

### De dominio

| Componente | Detalles | Dónde aparece |
|---|---|---|
| `StatTile` | etiqueta, cifra, unidad y variación ("17 % vs ayer") | Inicios de los 3 roles |
| `QuickAction` | botón grande con ícono | Inicio de mesero, Inicio de cocina |
| `TableTile` + `TableLegend` | número y estado, color por estado | Mesas, Cambiar estado |
| `ProductRow` | miniatura, nombre, detalle y acción a la derecha (precio, botón de agregar o switch) | Menú, Nuevo pedido, Catálogo |
| `CartLine` | producto, cantidad, especificación y precio | Detalle del pedido |
| `OrderTicket` | mesa, productos, espera y borde izquierdo de color según la espera | Comandas |
| `OrderItemCard` | tiempo estimado y botones En preparación / Listo | Detalle de comanda |
| `NotificationRow` | ícono, título, mesa, tiempo y etiqueta | Notificaciones |
| `TopProductsList` | posición, nombre, barra de progreso y cantidad | Inicio del administrador |
| `ImagePickerBox` | zona punteada "Agregar imagen" | Agregar producto |

---

## Diferencias entre el mockup y la descripción del proyecto

Están anotadas en [open-questions.md](open-questions.md#diseño).
