'use server'

import { Pool } from 'pg';

const dbConfig = {
  user: process.env.CHRONOS_DB_USER || '',
  host: process.env.CHRONOS_DB_HOST || '',
  database: process.env.CHRONOS_DB_NAME || '',
  password: process.env.CHRONOS_DB_PASSWORD || '',
  port: Number(process.env.CHRONOS_DB_PORT) || 5432,
  ssl: {
    rejectUnauthorized: false,
  },
} as any;

const _pool = new Pool({ ...dbConfig, max: 5 });
let _tableInitialized = false;

async function ensureWorkOrderTimersTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS work_order_time_snapshots (
      id_company CHARACTER(40) NOT NULL,
      workorder_id INTEGER NOT NULL,
      elapsed_seconds INTEGER NOT NULL DEFAULT 0,
      is_running BOOLEAN NOT NULL DEFAULT FALSE,
      active_since TIMESTAMP,
      updated_by CHARACTER(40),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id_company, workorder_id)
    )
  `);
}

async function withPool<T>(callback: (client: any) => Promise<T>) {
  const client = await _pool.connect();
  try {
    if (!_tableInitialized) {
      await ensureWorkOrderTimersTable(client);
      _tableInitialized = true;
    }
    return await callback(client);
  } finally {
    client.release();
  }
}

function normalizeElapsedSeconds(value: any, fallback = 0) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds);
  return Math.max(0, Math.round(Number(fallback) || 0));
}

function parseDbDate(value: any) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSecondsSince(value: any, now = Date.now()) {
  const date = parseDbDate(value);
  if (!date) return 0;
  return Math.max(0, Math.round((now - date.getTime()) / 1000));
}

function isWorkOrderDone(workOrder: any) {
  return ['done', 'completed', 'cancel'].includes(workOrder?.state);
}

function isTimerAllowedToRun(workOrder: any) {
  if (isWorkOrderDone(workOrder)) return false;
  if (workOrder?.local_blocked || workOrder?.quality_failed) return false;
  if (workOrder?.working_state === 'blocked') return false;
  return true;
}

export async function saveWorkOrderTimerSnapshot(
  user: any,
  workOrderId: number,
  elapsedSeconds: any,
  isRunning: boolean,
  activeSince?: string | null
) {
  const companyId = String(user?.company_id || '').trim();
  const id = Number(workOrderId);
  if (!companyId || !id) return { status: false };

  const elapsed = normalizeElapsedSeconds(elapsedSeconds);

  return withPool(async (client) => {
    const response = await client.query(
      `
      INSERT INTO work_order_time_snapshots (
        id_company,
        workorder_id,
        elapsed_seconds,
        is_running,
        active_since,
        updated_by,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN COALESCE($6::timestamp, NOW()) ELSE NULL END, $5, NOW())
      ON CONFLICT (id_company, workorder_id)
      DO UPDATE SET
        -- El reloj pertenece a Piso y es compartido por todas las sesiones.
        -- Nunca se permite que una pantalla con datos antiguos retroceda el tiempo.
        elapsed_seconds = GREATEST(
          work_order_time_snapshots.elapsed_seconds + CASE
            WHEN work_order_time_snapshots.is_running
              AND work_order_time_snapshots.active_since IS NOT NULL
            THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - work_order_time_snapshots.active_since)))::INTEGER)
            ELSE 0
          END,
          EXCLUDED.elapsed_seconds
        ),
        is_running = EXCLUDED.is_running,
        active_since = CASE
          WHEN EXCLUDED.is_running THEN CASE
            WHEN work_order_time_snapshots.is_running
              AND work_order_time_snapshots.active_since IS NOT NULL
            THEN work_order_time_snapshots.active_since
            ELSE COALESCE(EXCLUDED.active_since, NOW())
          END
          ELSE NULL
        END,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING elapsed_seconds, is_running, active_since
      `,
      [
        companyId,
        id,
        elapsed,
        Boolean(isRunning),
        String(user?.code || user?.email || ''),
        activeSince || null,
      ] as any[]
    );

    const snapshot = response.rows?.[0];
    return {
      status: true,
      elapsed_seconds: normalizeElapsedSeconds(snapshot?.elapsed_seconds, elapsed),
      is_running: Boolean(snapshot?.is_running),
    };
  });
}

export async function getWorkOrderTimerSnapshots(user: any, workOrderIds: number[]) {
  const ids = workOrderIds.map(Number).filter(Boolean);
  if (!ids.length) return new Map<number, any>();

  try {
    const rows = await withPool(async (client) => {
      const response = await client.query(
        `
        SELECT workorder_id, elapsed_seconds, is_running, active_since, updated_at
        FROM work_order_time_snapshots
        WHERE id_company = $1
          AND workorder_id = ANY($2::int[])
        `,
        [String(user?.company_id || ''), ids] as any[]
      );

      return response.rows;
    });

    return new Map<number, any>(rows.map((row: any) => [Number(row.workorder_id), row]));
  } catch (error) {
    console.error('No se pudieron consultar tiempos locales de OT:', error);
    return new Map<number, any>();
  }
}

export async function getSharedWorkOrderTimer(user: any, workOrderId: number) {
  const id = Number(workOrderId);
  if (!id) return { status: false };

  const snapshot = (await getWorkOrderTimerSnapshots(user, [id])).get(id);
  if (!snapshot) return { status: false };

  const now = Date.now();
  const isRunning = Boolean(snapshot.is_running);
  const elapsedSeconds = normalizeElapsedSeconds(snapshot.elapsed_seconds) + (
    isRunning ? getSecondsSince(snapshot.active_since, now) : 0
  );

  return {
    status: true,
    elapsed_seconds: elapsedSeconds,
    is_running: isRunning,
    calculated_at: new Date(now).toISOString(),
  };
}

export async function applyWorkOrderTimerSnapshots(user: any, workOrders: any[]) {
  const workOrderIds = (workOrders || []).map((workOrder: any) => Number(workOrder?.id)).filter(Boolean);
  if (!workOrderIds.length) return workOrders || [];

  const snapshots = await getWorkOrderTimerSnapshots(user, workOrderIds);
  if (!snapshots.size) return workOrders || [];

  const now = Date.now();
  return (workOrders || []).map((workOrder: any) => {
    const snapshot = snapshots.get(Number(workOrder?.id));
    if (!snapshot) return workOrder;

    const snapshotElapsed = normalizeElapsedSeconds(snapshot.elapsed_seconds);
    const canRun = Boolean(snapshot.is_running) && isTimerAllowedToRun(workOrder);
    const realDurationSeconds = canRun
      ? snapshotElapsed + getSecondsSince(snapshot.active_since, now)
      : snapshotElapsed;
    const expectedDurationSource = workOrder?.piso_expected_duration_seconds ?? (Number(workOrder?.duration_expected || 0) * 60);
    const expectedDurationSeconds = Math.max(0, Math.round(Number(expectedDurationSource) || 0));

    return {
      ...workOrder,
      duration: realDurationSeconds / 60,
      piso_real_duration_seconds: realDurationSeconds,
      piso_expected_duration_seconds: expectedDurationSeconds,
      piso_active_since: canRun ? snapshot.active_since : false,
      piso_duration_calculated_at: new Date(now).toISOString(),
      is_user_working: canRun,
    };
  });
}
