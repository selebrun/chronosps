#!/usr/bin/env node

/**
 * Ejecuta una creación en Odoo (modelo x_acciones_remotas)
 * Uso:
 * node odoo_remote_action.js \
 *   --url https://tuodoo.com \
 *   --db tu_db \
 *   --user usuario@empresa.com \
 *   --key API_KEY \
 *   --company 1 \
 *   --workorder 123 \
 *   --production 456 \
 *   --action bloquear \
 *   --reason "Falla de máquina"
 */

const xmlrpc = require('xmlrpc');

// --------------------
// Parseo simple de args
// --------------------
function getArg(name, def = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}

// --------------------
// Configuración
// --------------------
const URL = getArg('url');
const DB = getArg('db');
const USER = getArg('user');
const KEY = getArg('key'); // API Key recomendada
const COMPANY_ID = getArg('company');
const WORKORDER_ID = Number(getArg('workorder'));
const PRODUCTION_ID = Number(getArg('production'));
const ACTION = getArg('action');
const REASON = Number(getArg('reason'));

function fail(msg, extra) {
  console.error('❌', msg);
  if (extra) console.error(extra);
  process.exit(1);
}

// Validaciones mínimas
if (!URL || !DB || !USER || !KEY) {
  fail('Faltan credenciales: --url --db --user --key');
}
if (!COMPANY_ID || !WORKORDER_ID || !PRODUCTION_ID || !ACTION) {
  fail('Faltan parámetros: --company --workorder --production --action');
}

// --------------------
// Clientes XML-RPC
// --------------------
const common = xmlrpc.createClient({ url: `${URL}/xmlrpc/2/common` });
const object = xmlrpc.createClient({ url: `${URL}/xmlrpc/2/object` });

// Promisify helper
function call(client, method, params) {
  return new Promise((resolve, reject) => {
    client.methodCall(method, params, (err, value) => {
      if (err) return reject(err);
      resolve(value);
    });
  });
}

// --------------------
// Rutina principal
// --------------------
(async () => {
  try {
    console.log('🔐 Autenticando…');

    const uid = await call(common, 'authenticate', [DB, USER, KEY, {}]);

    if (!uid) {
      fail('Autenticación fallida (uid=false). Verifica usuario/API key/DB.');
    }

    console.log(`✅ UID: ${uid}`);

    const payload = {
      x_studio_ejecutado_por: uid, // usar UID autenticado
      x_studio_workorder_id: WORKORDER_ID,
      x_studio_production: PRODUCTION_ID,
      x_studio_accion_a_ejecutar: ACTION,
      x_studio_motivo_del_bloqueo: REASON
      // Si tu modelo usa company_id:
      //company_id: COMPANY_ID
    };

    console.log('📤 Enviando payload:', payload);

    const result = await call(object, 'execute_kw', [
      DB,
      uid,
      KEY,
      'x_acciones_remotas',
      'create',
      [payload]
    ]);

    console.log('🎯 Resultado create (ID):', result);
    console.log('✅ Acción creada correctamente');

    process.exit(0);

  } catch (err) {
    // Manejo típico de faultString de Odoo
    const fault =
      err?.faultString ||
      err?.message ||
      JSON.stringify(err);

    console.error('❌ Error Odoo:', fault);

    // pistas útiles
    if (String(fault).includes('AccessError')) {
      console.error('ℹ️ Posible falta de permisos sobre el modelo x_acciones_remotas');
    }
    if (String(fault).includes('Field')) {
      console.error('ℹ️ Verifica nombres de campos (x_studio_*) en Odoo Studio');
    }

    process.exit(1);
  }
})();
