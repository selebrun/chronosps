'use server'

import { Client } from 'pg';

const dbConfig = {
  user: process.env.CHRONOS_DB_USER || '',
  host: process.env.CHRONOS_DB_HOST || '',
  database: process.env.CHRONOS_DB_NAME || '',
  password: process.env.CHRONOS_DB_PASSWORD || '',
  port: process.env.CHRONOS_DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false,
  },
} as any;

async function withClient<T>(callback: (client: Client) => Promise<T>) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    await ensureWorkOrderBlocksTable(client);
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function ensureWorkOrderBlocksTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS work_order_blocks (
      id SERIAL PRIMARY KEY,
      id_company CHARACTER(40) NOT NULL,
      workorder_id INTEGER NOT NULL,
      production_id INTEGER,
      reason_id INTEGER,
      reason_name TEXT,
      blocked_by CHARACTER(40),
      blocked_by_role CHARACTER(40),
      blocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
      unblocked_by CHARACTER(40),
      unblocked_at TIMESTAMP,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS work_order_blocks_active_idx
    ON work_order_blocks (id_company, workorder_id)
    WHERE active = TRUE
  `);
}

function getMany2OneId(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

export async function markWorkOrderBlocked(user: any, workOrder: any, reason: any) {
  return withClient(async (client) => {
    await client.query(
      `
      UPDATE work_order_blocks
      SET active = FALSE,
          unblocked_by = $3,
          unblocked_at = NOW()
      WHERE id_company = $1
        AND workorder_id = $2
        AND active = TRUE
      `,
      [String(user.company_id), Number(workOrder.id), String(user.code || user.email || '')] as any[]
    );

    await client.query(
      `
      INSERT INTO work_order_blocks (
        id_company,
        workorder_id,
        production_id,
        reason_id,
        reason_name,
        blocked_by,
        blocked_by_role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        String(user.company_id),
        Number(workOrder.id),
        Number(getMany2OneId(workOrder.production_id)) || null,
        Number(reason?.id) || null,
        reason?.name || '',
        String(user.code || user.email || ''),
        String(user.role || ''),
      ] as any[]
    );

    return { status: true };
  });
}

export async function markWorkOrderUnblocked(user: any, workOrderId: number) {
  return withClient(async (client) => {
    await client.query(
      `
      UPDATE work_order_blocks
      SET active = FALSE,
          unblocked_by = $3,
          unblocked_at = NOW()
      WHERE id_company = $1
        AND workorder_id = $2
        AND active = TRUE
      `,
      [String(user.company_id), Number(workOrderId), String(user.code || user.email || '')] as any[]
    );

    return { status: true };
  });
}

export async function getActiveWorkOrderBlocks(user: any, workOrderIds: number[]) {
  const ids = workOrderIds.map(Number).filter(Boolean);
  if (!ids.length) return new Map<number, any>();

  try {
    const rows = await withClient(async (client) => {
      const response = await client.query(
        `
        SELECT workorder_id, reason_id, reason_name, blocked_by, blocked_by_role, blocked_at
        FROM work_order_blocks
        WHERE id_company = $1
          AND workorder_id = ANY($2::int[])
          AND active = TRUE
        `,
        [String(user.company_id), ids] as any[]
      );

      return response.rows;
    });

    return new Map<number, any>(rows.map((row: any) => [Number(row.workorder_id), row]));
  } catch (error) {
    console.error('No se pudieron consultar bloqueos locales de OT:', error);
    return new Map<number, any>();
  }
}

export async function isWorkOrderLocallyBlocked(user: any, workOrderId: number) {
  const blocks = await getActiveWorkOrderBlocks(user, [workOrderId]);
  return blocks.has(Number(workOrderId));
}

export async function addLocalBlockState(user: any, workOrders: any[]) {
  const blocks = await getActiveWorkOrderBlocks(user, (workOrders || []).map((workOrder: any) => workOrder.id));

  return (workOrders || []).map((workOrder: any) => {
    const block = blocks.get(Number(workOrder.id));
    if (!block) return workOrder;

    return {
      ...workOrder,
      working_state: 'blocked',
      is_user_working: false,
      local_blocked: true,
      local_block_reason_id: block.reason_id,
      local_block_reason_name: block.reason_name,
      local_blocked_by: block.blocked_by,
      local_blocked_at: block.blocked_at,
    };
  });
}
