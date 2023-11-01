import { notFound } from 'next/navigation';
import { getOdooData } from '@/app/api/odoo/odooService';

// `server-only` guarantees any modules that import code in file
// will never run on the client. Even though this particular api
// doesn't currently use sensitive environment variables, it's
// good practise to add `server-only` preemptively.
import 'server-only';

export async function getOrders() {
  const res = await fetch(
    `https://rickandmortyapi.com/api/character`,
  );

  if (!res.ok) {
    // Render the closest `error.js` Error Boundary
    throw new Error('Something went wrong!');
  }

  const orders = (await res.json());

  if (orders.results.length === 0) {
    // Render the closest `not-found.js` Error Boundary
    notFound();
  }

  return orders.results;
}

export async function getProductionOrders(user: any) {
	switch(user.role) {
    case 'Operario':
      return new Promise(async (resolve, reject) => {
        getOdooData(
          'mrp.workorder',
          [["x_studio_responsable", "=", user.odoo_id], ['state', 'in', ['pending', 'waiting', 'ready', 'progress']]],
          ['id', 'state', 'production_id'],
          false,
          false,
          user.company_id,
          async (workorders: any) => {
            if (!workorders || !workorders.data) {
              reject({ status: false, message: 'No se encontraron ordenes de trabajo.', data: false });
              return;
            }
            const production_order_ids = workorders.data.map((w: any) => w.production_id[0]);
    
            getOdooData(
              'mrp.production',
              [['state', 'in', ['confirmed', 'progress']], ['id', 'in', production_order_ids]],
              ['id', 'state', 'name', 'product_id', 'product_qty', 'qty_producing', 'lot_producing_id', 'date_planned_start', 'user_id', 'bom_id', 'move_raw_ids'],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                resolve({ status: true, message: '', data: productions.data });
              }
            );
          }
        );
      });

    case 'Lider':
      return new Promise(async (resolve, reject) => {
        if(!user.odoo_user_id) reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });

        getOdooData(
          'mrp.production',
          [['state','in',['confirmed','progress']],['user_id','=',user.odoo_user_id]],
          ['id','name','state','product_id','product_qty','qty_producing','lot_producing_id','date_planned_start','user_id','bom_id','move_raw_ids'],
          false,
          false,
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            resolve({ status: true, message: '', data: productions.data });
          }
        )
      });

    case 'Jefe':
      return new Promise(async (resolve, reject) => {
        getOdooData(
          'mrp.production',
          [['state','in',['confirmed','progress']]],
          ['id','name','state','product_id','product_qty','qty_producing','lot_producing_id','date_planned_start','user_id','bom_id','move_raw_ids'],
          false,
          false,
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            resolve({ status: true, message: '', data: productions.data });
          })
      })

    default:
      return new Promise(async (resolve, reject) => {
        reject({ status: false, message: "Usted no tiene definido un tipo de usuario." });
      })
  }
}

