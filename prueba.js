const { createOdooData } = require('C:\\Users\\simon\\OneDrive - Chronos Poduction Software SpA\\Odoo\\Desarrollos\\GitHub\\chronosps\\app\\api\\odoo\\odooService.ts'); // ajusta ruta

function createOdooDataAsync(model, values, company_id) {
  return new Promise((resolve, reject) => {

    createOdooData(
      model,
      values,
      company_id,
      (data) => {

        if (!data || !data.status) {
          const errorMsg =
            data?.message?.faultString ||
            data?.message ||
            "Error ejecutando acción en Odoo";

          return reject(new Error(errorMsg));
        }

        resolve(data);
      },
      false
    );

  });
}

// 🔧 MOCK de datos (ajusta según tu caso real)
const workorder = {
  id: 127,
  production_id: [43]
};

const action = "block_work_order"; // o el valor real
const blockReason = 7;  // id válido en Odoo
const company_id = "d83e9afe-9aae-4dc7-a6e8-d64450edca6f";

(async () => {
  try {

    console.log("🚀 Enviando datos a Odoo...");

    const result = await createOdooDataAsync(
      'x_acciones_remotas',
      {
        x_studio_ejecutado_por: "1",
        x_studio_workorder_id: 127,  //workorder.id,
        x_studio_production: 43,   //workorder.production_id[0],
        x_studio_accion_a_ejecutar: "block_work_order",   //action,
        x_studio_motivo_del_bloqueo: 7   //blockReason
      },
      company_id
    );

    console.log("✅ OK respuesta Odoo:", result);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
})();

//datos enviado: 127 43 block_work_order 7

//npm install xmlrpc

//node odoo_remote_action.js \
  --url https://hidrosumi.chronosps.app \
  --db hidrotest-prod-25885057 \
  --user admin \
  --key "9893df07a176ca9d3dcdbe04bcc77d0672f2271e" \
  --company 1 \
  --workorder 127 \
  --production 43 \
  --action "block_work_order" \
  --reason 7
  
  //node odoo_remote_action.js --url "https://hidrosumi.chronosps.app" --db "hidrotest-prod-25885057" --user "simon@chronosps.cl" --key "9893df07a176ca9d3dcdbe04bcc77d0672f2271e" --company "d83e9afe-9aae-4dc7-a6e8-d64450edca6f" --workorder 127 --production 42 --action "block_work_order" --reason 7