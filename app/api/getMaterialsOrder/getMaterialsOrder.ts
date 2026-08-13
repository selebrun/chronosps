'use server'

import { getDefaultOdooUserId } from '@/app/api/odoo/defaultOdooUser';
import { executeOdooMethod, getOdooData } from '@/app/api/odoo/odooService';

type OdooFieldDefinition = {
  readonly?: boolean;
  required?: boolean;
  type?: string;
};

const STOCK_MOVE_FIELD_CANDIDATES = [
  'id',
  'name',
  'description_picking',
  'reference',
  'product_id',
  'location_id',
  'location_dest_id',
  'company_id',
  'product_uom_qty',
  'product_uom',
  'forecast_availability',
  'operation_id',
  'workorder_id',
  'raw_material_production_id',
  'bom_line_id',
  'state',
  'additional',
  'manual_consumption',
  'quantity',
  'quantity_done',
  'picked',
];

const STOCK_MOVE_FALLBACK_FIELDS = [
  'id',
  'product_id',
  'location_id',
  'location_dest_id',
  'company_id',
  'product_uom_qty',
  'product_uom',
  'forecast_availability',
  'operation_id',
  'workorder_id',
  'raw_material_production_id',
  'state',
];

const stockMoveFieldsByCompany = new Map<string, Record<string, OdooFieldDefinition>>();

async function getOdooExecutionUserId(user: any) {
  const defaultUserId = await getDefaultOdooUserId(user?.company_id);
  if (user?.role === 'Operario') return defaultUserId;
  return Number(user?.odoo_user_id) || defaultUserId;
}

function callOdooMethod(
  model: string,
  method: string,
  args: any[],
  companyId: string,
  kwargs: any = false,
  uidOverride: number | false = false
): Promise<any> {
  return new Promise((resolve) => {
    executeOdooMethod(model, method, args, companyId, (data: any) => resolve(data), kwargs, uidOverride);
  });
}

function getOdooResponse(
  model: string,
  domain: any[],
  fields: string[],
  companyId: string,
  limit: number | false = false,
  order: string | false = false
): Promise<any> {
  return new Promise((resolve) => {
    getOdooData(model, domain, fields, limit, order, companyId, (data: any) => resolve(data), false);
  });
}

function getOdooError(data: any, fallback: string) {
  const message = data?.message?.faultString || data?.message?.message || data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function getMany2OneId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function getOdooIds(value: any): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => Number(getMany2OneId(item))).filter(Boolean);
}

function buildOrDomain(conditions: any[][]) {
  if (!conditions.length) return [];
  if (conditions.length === 1) return [conditions[0]];
  return [...Array(conditions.length - 1).fill('|'), ...conditions];
}

async function getStockMoveFieldDefinitions(companyId: string) {
  const cacheKey = String(companyId || '').trim();
  const cachedFields = stockMoveFieldsByCompany.get(cacheKey);
  if (cachedFields) return cachedFields;

  const fieldsResponse = await callOdooMethod(
    'stock.move',
    'fields_get',
    [],
    companyId,
    { attributes: ['type', 'readonly', 'required'] }
  );

  if (fieldsResponse?.status && fieldsResponse?.data) {
    stockMoveFieldsByCompany.set(cacheKey, fieldsResponse.data);
    return fieldsResponse.data as Record<string, OdooFieldDefinition>;
  }

  // The fallback intentionally excludes version-sensitive fields such as `name`.
  return Object.fromEntries(STOCK_MOVE_FALLBACK_FIELDS.map((field) => [field, {}]));
}

function normalizeMaterialMove(move: any) {
  const displayName = move?.name || move?.description_picking || move?.reference || '';
  return {
    ...move,
    name: displayName,
    material_display_name: displayName,
  };
}

export async function getMaterialsOrder(user: any, move_raw_ids: any, workorder?: any): Promise<any> {
  const companyId = String(user?.company_id || '').trim();
  const workOrderId = Number(workorder?.id) || 0;
  if (!companyId || !workOrderId) {
    return { status: false, message: 'No se pudo identificar la compania o la orden de trabajo.', data: [] };
  }

  const fieldDefinitions = await getStockMoveFieldDefinitions(companyId);
  const availableFields = new Set(Object.keys(fieldDefinitions));
  const readFields = STOCK_MOVE_FIELD_CANDIDATES.filter((field) => availableFields.has(field));

  const workOrderResponse = await getOdooResponse(
    'mrp.workorder',
    [['id', '=', workOrderId]],
    ['id', 'move_raw_ids', 'operation_id', 'production_id'],
    companyId,
    1
  );
  if (!workOrderResponse?.status) {
    return {
      status: false,
      message: getOdooError(workOrderResponse, 'No se pudo consultar la orden de trabajo en Odoo.'),
      data: [],
    };
  }

  const freshWorkOrder = workOrderResponse?.data?.[0] || workorder || {};
  const workOrderMoveIds = getOdooIds(freshWorkOrder?.move_raw_ids);
  const workOrderOperationId = Number(getMany2OneId(freshWorkOrder?.operation_id || workorder?.operation_id)) || 0;
  const productionId = Number(getMany2OneId(freshWorkOrder?.production_id || workorder?.production_id)) || 0;
  const productionResponse = productionId
    ? await getOdooResponse(
      'mrp.production',
      [['id', '=', productionId]],
      ['id', 'move_raw_ids'],
      companyId,
      1
    )
    : null;
  const productionMoveIds = Array.from(new Set([
    ...getOdooIds(move_raw_ids),
    ...getOdooIds(productionResponse?.data?.[0]?.move_raw_ids),
  ]));
  const candidateMoveIds = Array.from(new Set([...workOrderMoveIds, ...productionMoveIds]));

  const conditions: any[][] = [];
  if (candidateMoveIds.length) conditions.push(['id', 'in', candidateMoveIds]);
  if (availableFields.has('workorder_id')) conditions.push(['workorder_id', '=', workOrderId]);
  if (!conditions.length && productionId && availableFields.has('raw_material_production_id')) {
    conditions.push(['raw_material_production_id', '=', productionId]);
  }

  if (!conditions.length) {
    return { status: true, message: '', data: [] };
  }

  const materialsResponse = await getOdooResponse(
    'stock.move',
    buildOrDomain(conditions),
    readFields,
    companyId,
    false,
    'id asc'
  );
  if (!materialsResponse?.status) {
    return {
      status: false,
      message: getOdooError(materialsResponse, 'No se pudieron consultar los materiales en Odoo.'),
      data: [],
    };
  }

  const moves = (Array.isArray(materialsResponse.data) ? materialsResponse.data : [])
    .filter((move: any) => move?.state !== 'cancel');
  const workOrderMoveIdSet = new Set(workOrderMoveIds);
  const workOrderProducts = moves.filter((move: any) => (
    workOrderMoveIdSet.has(Number(move?.id))
    || Number(getMany2OneId(move?.workorder_id)) === workOrderId
  ));
  const operationProducts = workOrderOperationId
    ? moves.filter((move: any) => Number(getMany2OneId(move?.operation_id)) === workOrderOperationId)
    : [];

  const productionProducts = productionId
    ? moves.filter((move: any) => Number(getMany2OneId(move?.raw_material_production_id)) === productionId)
    : moves;
  const selectedMoves = workOrderProducts.length
    ? workOrderProducts
    : operationProducts.length
      ? operationProducts
      : productionProducts.length
        ? productionProducts
        : moves;
  const selectionScope = workOrderProducts.length
    ? 'workorder'
    : operationProducts.length
      ? 'operation'
      : 'production';

  console.log('Consulta materiales OT', {
    workorder_id: workOrderId,
    production_id: productionId,
    operation_id: workOrderOperationId || null,
    workorder_move_count: workOrderMoveIds.length,
    production_move_count: productionMoveIds.length,
    selected_move_count: selectedMoves.length,
    selection_scope: selectionScope,
  });

  return {
    status: true,
    message: '',
    data: selectedMoves.map(normalizeMaterialMove),
    notice: selectedMoves.length && selectionScope === 'production'
      ? 'Esta OT no tiene componentes asignados directamente. Se muestran los materiales de la orden de produccion.'
      : '',
  };
}

export async function saveMaterialsOrder(
  user: any,
  workorder_id: any,
  production_id: any,
  product_id: any,
  uom: any,
  product_qty: any,
  location_id: any,
  location_dest_id: any,
  company_id: any,
  product_name?: string,
  operation_id?: any
): Promise<any> {
  if (!user?.materiales) {
    return {
      status: false,
      message: 'Su usuario no tiene permitido anadir materiales adicionales al BOM. Contacte con un supervisor.',
    };
  }

  const workOrderId = Number(workorder_id);
  const productionId = Number(production_id);
  const productId = Number(product_id);
  const uomId = Number(uom);
  const quantity = Number(product_qty);
  const locationId = Number(location_id);
  const locationDestId = Number(location_dest_id);
  const odooCompanyId = Number(company_id);
  const operationId = Number(getMany2OneId(operation_id)) || 0;

  if (
    !workOrderId
    || !productionId
    || !productId
    || !uomId
    || !Number.isFinite(quantity)
    || quantity <= 0
    || !locationId
    || !locationDestId
    || !odooCompanyId
  ) {
    return {
      status: false,
      message: 'Faltan datos o la cantidad no es valida para agregar el material a la orden de produccion.',
    };
  }

  const chronosCompanyId = String(user?.company_id || '').trim();
  const fieldDefinitions = await getStockMoveFieldDefinitions(chronosCompanyId);
  const availableFields = new Set(Object.keys(fieldDefinitions));
  const values: Record<string, any> = {};
  const setValue = (field: string, value: any) => {
    if (availableFields.has(field)) values[field] = value;
  };

  setValue('name', product_name || 'Material adicional');
  setValue('description_picking', product_name || 'Material adicional');
  setValue('product_id', productId);
  setValue('product_uom_qty', quantity);
  setValue('product_uom', uomId);
  setValue('location_id', locationId);
  setValue('location_dest_id', locationDestId);
  setValue('raw_material_production_id', productionId);
  setValue('workorder_id', workOrderId);
  setValue('company_id', odooCompanyId);
  setValue('procure_method', 'make_to_stock');
  setValue('additional', true);
  setValue('manual_consumption', true);
  setValue('picked', true);
  if (availableFields.has('quantity')) {
    values.quantity = quantity;
  } else {
    setValue('quantity_done', quantity);
  }
  if (operationId) setValue('operation_id', operationId);

  const odooExecutionUserId = await getOdooExecutionUserId(user);
  const context = {
    force_manual_consumption: true,
    default_raw_material_production_id: productionId,
    default_workorder_id: workOrderId,
    default_operation_id: operationId || false,
    allowed_company_ids: [odooCompanyId],
    company_id: odooCompanyId,
  };

  // Writing through mrp.production reproduces Odoo's own Components tab flow.
  // Odoo creates the move, auto-confirms it and runs its procurement hooks atomically.
  const writeResult = await callOdooMethod(
    'mrp.production',
    'write',
    [[productionId], { move_raw_ids: [[0, 0, values]] }],
    chronosCompanyId,
    { context },
    odooExecutionUserId
  );
  if (!writeResult?.status) {
    return {
      status: false,
      message: getOdooError(writeResult, 'Ocurrio un error al agregar el material en Odoo.'),
    };
  }

  const assignResult = await callOdooMethod(
    'mrp.production',
    'action_assign',
    [[productionId]],
    chronosCompanyId,
    { context },
    odooExecutionUserId
  );

  const verificationDomain: any[] = [
    ['raw_material_production_id', '=', productionId],
    ['product_id', '=', productId],
    ['state', '!=', 'cancel'],
  ];
  if (availableFields.has('workorder_id')) verificationDomain.push(['workorder_id', '=', workOrderId]);
  if (operationId && availableFields.has('operation_id')) verificationDomain.push(['operation_id', '=', operationId]);
  const verificationFields = STOCK_MOVE_FIELD_CANDIDATES.filter((field) => availableFields.has(field));
  const verificationResult = await callOdooMethod(
    'stock.move',
    'search_read',
    [verificationDomain],
    chronosCompanyId,
    { fields: verificationFields, limit: 1, order: 'id desc', context },
    odooExecutionUserId
  );
  const createdMove = verificationResult?.status && Array.isArray(verificationResult.data)
    ? verificationResult.data[0]
    : null;

  console.log('Material adicional guardado en Odoo', {
    workorder_id: workOrderId,
    production_id: productionId,
    product_id: productId,
    product_qty: quantity,
    move_id: createdMove?.id || null,
    move_state: createdMove?.state || null,
    assigned: Boolean(assignResult?.status),
  });

  return {
    status: true,
    message: 'Material adicional agregado.',
    data: createdMove ? normalizeMaterialMove(createdMove) : true,
    warning: !assignResult?.status
      ? getOdooError(assignResult, 'El material fue agregado, pero quedo pendiente revisar su disponibilidad en Odoo.')
      : !createdMove
        ? 'El material fue agregado, pero Odoo no devolvio el movimiento al verificarlo.'
        : '',
  };
}
