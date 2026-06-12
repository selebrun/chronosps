'use server'
import { getOdooData } from '@/app/api/odoo/odooService';
import { addLocalBlockState } from '@/app/api/workOrderBlocks/workOrderBlocks';

// `server-only` guarantees any modules that import code in file
// will never run on the client. Even though this particular api
// doesn't currently use sensitive environment variables, it's
// good practise to add `server-only` preemptively.
// import 'server-only';

function onlyProductionsWithWorkOrders(productions: any[] = []) {
  return productions.filter((production: any) =>
    Array.isArray(production?.workorder_ids) && production.workorder_ids.length > 0
  );
}

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
        if(!user.odoo_user_id) {
          reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
          return;
        }

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
            resolve({ status: true, message: '', data: onlyProductionsWithWorkOrders(productions.data) });
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
          'name asc, date_planned_start asc',
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            resolve({ status: true, message: '', data: onlyProductionsWithWorkOrders(productions.data) });
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
            resolve({ status: true, message: '', data: onlyProductionsWithWorkOrders(productions.data) });
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

function parseOdooDate(dateValue: string) {
  if (!dateValue) return null;
  return new Date(`${dateValue.replace(' ', 'T')}Z`);
}

async function addActiveWorkOrderTimers(user: any, workOrders: any[]) {
  const activeWorkOrders = (workOrders || []).filter((workOrder: any) =>
    workOrder?.id &&
    workOrder?.is_user_working &&
    workOrder?.working_state !== 'blocked' &&
    !['done', 'completed', 'cancel'].includes(workOrder?.state)
  );

  if (!activeWorkOrders.length) return workOrders || [];

  const productivityData: any[] = await getOdooRecords(
    'mrp.workcenter.productivity',
    [['workorder_id', 'in', activeWorkOrders.map((workOrder: any) => workOrder.id)], ['date_end', '=', false]],
    ['id', 'workorder_id', 'date_start', 'date_end'],
    user.company_id
  );

  const productivityByWorkOrder = new Map<number, any>();
  (productivityData || []).forEach((productivity: any) => {
    const workOrderId = Array.isArray(productivity?.workorder_id) ? productivity.workorder_id[0] : productivity?.workorder_id;
    const current = productivityByWorkOrder.get(Number(workOrderId));
    if (!current || String(productivity?.date_start || '') > String(current?.date_start || '')) {
      productivityByWorkOrder.set(Number(workOrderId), productivity);
    }
  });

  const now = Date.now();
  return (workOrders || []).map((workOrder: any) => {
    const productivity = productivityByWorkOrder.get(Number(workOrder.id));
    const dateStart = parseOdooDate(productivity?.date_start);
    if (!dateStart || Number.isNaN(dateStart.getTime())) return workOrder;

    return {
      ...workOrder,
      piso_active_elapsed_seconds: Math.max(0, Math.floor((now - dateStart.getTime()) / 1000)),
      piso_active_since: productivity.date_start,
    };
  });
}

async function addQualityStateToWorkOrders(user: any, workOrders: any[]) {
  const workOrderIds = (workOrders || []).map((workOrder: any) => workOrder.id).filter(Boolean);
  if (!workOrderIds.length) return workOrders || [];

  const qualityChecks: any[] = await getOdooRecords(
    'quality.check',
    [['workorder_id', 'in', workOrderIds], ['quality_state', '=', 'fail']],
    ['id', 'name', 'workorder_id', 'quality_state', 'point_id'],
    user.company_id
  );

  if (!qualityChecks.length) return workOrders || [];

  const failedByWorkOrder = new Map<number, any[]>();
  qualityChecks.forEach((qualityCheck: any) => {
    const workOrderId = Array.isArray(qualityCheck?.workorder_id) ? qualityCheck.workorder_id[0] : qualityCheck?.workorder_id;
    const list = failedByWorkOrder.get(Number(workOrderId)) || [];
    list.push(qualityCheck);
    failedByWorkOrder.set(Number(workOrderId), list);
  });

  return (workOrders || []).map((workOrder: any) => {
    const failedChecks = failedByWorkOrder.get(Number(workOrder.id)) || [];
    if (!failedChecks.length) return workOrder;

    return {
      ...workOrder,
      quality_failed: true,
      quality_failed_count: failedChecks.length,
      quality_failed_points: failedChecks.map((check: any) => Array.isArray(check?.point_id) ? check.point_id[1] : check?.name).filter(Boolean),
      is_user_working: false,
    };
  });
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
                const workOrdersWithQuality = await addQualityStateToWorkOrders(user, workorders.data);
                const workOrdersWithTimers = await addActiveWorkOrderTimers(user, workOrdersWithQuality);
                const workOrdersWithLocalBlocks = await addLocalBlockState(user, workOrdersWithTimers);
                resolve({ status: true, message: '', data: workOrdersWithLocalBlocks, production_data: productions.data });
              },
              false
            );
          },
          false
        );
      });

    case 'Lider':
      return new Promise(async (resolve, reject) => {
        if(!user.odoo_user_id) {
          reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
          return;
        }
        filter = [['state','in',['confirmed','progress']],['user_id','=',user.odoo_user_id]]
        filter.push(['id','in',  idOrders])
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
                const workOrdersWithQuality = await addQualityStateToWorkOrders(user, productions.data);
                const workOrdersWithTimers = await addActiveWorkOrderTimers(user, workOrdersWithQuality);
                const workOrdersWithLocalBlocks = await addLocalBlockState(user, workOrdersWithTimers);
                resolve({ status: true, message: '', data: workOrdersWithLocalBlocks, production_data: productions.data });
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
        filter.push(['id','in',  idOrders])
        getOdooData(
          'mrp.production',
          filter,
          [],
          false,
          'name asc, date_planned_start asc',
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
              'sequence asc, name asc',
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
        
                const workOrdersWithQuality = await addQualityStateToWorkOrders(user, productions.data);
                const workOrdersWithTimers = await addActiveWorkOrderTimers(user, workOrdersWithQuality);
                const workOrdersWithLocalBlocks = await addLocalBlockState(user, workOrdersWithTimers);
                resolve({ status: true, message: '', data:  workOrdersWithLocalBlocks, production_data: workorders.data });
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
        if(!user.odoo_user_id) {
          reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
          return;
        }
        filter = [['state','in',['confirmed','progress']],['user_id','=',user.odoo_user_id]]
        filter.push(['id','in',  idOrders])
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
              ['id','name','production_id','quality_state','product_id','point_id','note','additional_note','measure','test_type_id','workorder_id','workorder_id'],
              false,
              false,
              user.company_id,
              async (productions: any) => {
                if (!productions || !productions.data) {
                  reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
                  return;
                }
                const qualityChecks = await addWorkOrderSequenceToQualityChecks(productions.data, user.company_id);
                resolve({ status: true, message: '', data:  qualityChecks, production_data: workorders.data });
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
        filter.push(['id','in',  idOrders])
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
                const qualityChecks = await addWorkOrderSequenceToQualityChecks(productions.data, user.company_id);
                resolve({ status: true, message: '', data:  qualityChecks, production_data: workorders.data });
              },
              false
            );
          },
          false
        )})
    case 'Calidad':
      return new Promise(async (resolve, reject) => {
        filter = [['state','in',['confirmed','progress']]]
        filter.push(['id','in',  idOrders])
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
                const qualityChecks = await addWorkOrderSequenceToQualityChecks(productions.data, user.company_id);
                resolve({ status: true, message: '', data:  qualityChecks, production_data: workorders.data });
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

async function addWorkOrderSequenceToQualityChecks(qualityChecks: any[], companyId: string) {
  const workorderIds = Array.from(new Set(
    qualityChecks
      .map((qualityCheck: any) => Array.isArray(qualityCheck?.workorder_id) ? qualityCheck.workorder_id[0] : qualityCheck?.workorder_id)
      .filter(Boolean)
  ));

  if (!workorderIds.length) return qualityChecks;

  return new Promise<any[]>((resolve) => {
    getOdooData(
      'mrp.workorder',
      [['id', 'in', workorderIds]],
      ['id', 'sequence', 'name'],
      false,
      false,
      companyId,
      async (workorders: any) => {
        const workorderById = new Map<number, any>((workorders?.data || []).map((workorder: any) => [workorder.id, workorder]));

        resolve(qualityChecks.map((qualityCheck: any) => {
          const workorderId = Array.isArray(qualityCheck?.workorder_id) ? qualityCheck.workorder_id[0] : qualityCheck?.workorder_id;
          const workorder = workorderById.get(workorderId);

          return {
            ...qualityCheck,
            workorder_sequence: workorder?.sequence ?? null,
            workorder_name: workorder?.name || (Array.isArray(qualityCheck?.workorder_id) ? qualityCheck.workorder_id[1] : qualityCheck?.workorder_id),
          };
        }));
      },
      false
    );
  });
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
  return normalizeText(production?.origin);
}

const CUSTOMER_PRODUCTION_FIELDS = [
  'id',
  'name',
  'state',
  'product_id',
  'product_qty',
  'qty_producing',
  'origin',
  'sale_id',
  'sale_line_id',
  'workorder_ids',
];

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
        if (response && response.status === false) {
          console.log(`Error consultando ${model}:`, response.message || response);
        }
        resolve(response?.data || []);
      },
      false
    );
  });
}

async function getOdooRecordsWithRelation(
  model: string,
  domain: any[],
  fields: string[],
  companyId: string,
  relation: Record<string, any>
) {
  const records = await getOdooRecords(model, domain, fields, companyId);
  return records.map((record: any) => ({ ...record, ...relation }));
}

async function getProductionsBySaleId(saleIds: number[], companyId: string) {
  const productionGroups = await Promise.all(
    saleIds.map((saleId) =>
      getOdooRecordsWithRelation(
        'mrp.production',
        [['sale_id', '=', saleId]],
        CUSTOMER_PRODUCTION_FIELDS,
        companyId,
        { customer_sale_id: saleId }
      )
    )
  );

  return productionGroups.flat();
}

async function getProductionsBySaleLineId(saleLines: any[], companyId: string) {
  const productionGroups = await Promise.all(
    saleLines.map((line: any) =>
      getOdooRecordsWithRelation(
        'mrp.production',
        [['sale_line_id', '=', line.id]],
        CUSTOMER_PRODUCTION_FIELDS,
        companyId,
        {
          customer_sale_id: asOdooId(line.order_id),
          customer_sale_line_id: line.id,
        }
      )
    )
  );

  return productionGroups.flat();
}

async function getProductionsByOriginSales(sales: any[], companyId: string) {
  const searches = sales.flatMap((sale: any) => {
    const tokens = new Set<string>([sale.name]);
    const lastNamePart = sale.name?.split('/').pop();

    if (lastNamePart) {
      tokens.add(lastNamePart);
      tokens.add(lastNamePart.replace(/^0+/, '') || lastNamePart);
    }

    return Array.from(tokens)
      .filter(Boolean)
      .map((token) =>
        getOdooRecordsWithRelation(
          'mrp.production',
          [['origin', 'ilike', token]],
          CUSTOMER_PRODUCTION_FIELDS,
          companyId,
          { customer_sale_id: sale.id }
        )
      );
  });

  const productionGroups = await Promise.all(searches);

  return productionGroups.flat();
}

function getProductionDirectSaleId(production: any, sales: any[]) {
  const saleId = asOdooId(production?.customer_sale_id) || asOdooId(production?.sale_id);
  if (saleId) return saleId;

  const saleKey = getProductionSaleKey(production);
  const sale = sales.find((item: any) => item.name === saleKey);
  return sale?.id || null;
}

function findProductionParentByOrigin(origin: any, productionsByName: Map<string, any>) {
  const originText = normalizeText(origin);
  if (!originText) return null;

  const exactParent = productionsByName.get(originText);
  if (exactParent) return exactParent;

  return Array.from(productionsByName.values()).find((production: any) =>
    production?.name && originText.includes(production.name)
  ) || null;
}

async function getProductionChildren(productions: any[], user: any) {
  const productionsById = new Map(productions.map((production: any) => [production.id, production]));
  let productionsByName = new Map(productions.map((production: any) => [production.name, production]));
  let pendingNames = productions.map((production: any) => production.name).filter(Boolean);

  for (let depth = 0; depth < 5 && pendingNames.length; depth += 1) {
    const exactChildren = getOdooRecords(
      'mrp.production',
      [['origin', 'in', pendingNames]],
      CUSTOMER_PRODUCTION_FIELDS,
      user.company_id
    );
    const partialChildren = Promise.all(
      pendingNames.map((name: string) =>
        getOdooRecords(
          'mrp.production',
          [['origin', 'ilike', name]],
          CUSTOMER_PRODUCTION_FIELDS,
          user.company_id
        )
      )
    );
    const [exactChildrenData, partialChildrenGroups] = await Promise.all([exactChildren, partialChildren]);
    const children = Array.from(
      new Map(
        [...exactChildrenData, ...partialChildrenGroups.flat()].map((production: any) => [production.id, production])
      ).values()
    );

    const newChildren = children
      .filter((production: any) => !productionsById.has(production.id))
      .map((production: any) => {
        const parent = findProductionParentByOrigin(production.origin, productionsByName);
        return {
          ...production,
          customer_sale_id: parent?.customer_sale_id || asOdooId(parent?.sale_id),
        };
      });

    newChildren.forEach((production: any) => productionsById.set(production.id, production));
    productionsByName = new Map(Array.from(productionsById.values()).map((production: any) => [production.name, production]));
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

      const parent = findProductionParentByOrigin(getProductionSaleKey(production), productionByName);
      const parentSaleId = parent ? productionSaleMap.get(parent.id) : null;

      if (parentSaleId) {
        productionSaleMap.set(production.id, parentSaleId);
        changed = true;
      }
    });
  }

  return productionSaleMap;
}

function uniqueByOdooId(records: any[]) {
  return Array.from(new Map((records || []).map((record: any) => [record.id, record])).values());
}

function getProductionParent(production: any, productionByName: Map<string, any>) {
  return findProductionParentByOrigin(getProductionSaleKey(production), productionByName);
}

function productionBelongsToProduct(production: any, productId: number, productionByName: Map<string, any>) {
  let currentProduction = production;
  const visited = new Set<number>();

  while (currentProduction && !visited.has(currentProduction.id)) {
    visited.add(currentProduction.id);

    if (asOdooId(currentProduction.product_id) === productId) return true;
    currentProduction = getProductionParent(currentProduction, productionByName);
  }

  return false;
}

function getProductProductions(line: any, lines: any[], productions: any[]) {
  const productId = asOdooId(line.product_id);
  if (lines.length === 1) return productions;

  const productionByName = new Map(productions.map((production: any) => [production.name, production]));
  return productions.filter((production: any) => productionBelongsToProduct(production, productId, productionByName));
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
        workorder_count: productWorkorders.length || productProductions.reduce((sum: number, production: any) => sum + (production.workorder_ids?.length || 0), 0),
        productions: productProductions,
      };
    });
  }

  return lines.map((line: any) => {
    const productId = asOdooId(line.product_id);
    const productProductions = getProductProductions(line, lines, productions);
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
      workorder_count: productWorkorders.length || productProductions.reduce((sum: number, production: any) => sum + (production.workorder_ids?.length || 0), 0),
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
  if (!['Cliente', 'Jefe'].includes(user.role)) {
    return { status: false, message: 'Esta consulta esta disponible solo para usuarios Cliente o Jefe.', data: [] };
  }

  const partnerIds = user.role === 'Cliente' ? await getCustomerPartnerIds(user) : [];
  if (user.role === 'Cliente' && !partnerIds.length) {
    return { status: false, message: 'No se encontro un cliente relacionado al documento o email del usuario.', data: [] };
  }
  const salesDomain = user.role === 'Cliente'
    ? [['partner_id', 'in', partnerIds], ['state', 'in', ['sale', 'done']]]
    : [['state', 'in', ['sale', 'done']]];

  return new Promise((resolve) => {
    getOdooData(
      'sale.order',
      salesDomain,
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
        const saleLines = await getOdooRecords(
          'sale.order.line',
          [['order_id', 'in', saleIds], ['display_type', '=', false]],
          ['id', 'order_id', 'name', 'product_id', 'product_uom_qty', 'qty_delivered'],
          user.company_id
        );
        const productionsBySaleId = await getProductionsBySaleId(saleIds, user.company_id);
        const productionsBySaleLineId = await getProductionsBySaleLineId(saleLines, user.company_id);
        const productionsByOrigin = await getProductionsByOriginSales(sales.data, user.company_id);
        const directProductions = Array.from(
          new Map(
            [...productionsBySaleId, ...productionsBySaleLineId, ...productionsByOrigin].map((production: any) => [production.id, production])
          ).values()
        );

        const productionData = uniqueByOdooId(await getProductionChildren(directProductions, user));
        const productionSaleMap = getProductionSaleMap(productionData, sales.data);
        const productionIds = productionData.map((production: any) => production.id);
        const productionWorkorderIds = productionData.flatMap((production: any) => production.workorder_ids || []);

        console.log('Consulta Cliente NV/OP', {
          sale_count: sales.data.length,
          sale_ids: saleIds,
          sale_line_count: saleLines.length,
          production_by_sale_id_count: productionsBySaleId.length,
          production_by_sale_line_id_count: productionsBySaleLineId.length,
          production_by_origin_count: productionsByOrigin.length,
          production_total_count: productionData.length,
          production_ids: productionIds,
        });

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
              ['|', ['production_id', 'in', productionIds], ['id', 'in', productionWorkorderIds]],
              ['id', 'name', 'state', 'production_id', 'workcenter_id', 'duration', 'duration_expected'],
              false,
              false,
              user.company_id,
              async (workorders: any) => {
                const workorderData = workorders?.data || [];

                const data = sales.data.map((sale: any) => {
                  const saleProductions = uniqueByOdooId(productionData.filter((production: any) => productionSaleMap.get(production.id) === sale.id));
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

                  const saleWorkorders = uniqueByOdooId(productionsWithProgress.flatMap((production: any) => production.workorders));
                  const saleWorkorderCount = saleWorkorders.length || new Set(
                    saleProductions.flatMap((production: any) => production.workorder_ids || [])
                  ).size;
                  const saleProducts = buildSaleProductRows(sale, saleLines, productionsWithProgress, saleWorkorders);

                  console.log('Consulta Cliente NV detalle', {
                    sale: sale.name,
                    sale_id: sale.id,
                    productions: saleProductions.map((production: any) => production.name),
                    workorder_count: saleWorkorders.length,
                    product_rows: saleProducts.map((product: any) => ({
                      product: product.product,
                      production_count: product.production_count,
                      workorder_count: product.workorder_count,
                      progress: product.progress,
                    })),
                  });

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
                    workorder_count: saleWorkorderCount,
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
