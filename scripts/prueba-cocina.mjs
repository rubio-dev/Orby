// PRUEBAS AUTOMÁTICAS DE COCINA (SOLO SUPABASE LOCAL)
//
// Cómo correrlo, desde la carpeta Orby y con Supabase local encendido (pnpm db:start):
//   node scripts/prueba-cocina.mjs
//
// Qué comprueba (muestra PASÓ o FALLÓ en cada caso):
//   1. Cocina ve las comandas abiertas de su cafetería y no las de otra.
//   2. Cocina puede cambiar el estado de un producto, pero no abrir cuentas ni crear productos.
//   3. Al marcar "listo" se crea el aviso para el mesero ('producto_listo'), y "Completar"
//      crea uno solo ('pedido_listo').
//   4. Un cambio hecho sin conexión queda en la cola y se aplica al reconectar, en orden,
//      sin pisar cambios ajenos y sin aplicarse si la cuenta ya se cerró.
//
// Usa la MISMA lógica de la cola que la app (src/lib/kitchen-network.ts; Node 22.18+ puede
// leer archivos .ts). Entra con los usuarios de supabase/seed.sql y SOLO con la llave pública
// del .env: nunca con la llave secreta. Para "otra cafetería" registra un administrador de
// prueba (admin-otra@ejemplo.com), que crea su propia cafetería al registrarse.
//
// Sus datos son aparte: una cuenta en la MESA 11 de la cafetería demo, un "Café de prueba
// (script)" en el menú y una cuenta en la cafetería de prueba. Los borra al terminar.
// No toca las cuentas de scripts/datos-prueba-cocina.sql.
//
// Para simular "sin conexión" usa un segundo cliente que apunta a un puerto cerrado
// (127.0.0.1:9): cada petición falla igual que sin internet, sin apagar tu Supabase.

import { createClient } from '@supabase/supabase-js';

// Node avisa que el .ts "no especifica su tipo de módulo"; es informativo y se oculta
process.removeAllListeners('warning');
process.on('warning', (aviso) => {
  if (aviso.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && aviso.name !== 'ExperimentalWarning') {
    console.warn(aviso.message);
  }
});

// CONFIGURACIÓN (.env)
try {
  process.loadEnvFile('.env');
} catch {
  console.error('No encontré el archivo .env. Corre el script desde la carpeta Orby: node scripts/prueba-cocina.mjs');
  process.exit(1);
}

const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const LLAVE = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

// Solo local: localhost o una IP de red privada (la de tu PC). Nunca supabase.co.
function esLocal(url) {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

if (!URL_SUPABASE || !LLAVE) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el .env.');
  process.exit(1);
}
if (URL_SUPABASE.includes('supabase.co') || !esLocal(URL_SUPABASE)) {
  console.error(`El .env apunta a ${URL_SUPABASE}. Estas pruebas solo corren contra tu Supabase LOCAL.`);
  process.exit(1);
}

const cola = await import('../src/lib/kitchen-network.ts');
const { ESTADO_DETALLE, TIPO_NOTIFICACION_PEDIDO_LISTO, TIPO_NOTIFICACION_PRODUCTO_LISTO } = cola;

// DATOS FIJOS
const CAFETERIA_DEMO = '00000000-0000-0000-0000-000000000001';
const MESERO_ID = '22222222-2222-2222-2222-222222222222';
const CATEGORIA_BEBIDAS = 'c0000000-0000-0000-0000-000000000001';
const PRODUCTO_PRUEBA = 'd0c10000-0000-0000-0000-0000000000f1';
const COMANDA_PRUEBA = 'd0c10000-0000-0000-0000-0000000000e1';
const COMANDA_OTRA = 'd0c10000-0000-0000-0000-0000000000e2';
const DETALLES = {
  d1: 'd0c10000-0000-0000-0000-0000000000d1',
  d2: 'd0c10000-0000-0000-0000-0000000000d2',
  d3: 'd0c10000-0000-0000-0000-0000000000d3',
};
const ADMIN_OTRA = { correo: 'admin-otra@ejemplo.com', contrasena: 'prueba123' };

// REINTENTOS (mismo comportamiento que con_reintentos de src/lib/auth.ts)
// No se puede importar ese archivo desde Node porque usa React Native; esta copia corta
// solo existe para las pruebas: 7000 ms por intento, 3 intentos, 0.8 s entre intentos.
const TIMEOUT_MS = 7000;
const INTENTOS = 3;
const PATRONES_RED = [
  'timeout_conexion', 'timeout', 'failed to fetch', 'network request failed', 'networkerror',
  'network error', 'fetch failed', 'econnrefused', 'connection refused', 'enotfound', 'socket',
  'econnreset', 'eai_again', 'failed to connect',
];

function esErrorDeRed(error) {
  if (!error) return false;
  const texto = `${error.message ?? error} ${error.name ?? ''} ${error.code ?? ''} ${error.details ?? ''}`.toLowerCase();
  return PATRONES_RED.some((p) => texto.includes(p));
}

async function conRed(operacion) {
  for (let intento = 1; intento <= INTENTOS; intento++) {
    let reloj;
    try {
      const limite = new Promise((_, rechazar) => {
        reloj = setTimeout(() => rechazar(new Error('TIMEOUT_CONEXION')), TIMEOUT_MS);
      });
      const res = await Promise.race([operacion(), limite]);
      clearTimeout(reloj);
      if (res && typeof res === 'object' && 'error' in res && esErrorDeRed(res.error)) {
        if (intento < INTENTOS) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return { resultado: null, fallo_red: true };
      }
      return { resultado: res, fallo_red: false };
    } catch (err) {
      clearTimeout(reloj);
      if (esErrorDeRed(err)) {
        if (intento < INTENTOS) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return { resultado: null, fallo_red: true };
      }
      throw err;
    }
  }
  return { resultado: null, fallo_red: true };
}

// RESULTADOS
let pasaron = 0;
let fallaron = 0;

function caso(nombre, ok, detalle = '') {
  if (ok) {
    pasaron++;
    console.log(`  PASÓ   ${nombre}`);
  } else {
    fallaron++;
    console.log(`  FALLÓ  ${nombre}${detalle ? `\n         → ${detalle}` : ''}`);
  }
}

function seccion(titulo) {
  console.log(`\n${titulo}`);
}

// CLIENTES
function nuevoCliente(url = URL_SUPABASE) {
  return createClient(url, LLAVE, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function entrar(correo, contrasena) {
  const cliente = nuevoCliente();
  const { error } = await cliente.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) throw new Error(`No se pudo entrar como ${correo}: ${error.message}`);
  return cliente;
}

// Entra como el administrador de la otra cafetería; si no existe, lo registra
async function entrarAdminOtra() {
  const cliente = nuevoCliente();
  const login = await cliente.auth.signInWithPassword({
    email: ADMIN_OTRA.correo,
    password: ADMIN_OTRA.contrasena,
  });
  if (!login.error) return cliente;

  const registro = await cliente.auth.signUp({
    email: ADMIN_OTRA.correo,
    password: ADMIN_OTRA.contrasena,
    options: {
      data: { rol: 'administrador', nombre: 'Admin de prueba', nombre_cafeteria: 'Cafetería de prueba (script)' },
    },
  });
  if (registro.error || !registro.data.session) {
    throw new Error(`No se pudo registrar ${ADMIN_OTRA.correo}: ${registro.error?.message ?? 'sin sesión'}`);
  }
  return cliente;
}

// Lee la comanda de prueba como la ve la cocina, ya convertida como en la app
async function leerComandaPrueba(cocina) {
  const { data, error } = await cocina
    .from('comanda')
    .select(cola.SELECT_COMANDA_COCINA)
    .eq('id_comanda', COMANDA_PRUEBA)
    .maybeSingle();
  if (error || !data) throw new Error(`La cocina no pudo leer la comanda de prueba: ${error?.message ?? 'no existe'}`);
  return cola.mapearComandaCocina(data);
}

async function estadoDetalle(cliente, id) {
  const { data } = await cliente.from('detalle_comanda').select('id_estado').eq('id_detalle', id).maybeSingle();
  return data ? Number(data.id_estado) : null;
}

// Simula una cola guardada sin conexión: se procesa con un cliente que no llega a ningún servidor
const clienteSinRed = nuevoCliente('http://127.0.0.1:9');

// PREPARACIÓN
async function preparar() {
  const admin = await entrar('admin@orby.com', 'admin123');
  const mesero = await entrar('mesero@orby.com', 'mesero123');
  const cocina = await entrar('cocina@orby.com', 'cocina123');
  const adminOtra = await entrarAdminOtra();

  // Restos de una corrida anterior (sus productos y avisos se borran en cascada)
  await admin.from('comanda').delete().eq('id_comanda', COMANDA_PRUEBA);
  await adminOtra.from('comanda').delete().eq('id_comanda', COMANDA_OTRA);

  // Producto de prueba (solo el administrador puede crear productos)
  const prod = await admin.from('producto').upsert({
    id_producto: PRODUCTO_PRUEBA,
    id_cafeteria: CAFETERIA_DEMO,
    id_categoria: CATEGORIA_BEBIDAS,
    nombre_producto: 'Café de prueba (script)',
    precio: 10,
    estado: true,
  });
  if (prod.error) throw new Error(`No se pudo crear el producto de prueba: ${prod.error.message}`);

  // Cuenta abierta en la mesa 11, abierta por el mesero, con 3 productos pendientes
  const mesa = await admin
    .from('mesa')
    .select('id_mesa')
    .eq('id_cafeteria', CAFETERIA_DEMO)
    .eq('num_mesa', 11)
    .single();
  if (mesa.error) throw new Error(`No encontré la mesa 11 de la cafetería demo: ${mesa.error.message}`);

  const abrir = await mesero.from('comanda').insert({
    id_comanda: COMANDA_PRUEBA,
    id_cafeteria: CAFETERIA_DEMO,
    id_mesa: mesa.data.id_mesa,
    id_usuario: MESERO_ID,
    id_estado: 1,
  });
  if (abrir.error) {
    throw new Error(
      `El mesero no pudo abrir la cuenta de prueba en la mesa 11: ${abrir.error.message}. ` +
        '¿Hay otra cuenta abierta en la mesa 11? Ciérrala y vuelve a correr.'
    );
  }

  const agregar = await mesero.from('detalle_comanda').insert([
    { id_detalle: DETALLES.d1, id_comanda: COMANDA_PRUEBA, id_producto: PRODUCTO_PRUEBA, cantidad: 1, precio_unitario: 10, especificaciones: 'Sin azúcar' },
    { id_detalle: DETALLES.d2, id_comanda: COMANDA_PRUEBA, id_producto: PRODUCTO_PRUEBA, cantidad: 2, precio_unitario: 10, especificaciones: null },
    { id_detalle: DETALLES.d3, id_comanda: COMANDA_PRUEBA, id_producto: PRODUCTO_PRUEBA, cantidad: 1, precio_unitario: 10, especificaciones: 'Con leche de avena' },
  ]);
  if (agregar.error) throw new Error(`El mesero no pudo agregar productos: ${agregar.error.message}`);

  // Cuenta abierta en la otra cafetería
  const { data: datosOtra } = await adminOtra.auth.getUser();
  const perfil = await adminOtra.from('usuario').select('id_cafeteria').eq('id_usuario', datosOtra.user.id).single();
  if (perfil.error) throw new Error(`No encontré el perfil del admin de prueba: ${perfil.error.message}`);
  const cafeteriaOtra = perfil.data.id_cafeteria;

  let mesaOtra = await adminOtra
    .from('mesa')
    .select('id_mesa')
    .eq('id_cafeteria', cafeteriaOtra)
    .eq('num_mesa', 1)
    .maybeSingle();
  if (!mesaOtra.data) {
    mesaOtra = await adminOtra
      .from('mesa')
      .insert({ id_cafeteria: cafeteriaOtra, num_mesa: 1, id_estado: 1 })
      .select('id_mesa')
      .single();
    if (mesaOtra.error) throw new Error(`No se pudo crear la mesa de la otra cafetería: ${mesaOtra.error.message}`);
  }

  const abrirOtra = await adminOtra.from('comanda').insert({
    id_comanda: COMANDA_OTRA,
    id_cafeteria: cafeteriaOtra,
    id_mesa: mesaOtra.data.id_mesa,
    id_usuario: datosOtra.user.id,
    id_estado: 1,
  });
  if (abrirOtra.error) throw new Error(`No se pudo abrir la cuenta de la otra cafetería: ${abrirOtra.error.message}`);

  return { admin, mesero, cocina, adminOtra };
}

async function limpiar({ admin, adminOtra }) {
  await admin?.from('comanda').delete().eq('id_comanda', COMANDA_PRUEBA);
  await admin?.from('producto').delete().eq('id_producto', PRODUCTO_PRUEBA);
  await adminOtra?.from('comanda').delete().eq('id_comanda', COMANDA_OTRA);
}

// PRUEBAS
async function probar({ mesero, cocina }) {
  const real = { supabase: cocina, conRed };
  const sinRed = { supabase: clienteSinRed, conRed };

  // 1. Lectura por cafetería
  seccion('1. Cocina ve las comandas abiertas de su cafetería y no las de otra');
  const abiertas = await cocina.from('comanda').select('id_comanda, id_cafeteria').eq('id_estado', 1);
  const ids = (abiertas.data ?? []).map((c) => c.id_comanda);
  caso('ve la cuenta abierta de su cafetería (mesa 11)', !abiertas.error && ids.includes(COMANDA_PRUEBA), abiertas.error?.message);
  caso('no ve la cuenta abierta de la otra cafetería', !ids.includes(COMANDA_OTRA));
  caso(
    'todas las cuentas que ve son de su cafetería',
    (abiertas.data ?? []).every((c) => c.id_cafeteria === CAFETERIA_DEMO)
  );
  const directa = await cocina.from('comanda').select('id_comanda').eq('id_comanda', COMANDA_OTRA);
  caso('ni pidiéndola por su id ve la cuenta de la otra cafetería', (directa.data ?? []).length === 0);

  // 2. Permisos de cocina
  seccion('2. Cocina cambia el estado de un producto, pero no abre cuentas ni crea productos');
  const cambio = await cocina
    .from('detalle_comanda')
    .update({ id_estado: ESTADO_DETALLE.en_preparacion })
    .eq('id_detalle', DETALLES.d1)
    .select('id_detalle');
  caso(
    'marca un producto "en preparación" (1 fila actualizada)',
    !cambio.error && (cambio.data ?? []).length === 1,
    cambio.error?.message ?? `${(cambio.data ?? []).length} filas`
  );

  const { data: mesa10 } = await cocina.from('mesa').select('id_mesa').eq('num_mesa', 10).eq('id_cafeteria', CAFETERIA_DEMO).single();
  const abrir = await cocina.from('comanda').insert({
    id_cafeteria: CAFETERIA_DEMO,
    id_mesa: mesa10?.id_mesa,
    id_usuario: '33333333-3333-3333-3333-333333333333',
    id_estado: 1,
  });
  caso('NO puede abrir una cuenta (RLS la rechaza)', !!abrir.error, 'la cuenta se abrió');
  if (!abrir.error) await cocina.from('comanda').delete().eq('id_mesa', mesa10?.id_mesa).eq('id_estado', 1);

  const producto = await cocina.from('producto').insert({
    id_cafeteria: CAFETERIA_DEMO,
    id_categoria: CATEGORIA_BEBIDAS,
    nombre_producto: 'No debería existir',
    precio: 1,
  });
  caso('NO puede crear productos del menú (RLS lo rechaza)', !!producto.error, 'el producto se creó');

  // 3. Avisos al mesero
  seccion('3. Al marcar "listo" se crea el aviso para el mesero');
  let comanda = await leerComandaPrueba(cocina);
  const d1 = comanda.detalles.find((d) => d.id_detalle === DETALLES.d1);
  const opsListo = cola.crearOperacionesCambioEstado(comanda, d1, ESTADO_DETALLE.listo);
  const rListo = await cola.procesarCola(opsListo, real);
  caso(
    'el cambio y el aviso se envían (2 aplicadas, cola vacía)',
    rListo.aplicadas.length === 2 && rListo.restantes.length === 0,
    JSON.stringify({ aplicadas: rListo.aplicadas.length, descartadas: rListo.descartadas.map((d) => d.mensaje) })
  );
  caso('el producto quedó "listo" en la base', (await estadoDetalle(cocina, DETALLES.d1)) === ESTADO_DETALLE.listo);

  const idAviso = opsListo.find((op) => op.tipo === 'notificacion').id_notificacion;
  const aviso = await mesero.from('notificacion').select('id_tipo, id_usuario, leida').eq('id_notificacion', idAviso).maybeSingle();
  caso(
    'el mesero recibe un aviso "producto_listo" (tipo 3) sin leer',
    aviso.data?.id_tipo === TIPO_NOTIFICACION_PRODUCTO_LISTO && aviso.data?.id_usuario === MESERO_ID && aviso.data?.leida === false,
    aviso.error?.message ?? JSON.stringify(aviso.data)
  );

  // Reintentar lo mismo (como si el primer intento hubiera llegado tras el timeout) no duplica nada
  const rRepetido = await cola.procesarCola(opsListo, real);
  const avisosIguales = await mesero.from('notificacion').select('id_notificacion').eq('id_notificacion', idAviso);
  caso(
    'reenviar el mismo cambio no duplica el aviso ni falla',
    rRepetido.aplicadas.length === 2 && (avisosIguales.data ?? []).length === 1,
    JSON.stringify({ aplicadas: rRepetido.aplicadas.length, descartadas: rRepetido.descartadas.map((d) => d.mensaje) })
  );

  comanda = await leerComandaPrueba(cocina);
  const opsCompletar = cola.crearOperacionesCompletarComanda(comanda);
  const rCompletar = await cola.procesarCola(opsCompletar, real);
  const avisosCompletar = await mesero
    .from('notificacion')
    .select('id_tipo')
    .eq('id_comanda', COMANDA_PRUEBA)
    .eq('id_tipo', TIPO_NOTIFICACION_PEDIDO_LISTO);
  caso(
    '"Completar" marca los 2 productos que faltaban como listos',
    rCompletar.descartadas.length === 0 &&
      (await estadoDetalle(cocina, DETALLES.d2)) === ESTADO_DETALLE.listo &&
      (await estadoDetalle(cocina, DETALLES.d3)) === ESTADO_DETALLE.listo,
    JSON.stringify(rCompletar.descartadas.map((d) => d.mensaje))
  );
  caso(
    '"Completar" manda UN solo aviso "pedido_listo" (tipo 1)',
    (avisosCompletar.data ?? []).length === 1,
    `${(avisosCompletar.data ?? []).length} avisos`
  );

  // 4. Cola sin conexión
  seccion('4. Un cambio hecho sin conexión queda en la cola y se aplica al reconectar');
  comanda = await leerComandaPrueba(cocina);
  const d2 = comanda.detalles.find((d) => d.id_detalle === DETALLES.d2);
  const opsSinRed = cola.crearOperacionesCambioEstado(comanda, d2, ESTADO_DETALLE.en_preparacion);
  const rSinRed = await cola.procesarCola(opsSinRed, sinRed);
  caso(
    'sin conexión la cola se detiene y guarda el cambio',
    rSinRed.detenida === 'red' && rSinRed.restantes.length === opsSinRed.length && rSinRed.aplicadas.length === 0
  );
  caso('sin conexión la base no cambia', (await estadoDetalle(cocina, DETALLES.d2)) === ESTADO_DETALLE.listo);
  caso('la franja contaría 1 cambio pendiente', cola.contarCambiosPendientes(rSinRed.restantes) === 1);

  const rReconectar = await cola.procesarCola(rSinRed.restantes, real);
  caso(
    'al reconectar el cambio se aplica y la cola queda vacía',
    rReconectar.aplicadas.length === 1 && rReconectar.restantes.length === 0 &&
      (await estadoDetalle(cocina, DETALLES.d2)) === ESTADO_DETALLE.en_preparacion,
    JSON.stringify(rReconectar.descartadas.map((d) => d.mensaje))
  );

  // Orden: dos cambios seguidos al mismo producto, sin conexión
  comanda = await leerComandaPrueba(cocina);
  let d3 = comanda.detalles.find((d) => d.id_detalle === DETALLES.d3);
  const primero = cola.crearOperacionesCambioEstado(comanda, d3, ESTADO_DETALLE.en_preparacion);
  d3 = { ...d3, id_estado: ESTADO_DETALLE.en_preparacion }; // Lo que vería la cocina en pantalla
  const segundo = cola.crearOperacionesCambioEstado(comanda, d3, ESTADO_DETALLE.listo);
  const colaOrden = [...primero, ...segundo];
  const rOrdenSinRed = await cola.procesarCola(colaOrden, sinRed);
  const rOrden = await cola.procesarCola(rOrdenSinRed.restantes, real);
  caso(
    'dos cambios seguidos se envían en orden (listo → en preparación → listo)',
    rOrden.aplicadas.length === 3 && rOrden.descartadas.length === 0 &&
      (await estadoDetalle(cocina, DETALLES.d3)) === ESTADO_DETALLE.listo,
    JSON.stringify(rOrden.descartadas.map((d) => d.mensaje))
  );

  // No pisa cambios ajenos: la cocina cambia sin conexión y mientras tanto el mesero entrega
  comanda = await leerComandaPrueba(cocina);
  const d1b = comanda.detalles.find((d) => d.id_detalle === DETALLES.d1);
  const opsConflicto = cola.crearOperacionesCambioEstado(comanda, d1b, ESTADO_DETALLE.en_preparacion);
  const rConflictoSinRed = await cola.procesarCola(opsConflicto, sinRed);
  await mesero.from('detalle_comanda').update({ id_estado: ESTADO_DETALLE.entregado }).eq('id_detalle', DETALLES.d1);
  const rConflicto = await cola.procesarCola(rConflictoSinRed.restantes, real);
  caso(
    'no pisa un cambio ajeno: el producto sigue "entregado" y se avisa',
    rConflicto.descartadas[0]?.motivo === 'conflicto' &&
      (await estadoDetalle(cocina, DETALLES.d1)) === ESTADO_DETALLE.entregado,
    JSON.stringify(rConflicto.descartadas.map((d) => d.motivo))
  );
  if (rConflicto.descartadas[0]) console.log(`         mensaje: ${rConflicto.descartadas[0].mensaje}`);

  // Cuenta cerrada mientras no había conexión
  comanda = await leerComandaPrueba(cocina);
  const d2b = comanda.detalles.find((d) => d.id_detalle === DETALLES.d2);
  const opsCerrada = cola.crearOperacionesCambioEstado(comanda, d2b, ESTADO_DETALLE.listo);
  const rCerradaSinRed = await cola.procesarCola(opsCerrada, sinRed);
  await mesero.from('comanda').update({ id_estado: 2 }).eq('id_comanda', COMANDA_PRUEBA);
  const rCerrada = await cola.procesarCola(rCerradaSinRed.restantes, real);
  const idAvisoCerrada = opsCerrada.find((op) => op.tipo === 'notificacion').id_notificacion;
  const avisoCerrada = await mesero.from('notificacion').select('id_notificacion').eq('id_notificacion', idAvisoCerrada);
  caso(
    'si la cuenta ya se cerró, el cambio no se aplica',
    rCerrada.descartadas[0]?.motivo === 'cuenta_cerrada' &&
      (await estadoDetalle(cocina, DETALLES.d2)) === ESTADO_DETALLE.en_preparacion,
    JSON.stringify(rCerrada.descartadas.map((d) => d.motivo))
  );
  caso('…y tampoco se manda su aviso al mesero', (avisoCerrada.data ?? []).length === 0);
  if (rCerrada.descartadas[0]) console.log(`         mensaje: ${rCerrada.descartadas[0].mensaje}`);

  // La base también lo impide (detalle_actualizar_cuenta_abierta), aunque la app fallara
  const directoCerrada = await cocina
    .from('detalle_comanda')
    .update({ id_estado: ESTADO_DETALLE.listo })
    .eq('id_detalle', DETALLES.d2)
    .select('id_detalle');
  caso(
    'la base deja en 0 filas un cambio directo a una cuenta cerrada',
    !directoCerrada.error && (directoCerrada.data ?? []).length === 0,
    directoCerrada.error?.message ?? `${(directoCerrada.data ?? []).length} filas`
  );
}

// PRINCIPAL
console.log(`Pruebas de cocina contra ${URL_SUPABASE}`);
let clientes = {};
try {
  clientes = await preparar();
  await probar(clientes);
} catch (err) {
  fallaron++;
  console.log(`\n  FALLÓ  No se pudo completar la prueba: ${err.message}`);
  if (esErrorDeRed(err)) console.log('         ¿Está encendido Supabase local? Corre pnpm db:status.');
} finally {
  await limpiar(clientes).catch(() => {});
}

console.log(`\nResultado: ${pasaron} pasaron, ${fallaron} fallaron.`);
process.exit(fallaron > 0 ? 1 : 0);
