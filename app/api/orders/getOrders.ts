'use server'
import { getOdooData } from '@/app/api/odoo/odooService';
import { getActiveWorkOrderBlocks } from '@/app/api/workOrderBlocks/workOrderBlocks';
import { applyWorkOrderTimerSnapshots } from '@/app/api/workOrderTimers/workOrderTimers';
import { removeSpecialCharacters } from '@/helper/removeSpecialCharacters';

// `server-only` guarantees any modules that import code in file
// will never run on the client. Even though this particular api
// doesn't currently use sensitive environment variables, it's
// good practise to add `server-only` preemptively.
// import 'server-only';

// ─── Helpers base ────────────────────────────────────────────────────────────

function asOdooId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function asOdooName(value: any) {
  return Array.isArray(value) ? value[1] : value || '';
}

function normalizeText(value: any) {
  return (value || '').toString().trim();
}

/** Wrapper que convierte getOdooData en Promise y devuelve [] en caso de error */
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

// ─── Resolución de usuario Líder ─────────────────────────────────────────────

function getLeaderOdooUserId(user: any) {
  return Number(user?.odoo_user_id?.toString?.().trim?.() ?? user?.odoo_user_id) || 0;
}

function getDocumentCandidates(document: any) {
  const rawDocument = document?.toString?.().trim?.() || '';
  const cleanDocument = rawDocument ? removeSpecialCharacters(rawDocument).trim() : '';
  return Array.from(new Set([rawDocument, cleanDocument].filter(Boolean)));
}

function getIdentificationDomain(candidates: string[]) {
  if (candidates.length <= 1) return [['identification_id', '=', candidates[0] || '']];
  return ['|', ...candidates.slice(0, 2).map((candidate) => ['identification_id', '=', candidate])];
}

function buildOrDomain(conditions: any[]) {
  const validConditions = conditions.filter(Boolean);
  if (validConditions.length <= 1) return validConditions[0] || [];
  return [...Array(validConditions.length - 1).fill('|'), ...validConditions];
}

function getOdooUserDomain(user: any, fallbackName: any = '') {
  const name = (fallbackName || user?.name || '').toString().trim();
  const email = user?.email?.toString?.().trim?.() || '';
  const documentCandidates = getDocumentCandidates(user?.document);

  return buildOrDomain([
    ...documentCandidates.map((candidate) => ['identification_id', '=', candidate]),
    email ? ['login', '=', email] : null,
    email ? ['email', '=', email] : null,
    name ? ['name', 'ilike', name] : null,
  ]);
}

async function resolveOdooUserByName(user: any, fallbackName: any = '') {
  const name = (fallbackName || user?.name || '').toString().trim();
  const email = user?.email?.toString?.().trim?.() || '';
  const documentCandidates = getDocumentCandidates(user?.document);
  if (!name && !email && !documentCandidates.length) return { userId: 0, employeeId: null };

  const users = await getOdooRecords(
    'res.users',
    getOdooUserDomain(user, fallbackName),
    ['id', 'name', 'login', 'email', 'identification_id', 'employee_ids'],
    user.company_id
  );
  const normalizedName = name.toLowerCase();
  const normalizedEmail = email.toLowerCase();

  const matchedUser = users.find((odooUser: any) =>
    documentCandidates.includes(odooUser.identification_id?.toString?.().trim?.()) ||
    (normalizedEmail && [odooUser.login, odooUser.email].some((value: any) => value?.toString?.().trim?.().toLowerCase?.() === normalizedEmail)) ||
    (normalizedName && odooUser.name?.toString?.().trim?.().toLowerCase?.() === normalizedName)
  ) || users[0];

  return {
    userId: Number(matchedUser?.id) || 0,
    employeeId: Number(asOdooId(matchedUser?.employee_ids)) || null,
  };
}

async function resolveLeaderOdooUserId(user: any) {
  const userId = getLeaderOdooUserId(user);
  if (userId) return userId;

  const employeeId = Number(user?.odoo_id?.toString?.().trim?.() ?? user?.odoo_id) || 0;
  let employeeName = '';
  if (employeeId) {
    const employees = await getOdooRecords(
      'hr.employee',
      [['id', '=', employeeId]],
      ['id', 'name', 'user_id'],
      user.company_id
    );
    employeeName = employees?.[0]?.name || '';
    const employeeUserId = Number(asOdooId(employees?.[0]?.user_id)) || 0;
    if (employeeUserId) return employeeUserId;
  }

  const documentCandidates = getDocumentCandidates(user?.document);
  if (documentCandidates.length) {
    const employees = await getOdooRecords(
      'hr.employee',
      getIdentificationDomain(documentCandidates),
      ['id', 'identification_id', 'name', 'user_id'],
      user.company_id
    );
    employeeName = employees?.[0]?.name || employeeName;
    const employeeUserId = Number(asOdooId(employees?.[0]?.user_id)) || 0;
    if (employeeUserId) return employeeUserId;
  }

  const resolvedUser = await resolveOdooUserByName(user, employeeName);
  return resolvedUser.userId;
}

// ─── Dominios ─────────────────────────────────────────────────────────────────

function getLeaderProductionDomain(userId: number, productionIds: number[] | false = false) {
  const domain: any[] = [['state','in',['confirmed','progress']], ['user_id', '=', userId]];
  if (Array.isArray(productionIds)) domain.push(['id', 'in', productionIds]);
  return domain;
}

// ─── Filtro de producciones con OTs ──────────────────────────────────────────

async function filterProductionsWithRealWorkOrders(user: any, productions: any[] = []) {
  const productionIds = productions.map((production: any) => production.id).filter(Boolean);
  if (!productionIds.length) return [];

  const workorders = await getOdooRecords(
    'mrp.workorder',
    [['production_id', 'in', productionIds]],
    ['id', 'production_id'],
    user.company_id
  );
  const productionIdsWithWorkOrders = new Set(
    workorders.map((workorder: any) => Number(asOdooId(workorder.production_id))).filter(Boolean)
  );

  return productions.filter((production: any) => productionIdsWithWorkOrders.has(Number(production.id)));
}

// ─── Enriquecimiento de OTs (paralelo) ───────────────────────────────────────

function parseOdooDate(dateValue: string) {
  if (!dateValue) return null;
  return new Date(`${dateValue.replace(' ', 'T')}Z`);
}

function isWorkOrderActivelyWorking(workOrder: any) {
  if (!workOrder?.is_user_working) return false;
  if (['done', 'completed', 'cancel'].includes(workOrder?.state)) return false;
  if (['paused', 'blocked'].includes(workOrder?.working_state)) return false;
  return true;
}

function getProductivityDurationSeconds(productivity: any, now: number, countOpenUntilNow = true) {
  const dateStart = parseOdooDate(productivity?.date_start);
  const dateEnd = parseOdooDate(productivity?.date_end);

  if (countOpenUntilNow && dateStart && !Number.isNaN(dateStart.getTime()) && (!productivity?.date_end || productivity.date_end === false)) {
    return Math.max(0, Math.round((now - dateStart.getTime()) / 1000));
  }

  const durationMinutes = Number(productivity?.duration);
  if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
    return Math.max(0, Math.round(durationMinutes * 60));
  }

  if (dateStart && dateEnd && !Number.isNaN(dateStart.getTime()) && !Number.isNaN(dateEnd.getTime())) {
    return Math.max(0, Math.floor((dateEnd.getTime() - dateStart.getTime()) / 1000));
  }

  return 0;
}

async function addWorkOrderDurationsFromProductivity(user: any, workOrders: any[]) {
  const workOrderIds = (workOrders || []).map((workOrder: any) => workOrder.id).filter(Boolean);
  if (!workOrderIds.length) return workOrders || [];

  const productivityData: any[] = await getOdooRecords(
    'mrp.workcenter.productivity',
    [['workorder_id', 'in', workOrderIds]],
    ['id', 'workorder_id', 'date_start', 'date_end', 'duration', 'loss_id'],
    user.company_id
  );

  const now = Date.now();
  const secondsByWorkOrder = new Map<number, number>();
  const activeSinceByWorkOrder = new Map<number, string>();
  const workOrderById = new Map((workOrders || []).map((workOrder: any) => [Number(workOrder.id), workOrder]));

  (productivityData || []).forEach((productivity: any) => {
    // Los registros de perdida (bloqueos/pausas) no forman parte del tiempo real de produccion.
    if (asOdooId(productivity?.loss_id)) return;

    const workOrderId = Number(Array.isArray(productivity?.workorder_id) ? productivity.workorder_id[0] : productivity?.workorder_id);
    if (!workOrderId) return;
    const workOrder = workOrderById.get(workOrderId);
    const countOpenUntilNow = isWorkOrderActivelyWorking(workOrder);

    const durationSeconds = getProductivityDurationSeconds(productivity, now, countOpenUntilNow);
    secondsByWorkOrder.set(workOrderId, (secondsByWorkOrder.get(workOrderId) || 0) + durationSeconds);

    if (countOpenUntilNow && productivity?.date_start && (!productivity?.date_end || productivity.date_end === false)) {
      const currentActiveSince = activeSinceByWorkOrder.get(workOrderId);
      if (!currentActiveSince || String(productivity.date_start) > String(currentActiveSince)) {
        activeSinceByWorkOrder.set(workOrderId, productivity.date_start);
      }
    }
  });

  return (workOrders || []).map((workOrder: any) => {
    const fallbackDurationSeconds = Math.max(0, Math.round(Number(workOrder?.duration || 0) * 60));
    const calculatedDurationSeconds = secondsByWorkOrder.has(Number(workOrder.id))
      ? secondsByWorkOrder.get(Number(workOrder.id)) || 0
      : fallbackDurationSeconds;
    const realDurationSeconds = Math.max(calculatedDurationSeconds, fallbackDurationSeconds);
    const expectedDurationSeconds = Math.max(0, Math.round(Number(workOrder?.duration_expected || 0) * 60));
    const activeSince = activeSinceByWorkOrder.get(Number(workOrder.id));

    return {
      ...workOrder,
      duration: realDurationSeconds / 60,
      piso_real_duration_seconds: realDurationSeconds,
      piso_expected_duration_seconds: expectedDurationSeconds,
      piso_active_since: activeSince || false,
      piso_duration_calculated_at: new Date(now).toISOString(),
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

/**
 * Enriquece las OTs con calidad, duraciones y bloqueos locales en paralelo.
 * Sustituye la cadena secuencial: addQualityState → addDurations → addLocalBlockState
 */
async function enrichWorkOrdersLegacy(user: any, workOrders: any[]) {
  if (!workOrders.length) return workOrders;

  const workOrderIds = workOrders.map((wo: any) => wo.id).filter(Boolean);

  const [withQuality, withDurations, blocksMap] = await Promise.all([
    addQualityStateToWorkOrders(user, workOrders),
    addWorkOrderDurationsFromProductivity(user, workOrders),
    getActiveWorkOrderBlocks(user, workOrderIds),
  ]);

  // Índices para merge eficiente
  const qualityById = new Map(withQuality.map((wo: any) => [Number(wo.id), wo]));
  const durationsById = new Map(withDurations.map((wo: any) => [Number(wo.id), wo]));

  const mergedWorkOrders = workOrders.map((wo: any) => {
    const woId = Number(wo.id);
    const withDur = durationsById.get(woId) || wo;
    const withQual = qualityById.get(woId) || wo;
    const block = blocksMap.get(woId);

    const merged: any = {
      ...wo,
      // Campos de duración
      duration: withDur.duration,
      piso_real_duration_seconds: withDur.piso_real_duration_seconds,
      piso_expected_duration_seconds: withDur.piso_expected_duration_seconds,
      piso_active_since: withDur.piso_active_since,
      // Campos de calidad (solo si hay falla)
      ...(withQual.quality_failed ? {
        quality_failed: withQual.quality_failed,
        quality_failed_count: withQual.quality_failed_count,
        quality_failed_points: withQual.quality_failed_points,
        is_user_working: false,
      } : {}),
    };

    if (block) {
      return {
        ...merged,
        working_state: 'blocked',
        is_user_working: false,
        local_blocked: true,
        local_block_reason_id: block.reason_id,
        local_block_reason_name: block.reason_name,
        local_blocked_by: block.blocked_by,
        local_blocked_at: block.blocked_at,
      };
    }

    return merged;
  });

  return applyWorkOrderTimerSnapshots(user, mergedWorkOrders);
}

// ─── Órdenes de producción (OP) ──────────────────────────────────────────────

async function enrichWorkOrders(user: any, workOrders: any[]) {
  if (!workOrders.length) return workOrders;

  const workOrderIds = workOrders.map((wo: any) => wo.id).filter(Boolean);
  const blocksMap = await getActiveWorkOrderBlocks(user, workOrderIds);
  const withBlockState = workOrders.map((wo: any) => {
    const woId = Number(wo.id);
    const block = blocksMap.get(woId);
    if (!block) return wo;

    return {
      ...wo,
      working_state: 'blocked',
      is_user_working: false,
      local_blocked: true,
      local_block_reason_id: block.reason_id,
      local_block_reason_name: block.reason_name,
      local_blocked_by: block.blocked_by,
      local_blocked_at: block.blocked_at,
    };
  });

  const withQuality = await addQualityStateToWorkOrders(user, withBlockState);
  const withDurations = await addWorkOrderDurationsFromProductivity(user, withQuality);
  return applyWorkOrderTimerSnapshots(user, withDurations);
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
        const leaderUserId = await resolveLeaderOdooUserId(user);
        if(!leaderUserId) {
          reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
          return;
        }

        getOdooData(
          'mrp.production',
          getLeaderProductionDomain(leaderUserId),
          [],
          false,
          false,
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            const productionsWithWorkOrders = await filterProductionsWithRealWorkOrders(user, productions.data);
            resolve({ status: true, message: '', data: productionsWithWorkOrders });
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
          'name asc',
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              reject({ status: false, message: "No tiene ninguna orden de produccion asignada." });
              return;
            }
            const productionsWithWorkOrders = await filterProductionsWithRealWorkOrders(user, productions.data);
            resolve({ status: true, message: '', data: productionsWithWorkOrders });
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
            const productionsWithWorkOrders = await filterProductionsWithRealWorkOrders(user, productions.data);
            resolve({ status: true, message: '', data: productionsWithWorkOrders });
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

// ─── Órdenes de trabajo (OT) ─────────────────────────────────────────────────

export async function getWorkOrders(user: any) {
  switch(user.role) {
    case 'Operario': {
      // 1. Obtener OTs asignadas al operario
      const workOrders = await getOdooRecords(
        'mrp.workorder',
        [['employee_assigned_ids', '=', user.odoo_id], ['state', 'in', ['pending', 'waiting', 'ready', 'progress']]],
        [],
        user.company_id
      );

      if (!workOrders.length) {
        return { status: true, message: '', data: [], production_data: [] };
      }

      const productionIds = Array.from(new Set<number>(
        workOrders.map((wo: any) => Number(asOdooId(wo.production_id))).filter(Boolean)
      ));

      // 2. Producciones y enriquecimiento en paralelo
      const [productions, enrichedWorkOrders] = await Promise.all([
        getOdooRecords(
          'mrp.production',
          [['state', 'in', ['confirmed', 'progress']], ['id', 'in', productionIds]],
          [],
          user.company_id
        ),
        enrichWorkOrders(user, workOrders),
      ]);

      return { status: true, message: '', data: enrichedWorkOrders, production_data: productions };
    }

    case 'Lider': {
      // 1. Resolver el usuario Odoo del líder (una sola vez)
      const leaderUserId = await resolveLeaderOdooUserId(user);
      if (!leaderUserId) {
        return Promise.reject({ status: false, message: 'Su perfil es de Lider, pero no tiene un usuario en Odoo.' });
      }

      // 2. Producciones del líder
      const productions = await getOdooRecords(
        'mrp.production',
        getLeaderProductionDomain(leaderUserId),
        [],
        user.company_id
      );

      if (!productions.length) {
        return { status: true, message: '', data: [], production_data: [] };
      }

      const productionIds = productions.map((p: any) => p.id);

      // 3. OTs de esas producciones
      const workOrders = await getOdooRecords(
        'mrp.workorder',
        [['production_id', 'in', productionIds]],
        [],
        user.company_id,
        'production_id asc, sequence asc, name asc'
      );

      // Filtrar producciones que tienen OTs (equivale a filterProductionsWithRealWorkOrders)
      const productionIdsWithWorkOrders = new Set(
        workOrders.map((wo: any) => Number(asOdooId(wo.production_id))).filter(Boolean)
      );
      const filteredProductions = productions.filter((p: any) => productionIdsWithWorkOrders.has(Number(p.id)));

      // 4. Enriquecer OTs en paralelo
      const enrichedWorkOrders = await enrichWorkOrders(user, workOrders);

      return { status: true, message: '', data: enrichedWorkOrders, production_data: filteredProductions };
    }

    case 'Jefe': {
      // 1. Producciones en curso
      const productions = await getOdooRecords(
        'mrp.production',
        [['state', 'in', ['confirmed', 'progress']]],
        [],
        user.company_id,
        'name asc'
      );

      if (!productions.length) {
        return { status: true, message: '', data: [], production_data: [] };
      }

      const productionIds = productions.map((p: any) => p.id);

      // 2. OTs de esas producciones
      const workOrders = await getOdooRecords(
        'mrp.workorder',
        [['production_id', 'in', productionIds]],
        [],
        user.company_id,
        'production_id asc, sequence asc, name asc'
      );

      // Filtrar producciones que tienen OTs
      const productionIdsWithWorkOrders = new Set(
        workOrders.map((wo: any) => Number(asOdooId(wo.production_id))).filter(Boolean)
      );
      const filteredProductions = productions.filter((p: any) => productionIdsWithWorkOrders.has(Number(p.id)));

      // 3. Enriquecer OTs en paralelo
      const enrichedWorkOrders = await enrichWorkOrders(user, workOrders);

      return { status: true, message: '', data: enrichedWorkOrders, production_data: filteredProductions };
    }

    default:
      return Promise.reject({ status: false, message: "Usted no tiene definido un tipo de usuario." });
  }
}

// ─── Control de Calidad ───────────────────────────────────────────────────────

export async function getQualityControl(user: any) {
  switch(user.role) {
    case 'Lider':
    case 'Jefe':
    case 'Calidad':
      return new Promise(async (resolve) => {
        getOdooData(
          'mrp.production',
          [['state','in',['confirmed','progress']]],
          [],
          false,
          'name asc',
          user.company_id,
          async (productions: any) => {
            if (!productions || !productions.data) {
              resolve({ status: true, message: '', data: [], production_data: [] });
              return;
            }

            const productionOrders = productions.data.map((p: any) => p.id);
            if (!productionOrders.length) {
              resolve({ status: true, message: '', data: [], production_data: [] });
              return;
            }

            getOdooData(
              'quality.check',
              [['production_id','in',productionOrders]],
              [],
              false,
              false,
              user.company_id,
              async (qualityChecksResponse: any) => {
                if (!qualityChecksResponse || !qualityChecksResponse.data) {
                  resolve({ status: true, message: '', data: [], production_data: productions.data });
                  return;
                }

                const visibleQualityChecks = user.role === 'Calidad'
                  ? qualityChecksResponse.data.filter((check: any) => !['pass', 'fail'].includes(check.quality_state))
                  : qualityChecksResponse.data;
                const qualityChecks = await addWorkOrderSequenceToQualityChecks(visibleQualityChecks, user.company_id);
                resolve({ status: true, message: '', data: qualityChecks, production_data: productions.data });
              },
              false
            );
          },
          false
        )
      });
    default:
      return new Promise(async (resolve, reject) => {
        reject({ status: false, message: "Usted no tiene definido un tipo de usuario." });
      })

  }
}

// ─── Razones de bloqueo ───────────────────────────────────────────────────────

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

// ─── Helpers para Quality Control ────────────────────────────────────────────

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

// ─── Notas de Venta / Cliente ─────────────────────────────────────────────────

function getWorkOrderProgress(workorder: any) {
  if (['done', 'completed'].includes(workorder?.state)) return 100;
  const realSeconds = Number(workorder?.piso_real_duration_seconds);
  const expectedSeconds = Number(workorder?.piso_expected_duration_seconds);
  if (Number.isFinite(realSeconds) && Number.isFinite(expectedSeconds) && expectedSeconds > 0) {
    return Math.min(Math.max(Math.round((realSeconds / expectedSeconds) * 100), 0), 100);
  }
  const duration = Number(workorder?.duration);
  const expectedDuration = Number(workorder?.duration_expected);
  if (workorder?.state === 'progress' && Number.isFinite(duration) && Number.isFinite(expectedDuration) && expectedDuration > 0) {
    return Math.min(Math.max(Math.round((duration / expectedDuration) * 100), 0), 100);
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

async function getProductionsBySaleId(saleIds: number[], companyId: string) {
  const productions = await getOdooRecords(
    'mrp.production',
    [['sale_id', 'in', saleIds]],
    CUSTOMER_PRODUCTION_FIELDS,
    companyId
  );

  return productions.map((production: any) => ({
    ...production,
    customer_sale_id: asOdooId(production.sale_id),
  }));
}

async function getProductionsBySaleLineId(saleLines: any[], companyId: string) {
  const saleByLineId = new Map<number, number>(
    saleLines.map((line: any) => [line.id, asOdooId(line.order_id)])
  );
  const lineIds = saleLines.map((line: any) => line.id).filter(Boolean);
  if (!lineIds.length) return [];

  const productions = await getOdooRecords(
    'mrp.production',
    [['sale_line_id', 'in', lineIds]],
    CUSTOMER_PRODUCTION_FIELDS,
    companyId
  );

  return productions.map((production: any) => {
    const saleLineId = asOdooId(production.sale_line_id);
    return {
      ...production,
      customer_sale_id: saleByLineId.get(saleLineId),
      customer_sale_line_id: saleLineId,
    };
  });
}

async function getProductionsByOriginSales(sales: any[], companyId: string) {
  const saleByOriginToken = new Map<string, number>();
  sales.forEach((sale: any) => {
    const tokens = new Set<string>([sale.name]);
    const lastNamePart = sale.name?.split('/').pop();

    if (lastNamePart) {
      tokens.add(lastNamePart);
      tokens.add(lastNamePart.replace(/^0+/, '') || lastNamePart);
    }

    Array.from(tokens).map(normalizeText).filter(Boolean).forEach((token) => {
      saleByOriginToken.set(token, sale.id);
    });
  });

  const productions = await getOdooRecords(
    'mrp.production',
    [['origin', 'in', Array.from(saleByOriginToken.keys())]],
    CUSTOMER_PRODUCTION_FIELDS,
    companyId
  );

  return productions.map((production: any) => ({
    ...production,
    customer_sale_id: saleByOriginToken.get(normalizeText(production.origin)),
  }));
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

  for (let depth = 0; depth < 4 && pendingNames.length; depth += 1) {
    const children = await getOdooRecords(
      'mrp.production',
      [['origin', 'in', pendingNames]],
      CUSTOMER_PRODUCTION_FIELDS,
      user.company_id
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

const CUSTOMER_SALES_LIMIT = 50;

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
      CUSTOMER_SALES_LIMIT,
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

        console.log('Consulta Cliente NV/OP resumen', {
          sale_count: sales.data.length,
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
