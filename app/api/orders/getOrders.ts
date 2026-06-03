'use server'
import { getOdooData } from '@/app/api/odoo/odooService';

// `server-only` guarantees any modules that import code in file
// will never run on the client. Even though this particular api
// doesn't currently use sensitive environment variables, it's
// good practise to add `server-only` preemptively.
// import 'server-only';

export async function getProductionOrders(user: any) {
	switch(user.role) {
    case 'Operario':
      return new Promise(async (resolve, reject) => {
        getOdooData(
          'mrp.workorder',
          [['employee_assigned_ids','=',user.odoo_id], ['state', 'in', ['pending', 'waiting', 'ready', 'progress']]],
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
              [],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                resolve({ status: true, message: '', data: productions.data });
              },
              false
            );
          },
          false
        );
      });

    case 'Lider':
      return new Promise(async (resolve, reject) => {
        if(!user.odoo_user_id) reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });

        getOdooData(
          'mrp.production',
          [['state','in',['confirmed','progress']],['user_id','=',user.odoo_user_id]],
          [],
          false,
          false,
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            resolve({ status: true, message: '', data: productions.data });
          },
          false
        )
      });

    case 'Jefe':
      return new Promise(async (resolve, reject) => {
        getOdooData(
          'mrp.production',
          [['state','in',['confirmed','progress']]],
          [],
          false,
          false,
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            resolve({ status: true, message: '', data: productions.data });
          },
          false
          )
      })

    case 'Calidad':
      return new Promise(async (resolve, reject) => {
        getOdooData(
          'mrp.production',
          [['state','in',['confirmed','progress']]],
          [],
          false,
          false,
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            resolve({ status: true, message: '', data: productions.data });
          },
          false
          )
      })

    default:
      return new Promise(async (resolve, reject) => {
        reject({ status: false, message: "Usted no tiene definido un tipo de usuario." });
      })
  }
}

export async function getWorkOrders(user: any) {
  const ordersPro: any = await getProductionOrders(user) || []
  let filter: any = []
  const idOrders = ordersPro?.data.map((order: any) => order.id)

  switch(user.role) {
    case 'Operario':
      filter = [['state','in',['pending','waiting','ready','progress']]]
      filter.push(['employee_assigned_ids','=',user.odoo_id])
      return new Promise(async (resolve, reject) => {
        getOdooData(
          'mrp.workorder',
          filter,
          [],
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
              [],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                resolve({ status: true, message: '', data: workorders.data, production_data: productions.data });
              },
              false
            );
          },
          false
        );
      });

    case 'Lider':
      return new Promise(async (resolve, reject) => {
        if(!user.odoo_user_id) reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
        filter = [['state','in',['confirmed','progress']],['user_id','=',user.odoo_id]]
        filter.push(['id','=',  idOrders])
        getOdooData(
          'mrp.production',
          filter,
          [],
          false,
          false,
          user.company_id,
          async (workorders: any) => {
            if (!workorders || !workorders.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            const production_orders = workorders.data.map((p: any) => p.id);
            getOdooData(
              'mrp.workorder',
              [['production_id','in',production_orders]],
              // ['id','name','state','x_studio_nro_ot','production_id','date_planned_start','date_planned_finished','duration','duration_expected','operation_note','working_state','workcenter_id','is_user_working','worksheet','quality_state']
              [],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                resolve({ status: true, message: '', data: productions.data, production_data: productions.data });
              },
              false
            );
          },
          false
        )
      });
    case 'Jefe':
      return new Promise(async (resolve, reject) => {
        filter = [['state','in',['confirmed','progress']]]
        filter.push(['id','=',  idOrders])
        getOdooData(
          'mrp.production',
          filter,
          [],
          false,
          false,
          user.company_id,
          async (workorders: any) => {
            if (!workorders || !workorders.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            const production_orders = workorders.data.map((p: any) => p.id);
            getOdooData(
              'mrp.workorder',
              [['production_id','in',production_orders]],
              [],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
        
                resolve({ status: true, message: '', data:  productions.data, production_data: workorders.data });
              },
              false
            );
          },
          false
        )})
    default:
      return new Promise(async (resolve, reject) => {
        reject({ status: false, message: "Usted no tiene definido un tipo de usuario." });
      })

  }







  // const ordersPro: any = await getProductionOrders(user) || []
  // const idOrders = ordersPro?.data.map((order: any) => order.id)

  // if (!idOrders.length) {
  //   return new Promise(async (resolve, reject) => {
  //     reject({ status: false, message: "No se han podido obtener las ódenes de producción." });
  //   })
  // }

  // let filter: any = []
  // switch(user.role) {
  //   case 'Operario':
  //         filter = [['state','in',['pending','waiting','ready','progress']]]
  //         filter.push(['production_id','=', idOrders])
  //         filter.push(["x_studio_responsable","=",user.odoo_id])
  //     return new Promise(async (resolve, reject) => {
  //       getOdooData(
  //         'mrp.workorder',
  //         filter,
  //         ['id','name','state','x_studio_nro_ot','x_studio_responsable','production_id','date_planned_start','date_planned_finished','duration','duration_expected','operation_note','working_state','workcenter_id','is_user_working','worksheet','quality_state'],
  //         false,
  //         false,
  //         user.company_id,
  //         async (workorders: any) => {
  //           if (!workorders || !workorders.data) {
  //             reject({ status: false, message: 'No se encontraron ordenes de trabajo.', data: false });
  //             return;
  //           }
  //           const production_order_ids = workorders.data.map((w: any) => w.production_id[0]);
  //           getOdooData(
  //             'mrp.production',
  //             [['state', 'in', ['confirmed', 'progress']], ['id', 'in', production_order_ids]],
  //             ['id','name','state','product_id','product_qty','qty_producing','lot_producing_id','date_planned_start','user_id','bom_id','move_raw_ids'],
  //             false,
  //             false,
  //             user.company_id,
  //             async (productions: any) => {
  //               if (!productions || !productions.data) {
  //                 reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
  //                 return;
  //               }
  //               resolve({ status: true, message: '', data: workorders.data, production_data: productions.data });
  //             }
  //           );
  //         }
  //       );
  //     });

  //   case 'Lider':
  //     return new Promise(async (resolve, reject) => {
  //       if(!user.odoo_user_id) reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
  //       filter = [['state','in',['confirmed','progress']],['user_id','=',user.odoo_id]]
  //       filter.push(['id','=',  idOrders])
  //       getOdooData(
  //         'mrp.production',
  //         filter,
  //         ['id','name','state','product_id','product_qty','qty_producing','lot_producing_id','date_planned_start','user_id','bom_id','move_raw_ids'],
  //         false,
  //         false,
  //         user.company_id,
  //         async (workorders: any) => {
  //           if (!workorders || !workorders.data) {
  //             reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
  //             return;
  //           }
  //           const production_orders = workorders.data.map((p: any) => p.id);
  //           getOdooData(
  //             'mrp.workorder',
  //             [['production_id','in',production_orders]],
  //             ['id','name','state','x_studio_responsable','x_studio_nro_ot','production_id','date_planned_start','date_planned_finished','duration','duration_expected','operation_note','working_state','workcenter_id','is_user_working','worksheet','quality_state'],
  //             false,
  //             false,
  //             user.company_id,
  //             async (productions: any) => {
  //               if (!productions || !productions.data) {
  //                 reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
  //                 return;
  //               }
  //               resolve({ status: true, message: '', data: productions.data, production_data: productions.data });
  //             }
  //           );
  //         }
  //       )
  //     });
  //   case 'Jefe':
  //     return new Promise(async (resolve, reject) => {
  //       filter = [['state','in',['confirmed','progress']]]
  //       filter.push(['id','=',  idOrders])
  //       getOdooData(
  //         'mrp.production',
  //         filter,
  //         ['id','name','state','product_id','product_qty','qty_producing','lot_producing_id','date_planned_start','user_id','bom_id','move_raw_ids'],
  //         false,
  //         false,
  //         user.company_id,
  //         async (workorders: any) => {
  //           if (!workorders || !workorders.data) {
  //             reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
  //             return;
  //           }
  //           const production_orders = workorders.data.map((p: any) => p.id);
  //           getOdooData(
  //             'mrp.workorder',
  //             [['production_id','in',production_orders]],
  //             ['id','name','state','x_studio_nro_ot','x_studio_responsable','production_id','date_planned_start','date_planned_finished','duration','duration_expected','operation_note','working_state','workcenter_id','is_user_working','worksheet','quality_state'],
  //             false,
  //             false,
  //             user.company_id,
  //             async (productions: any) => {
  //               if (!productions || !productions.data) {
  //                 reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
  //                 return;
  //               }
        
  //               resolve({ status: true, message: '', data:  productions.data, production_data: workorders.data });
  //             }
  //           );
  //         }
  //       )})
  //   default:
  //     return new Promise(async (resolve, reject) => {
  //       reject({ status: false, message: "Usted no tiene definido un tipo de usuario." });
  //     })

  // }
}

export async function getQualityControl(user: any) {
  const ordersPro: any = await getProductionOrders(user) || []
  const idOrders = ordersPro?.data.map((order: any) => order.id)

  if (!idOrders.length) {
    return new Promise(async (resolve, reject) => {
      reject({ status: false, message: "No se han podido obtener las ódenes de producción." });
    })
  }

  let filter: any = []
  switch(user.role) {
    case 'Lider':
      return new Promise(async (resolve, reject) => {
        if(!user.odoo_user_id) reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
        filter = [['state','in',['confirmed','progress']],['user_id','=',user.odoo_id]]
        filter.push(['id','=',  idOrders])
        getOdooData(
          'mrp.production',
          filter,
          ['id','name','state','product_id','product_qty','qty_producing','lot_producing_id','date_planned_start','user_id','bom_id','move_raw_ids'],
          false,
          false,
          user.company_id,
          async (workorders: any) => {
            if (!workorders || !workorders.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            const production_orders = workorders.data.map((p: any) => p.id);
            getOdooData(
              'quality.check',
              [['production_id','in',production_orders]],
              ['id','name','production_id','quality_state','product_id','point_id','note','additional_note','test_type_id','workorder_id','workorder_id'],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                resolve({ status: true, message: '', data:  productions.data, production_data: workorders.data });
              },
              false
            );
          },
          false
        )
      });
    case 'Jefe':
      return new Promise(async (resolve, reject) => {
        filter = [['state','in',['confirmed','progress']]]
        filter.push(['id','=',  idOrders])
        getOdooData(
          'mrp.production',
          filter,
          [],
          // ['id','name','state','product_id','product_qty','qty_producing','lot_producing_id','date_planned_start','user_id','bom_id','move_raw_ids'],
          false,
          false,
          user.company_id,
          async (workorders: any) => {
            if (!workorders || !workorders.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            const production_orders = workorders.data.map((p: any) => p.id);
            getOdooData(
              'quality.check',
              [['production_id','in',production_orders]],
              [],
              // ['id','production_id','name','quality_state','product_id','point_id','note','additional_note','test_type_id','workorder_id','workorder_id'],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                resolve({ status: true, message: '', data:  productions.data, production_data: workorders.data });
              },
              false
            );
          },
          false
        )})
    case 'Calidad':
      return new Promise(async (resolve, reject) => {
        filter = [['state','in',['confirmed','progress']]]
        filter.push(['id','=',  idOrders])
        getOdooData(
          'mrp.production',
          filter,
          [],
          false,
          false,
          user.company_id,
          async (workorders: any) => {
            if (!workorders || !workorders.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            const production_orders = workorders.data.map((p: any) => p.id);
            getOdooData(
              'quality.check',
              [['production_id','in',production_orders]],
              [],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                resolve({ status: true, message: '', data:  productions.data, production_data: workorders.data });
              },
              false
            );
          },
          false
        )})
    default:
      return new Promise(async (resolve, reject) => {
        reject({ status: false, message: "Usted no tiene definido un tipo de usuario." });
      })

  }
}

export async function getBlockReasons(user: any) {
  return new Promise(async (resolve, reject) => {
        getOdooData(
          'mrp.workcenter.productivity.loss',
          [],
          ['id','name','loss_id','loss_type','manual'],
          false,
          false,
          user.company_id,
          async (data: any) => {
           return resolve({ block_reasons :data.data });
          },
          false
        )
    })
  }

function asOdooId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function asOdooName(value: any) {
  return Array.isArray(value) ? value[1] : value || '';
}

function normalizeText(value: any) {
  return (value || '').toString().trim();
}

function getWorkOrderProgress(workorder: any) {
  if (['done', 'completed'].includes(workorder?.state)) return 100;
  if (workorder?.state === 'progress' && workorder?.duration_expected > 0) {
    return Math.min(Math.round((workorder.duration / workorder.duration_expected) * 100), 100);
  }
  return 0;
}

function averageProgress(workorders: any[]) {
  if (!workorders.length) return 0;
  const total = workorders.reduce((sum, workorder) => sum + getWorkOrderProgress(workorder), 0);
  return Math.round(total / workorders.length);
}

function getProductionSaleKey(production: any) {
  return normalizeText(production?.x_studio_po) || normalizeText(production?.origin);
}

function getOdooRecords(
  model: string,
  domain: any[],
  fields: string[],
  companyId: string,
  order: any = false,
): Promise<any[]> {
  return new Promise((resolve) => {
    getOdooData(
      model,
      domain,
      fields,
      false,
      order,
      companyId,
      async (response: any) => {
        resolve(response?.data || []);
      },
      false
    );
  });
}

function getProductionDirectSaleId(production: any, sales: any[]) {
  const saleId = asOdooId(production?.sale_id);
  if (saleId) return saleId;

  const saleKey = getProductionSaleKey(production);
  const sale = sales.find((item: any) => item.name === saleKey);
  return sale?.id || null;
}

async function getProductionChildren(productions: any[], user: any) {
  const productionsById = new Map(productions.map((production: any) => [production.id, production]));
  let pendingNames = productions.map((production: any) => production.name).filter(Boolean);

  for (let depth = 0; depth < 5 && pendingNames.length; depth += 1) {
    const children = await getOdooRecords(
      'mrp.production',
      ['|', ['origin', 'in', pendingNames], ['x_studio_po', 'in', pendingNames]],
      ['id', 'name', 'state', 'product_id', 'product_qty', 'qty_producing', 'origin', 'x_studio_po', 'sale_id', 'date_planned_start', 'date_planned_finished'],
      user.company_id
    );

    const newChildren = children.filter((production: any) => !productionsById.has(production.id));
    newChildren.forEach((production: any) => productionsById.set(production.id, production));
    pendingNames = newChildren.map((production: any) => production.name).filter(Boolean);
  }

  return Array.from(productionsById.values());
}

function getProductionSaleMap(productions: any[], sales: any[]) {
  const productionSaleMap = new Map<number, number>();
  const productionByName = new Map(productions.map((production: any) => [production.name, production]));

  productions.forEach((production: any) => {
    const saleId = getProductionDirectSaleId(production, sales);
    if (saleId) productionSaleMap.set(production.id, saleId);
  });

  let changed = true;
  while (changed) {
    changed = false;

    productions.forEach((production: any) => {
      if (productionSaleMap.has(production.id)) return;

      const parentKey = getProductionSaleKey(production);
      const parent = productionByName.get(parentKey);
      const parentSaleId = parent ? productionSaleMap.get(parent.id) : null;

      if (parentSaleId) {
        productionSaleMap.set(production.id, parentSaleId);
        changed = true;
      }
    });
  }

  return productionSaleMap;
}

function buildSaleProductRows(sale: any, saleLines: any[], productions: any[], workorders: any[]) {
  const lines = saleLines.filter((line: any) => asOdooId(line.order_id) === sale.id && asOdooId(line.product_id));

  if (!lines.length) {
    const productionProducts = new Map<number, any>();

    productions.forEach((production: any) => {
      const productId = asOdooId(production.product_id);
      if (!productId || productionProducts.has(productId)) return;

      productionProducts.set(productId, {
        id: `production-product-${productId}`,
        product_id: productId,
        product: asOdooName(production.product_id),
        quantity: productions
          .filter((item: any) => asOdooId(item.product_id) === productId)
          .reduce((sum: number, item: any) => sum + (Number(item.product_qty) || 0), 0),
      });
    });

    return Array.from(productionProducts.values()).map((product: any) => {
      const productProductions = productions.filter((production: any) => asOdooId(production.product_id) === product.product_id);
      const productWorkorders = workorders.filter((workorder: any) =>
        productProductions.some((production: any) => production.id === asOdooId(workorder.production_id))
      );

      return {
        ...product,
        progress: averageProgress(productWorkorders),
        production_count: productProductions.length,
        workorder_count: productWorkorders.length,
        productions: productProductions,
      };
    });
  }

  return lines.map((line: any) => {
    const productId = asOdooId(line.product_id);
    const productProductions = productions.filter((production: any) => asOdooId(production.product_id) === productId);
    const productWorkorders = workorders.filter((workorder: any) =>
      productProductions.some((production: any) => production.id === asOdooId(workorder.production_id))
    );

    return {
      id: line.id,
      product_id: productId,
      product: asOdooName(line.product_id) || line.name,
      description: line.name,
      quantity: line.product_uom_qty,
      delivered_quantity: line.qty_delivered,
      progress: averageProgress(productWorkorders),
      production_count: productProductions.length,
      workorder_count: productWorkorders.length,
      productions: productProductions,
    };
  });
}

async function getCustomerPartnerIds(user: any): Promise<number[]> {
  return new Promise((resolve) => {
    const domain = [
      '|',
      '|',
      ['vat', '=', user.document],
      ['ref', '=', user.document],
      ['email', '=', user.email],
    ];

    getOdooData(
      'res.partner',
      domain,
      ['id', 'name', 'vat', 'ref', 'email'],
      false,
      false,
      user.company_id,
      async (partners: any) => {
        if (!partners?.data?.length) {
          resolve([]);
          return;
        }
        resolve(partners.data.map((partner: any) => partner.id));
      },
      false
    );
  });
}

export async function getCustomerSalesNotes(user: any) {
  if (user.role !== 'Cliente') {
    return { status: false, message: 'Esta consulta esta disponible solo para usuarios Cliente.', data: [] };
  }

  const partnerIds = await getCustomerPartnerIds(user);
  if (!partnerIds.length) {
    return { status: false, message: 'No se encontro un cliente relacionado al documento o email del usuario.', data: [] };
  }

  return new Promise((resolve) => {
    getOdooData(
      'sale.order',
      [['partner_id', 'in', partnerIds], ['state', 'not in', ['cancel']]],
      ['id', 'name', 'partner_id', 'date_order', 'state', 'client_order_ref', 'amount_total'],
      false,
      'date_order desc',
      user.company_id,
      async (sales: any) => {
        if (!sales?.data?.length) {
          resolve({ status: true, message: '', data: [] });
          return;
        }

        const saleIds = sales.data.map((sale: any) => sale.id);
        const saleNames = sales.data.map((sale: any) => sale.name);
        const saleLines = await getOdooRecords(
          'sale.order.line',
          [['order_id', 'in', saleIds], ['display_type', '=', false]],
          ['id', 'order_id', 'name', 'product_id', 'product_uom_qty', 'qty_delivered'],
          user.company_id
        );
        const directProductions = await getOdooRecords(
          'mrp.production',
          ['|', '|', ['sale_id', 'in', saleIds], ['origin', 'in', saleNames], ['x_studio_po', 'in', saleNames]],
          ['id', 'name', 'state', 'product_id', 'product_qty', 'qty_producing', 'origin', 'x_studio_po', 'sale_id', 'date_planned_start', 'date_planned_finished'],
          user.company_id
        );

        const productionData = await getProductionChildren(directProductions, user);
        const productionSaleMap = getProductionSaleMap(productionData, sales.data);
            const productionIds = productionData.map((production: any) => production.id);

            if (!productionIds.length) {
              resolve({
                status: true,
                message: '',
                data: sales.data.map((sale: any) => ({
                  id: sale.id,
                  name: sale.name,
                  partner: asOdooName(sale.partner_id),
                  date_order: sale.date_order,
                  state: sale.state,
                  client_order_ref: sale.client_order_ref,
                  amount_total: sale.amount_total,
                  progress: 0,
                  production_count: 0,
                  workorder_count: 0,
                  products: buildSaleProductRows(sale, saleLines, [], []),
                  productions: [],
                })),
              });
              return;
            }

            getOdooData(
              'mrp.workorder',
              [['production_id', 'in', productionIds]],
              ['id', 'name', 'state', 'production_id', 'workcenter_id', 'duration', 'duration_expected', 'date_planned_start', 'date_planned_finished'],
              false,
              false,
              user.company_id,
              async (workorders: any) => {
                const workorderData = workorders?.data || [];

                const data = sales.data.map((sale: any) => {
                  const saleProductions = productionData.filter((production: any) => productionSaleMap.get(production.id) === sale.id);
                  const productionsWithProgress = saleProductions.map((production: any) => {
                    const productionWorkorders = workorderData.filter((workorder: any) => asOdooId(workorder.production_id) === production.id);

                    return {
                      ...production,
                      product: asOdooName(production.product_id),
                      progress: averageProgress(productionWorkorders),
                      workorder_count: productionWorkorders.length,
                      workorders: productionWorkorders,
                    };
                  });

                  const saleWorkorders = productionsWithProgress.flatMap((production: any) => production.workorders);
                  const saleProducts = buildSaleProductRows(sale, saleLines, productionsWithProgress, saleWorkorders);

                  return {
                    id: sale.id,
                    name: sale.name,
                    partner: asOdooName(sale.partner_id),
                    date_order: sale.date_order,
                    state: sale.state,
                    client_order_ref: sale.client_order_ref,
                    amount_total: sale.amount_total,
                    progress: averageProgress(saleWorkorders),
                    production_count: productionsWithProgress.length,
                    workorder_count: saleWorkorders.length,
                    products: saleProducts,
                    productions: productionsWithProgress,
                  };
                });

                resolve({ status: true, message: '', data });
              },
              false
            );
      },
      false
    );
  }).catch((error) => {
    console.log(error);
    return { status: false, message: 'No se pudo consultar las notas de venta del cliente.', data: [] };
  });
}
