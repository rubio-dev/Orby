# Modelo de datos (conceptual)

> **Responsable:** el compañero a cargo de la base de datos.
> Este documento describe *qué información* maneja Orby, no las tablas finales. El esquema real va en `supabase/migrations/`.

## Catálogo

**Menú**: platillos, bebidas y postres.

- Nombre
- Precio
- Descripción
- Categoría (bebidas, comida, postres)
- Imagen
- Disponibilidad: activo o inactivo. Lo controla el administrador y define lo que ve el mesero.

**Mesas**

- Número
- Estado: libre, ocupada o apartada

## Usuarios y accesos

**Perfiles de empleados**

- Nombre
- Correo
- Contraseña
- Rol: mesero, cocina o administrador

> **Nota técnica:** con Supabase, el correo y la contraseña los guarda **Auth** (tabla interna `auth.users`, con la contraseña cifrada). El perfil propio solo necesita el nombre y el rol, ligados al usuario de Auth. La contraseña nunca se guarda en una tabla nuestra.

## Flujo operativo

**Cabecera de la orden**

- Mesa
- Mesero que la tomó
- Fecha y hora

**Detalle de la orden**

- Productos
- Cantidad
- Especificaciones, por ejemplo "sin cebolla"

**Estados de la orden**, que cambia cocina: `pendiente → en preparación → listo`

> **Observación:** según el flujo de cocina, también hay **estado y tiempo estimado por producto**, no solo por orden. Ver [open-questions](open-questions.md).

## Estadísticos

- Ingresos brutos diarios, mensuales y anuales
- Ranking de platillos más vendidos, filtrable por periodo

> **Observación:** en principio estos datos se pueden **calcular** a partir de las órdenes con consultas o vistas, en vez de guardarse en tablas aparte. Lo decide el responsable de la base de datos.
