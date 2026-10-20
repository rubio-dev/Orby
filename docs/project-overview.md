# Descripción del proyecto

## Qué problema resuelve

En una cafetería o restaurante pequeño, la comanda tradicional en papel genera tres fricciones constantes:

1. **El mesero tiene que ir hasta la cocina** para entregar el pedido.
2. **La cocina no tiene cómo avisar que algo está listo** sin gritar o salir al salón.
3. **La administración no sabe qué se vende** hasta que alguien suma los tickets al cierre.

Orby ataca esos tres puntos con una sola aplicación móvil en la que salón, cocina y administración ven la misma información al mismo tiempo.

## Roles

### Mesero

- **Panel de inicio:** indicadores del turno (mesas activas, pedidos del día y tiempo promedio de atención) y tres accesos directos: tomar pedido, ver mesas y ver menú.
- **Mesas:** cuadrícula con el estado de cada mesa (libre, ocupada o apartada). El estado se cambia con un selector emergente.
- **Tomar pedido:**
  1. Elige la mesa.
  2. Navega el menú por categorías (bebidas, comida, postres).
  3. Agrega productos con sus especificaciones, por ejemplo "sin cebolla".
  4. Revisa el detalle con el total antes de enviarlo a cocina.
- **Notificaciones:** una bandeja que solo avisa de pedidos listos, con la mesa y el tiempo transcurrido.

### Cocina / barra

- **Panel de inicio:** replica los indicadores operativos y da entrada a la lista de comandas.
- **Comandas:** separadas en pestañas, "en preparación" y "listos". Cada comanda muestra la mesa, los productos con sus cantidades y el tiempo que lleva esperando.
- **Detalle de comanda:** el cocinero puede:
  - Marcar cada producto como en preparación o listo.
  - Asignar un tiempo estimado por producto.
  - Leer las especificaciones del cliente.
  - Cerrar la orden completa.
- **Historial** de comandas.

### Administrador

- **Panel de inicio:** ventas totales del día y número de pedidos, con su variación porcentual, una tabla de productos más vendidos y un botón para descargar el reporte.
- **Menú:** gestión del catálogo.
  - Buscar productos.
  - Activarlos o desactivarlos con un interruptor. Esto controla qué productos ve disponibles el mesero.
  - Dar de alta productos nuevos con imagen, nombre, precio, categoría, descripción y estado.

### Pantalla compartida

Los tres roles tienen una pantalla de **perfil** donde consultan su correo y cambian su contraseña.

## Flujo operativo

1. **Autenticación y redirección por rol.** El usuario entra con correo y contraseña. El backend valida su perfil y lo manda automáticamente al panel que le corresponde. **No hay registro público:** las cuentas las crea el administrador.
2. **Ciclo de la comanda.** El mesero actualiza el estado de la mesa, arma el carrito con especificaciones y lo envía. La comanda llega al instante al panel de cocina.
3. **Preparación y despacho.** Cocina ve la comanda con su cronómetro, asigna tiempos estimados y actualiza estados. Al marcarla como "listo" se dispara la notificación al mesero, que entrega el pedido al cliente.
4. **Gestión administrativa.** En paralelo, la administración monitorea ingresos, ajusta el catálogo y genera reportes.
