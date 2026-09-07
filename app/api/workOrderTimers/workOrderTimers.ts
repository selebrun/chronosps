'use server'

import { Pool } from 'pg';
import { getActiveWorkOrderBlocks } from '@/app/api/workOrderBlocks/workOrderBlocks';

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
      expected_duration_seconds INTEGER,
      workorder_state VARCHAR(32),
      quality_failed BOOLEAN,
      active_quality_check_id INTEGER,
      is_running BOOLEAN NOT NULL DEFAULT FALSE,
      active_since TIMESTAMP,
      updated_by CHARACTER(40),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id_company, workorder_id)
    )
  `);

  await client.query(`
    ALTER TABLE work_order_time_snapshots
      ADD COLUMN IF NOT EXISTS active_since TIMESTAMP,
      ADD COLUMN IF NOT EXISTS expected_duration_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS workorder_state CHARACTER(20),
      ADD COLUMN IF NOT EXISTS quality_failed BOOLEAN,
      ADD COLUMN IF NOT EXISTS active_quality_check_id INTEGER,
      ADD COLUMN IF NOT EXISTS updated_by CHARACTER(40),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  `);

  await client.query(`
    ALTER TABLE work_order_time_snapshots
      ALTER COLUMN workorder_state TYPE VARCHAR(32)
      USING TRIM(workorder_state)
  `);

  await client.query(`
    UPDATE work_order_time_snapshots
    SET active_since = NOW() AT TIME ZONE 'UTC',
        updated_at = NOW()
    WHERE is_running = TRUE
      AND (
        active_since IS NULL
        OR active_since > (NOW() AT TIME ZONE 'UTC') + INTERVAL '10 seconds'
      )
  `);

  await client.query(`
    UPDATE work_order_time_snapshots
    SET active_since = NULL
    WHERE is_running = FALSE
      AND active_since IS NOT NULL
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

function normalizeExpectedDurationSeconds(value: any) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
}

function normalizeSharedWorkOrderState(value: any) {
  const state = value?.toString?.().trim?.().toLowerCase?.() || '';
  return ['progress', 'paused', 'quality_pending', 'quality_failed', 'quality_failed_pending', 'quality_cleared', 'done'].includes(state) ? state : null;
}

function getWorkOrderExpectedDurationSeconds(workOrder: any) {
  return normalizeExpectedDurationSeconds(workOrder?.piso_expected_duration_seconds)
    ?? normalizeExpectedDurationSeconds(Number(workOrder?.duration_expected) * 60);
}

function isWorkOrderDone(workOrder: any) {
  return ['done', 'completed', 'cancel'].includes(workOrder?.state);
}

function isTimerAllowedToRun(workOrder: any) {
  if (isWorkOrderDone(workOrder)) return false;
  if (workOrder?.local_blocked || workOrder?.quality_failed) return false;
  return true;
}

export async function saveWorkOrderTimerSnapshot(
  user: any,
  workOrderId: number,
  elapsedSeconds: any,
  isRunning: boolean,
  activeSince?: string | null,
  expectedDurationSeconds?: any,
  workOrderState?: any,
  qualityFailed?: boolean | null,
  activeQualityCheckId?: number | null
) {
  const companyId = String(user?.company_id || '').trim();
  const id = Number(workOrderId);
  if (!companyId || !id) return { status: false };

  const elapsed = normalizeElapsedSeconds(elapsedSeconds);
  const expectedSeconds = normalizeExpectedDurationSeconds(expectedDurationSeconds);
  const sharedState = normalizeSharedWorkOrderState(workOrderState);

  return withPool(async (client) => {
    const response = await client.query(
      `
      INSERT INTO work_order_time_snapshots (
        id_company,
        workorder_id,
        elapsed_seconds,
        expected_duration_seconds,
        workorder_state,
        quality_failed,
        active_quality_check_id,
        is_running,
        active_since,
        updated_by,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $7,
        $8,
        $9,
        $10,
        $4,
        CASE
          WHEN NOT $4 THEN NULL
          WHEN $6::timestamp BETWEEN
            (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes'
            AND (NOW() AT TIME ZONE 'UTC') + INTERVAL '10 seconds'
          THEN $6::timestamp
          ELSE NOW() AT TIME ZONE 'UTC'
        END,
        $5,
        NOW()
      )
      ON CONFLICT (id_company, workorder_id)
      DO UPDATE SET
        -- El reloj pertenece a Piso y es compartido por todas las sesiones.
        -- Nunca se permite que una pantalla con datos antiguos retroceda el tiempo.
        elapsed_seconds = GREATEST(
          work_order_time_snapshots.elapsed_seconds + CASE
            WHEN work_order_time_snapshots.is_running
              AND work_order_time_snapshots.active_since IS NOT NULL
            THEN GREATEST(
              0,
              ROUND(EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - work_order_time_snapshots.active_since)))::INTEGER
            )
            ELSE 0
          END,
          EXCLUDED.elapsed_seconds
        ),
        expected_duration_seconds = COALESCE(
          NULLIF(work_order_time_snapshots.expected_duration_seconds, 0),
          NULLIF(EXCLUDED.expected_duration_seconds, 0)
        ),
        workorder_state = COALESCE(EXCLUDED.workorder_state, work_order_time_snapshots.workorder_state),
        quality_failed = COALESCE(EXCLUDED.quality_failed, work_order_time_snapshots.quality_failed),
        active_quality_check_id = CASE
          WHEN EXCLUDED.workorder_state IN ('quality_pending', 'quality_failed', 'quality_failed_pending')
            THEN COALESCE(EXCLUDED.active_quality_check_id, work_order_time_snapshots.active_quality_check_id)
          WHEN EXCLUDED.workorder_state IS NOT NULL THEN NULL
          ELSE work_order_time_snapshots.active_quality_check_id
        END,
        is_running = EXCLUDED.is_running,
        active_since = CASE
          WHEN EXCLUDED.is_running THEN CASE
            WHEN work_order_time_snapshots.is_running
              AND work_order_time_snapshots.active_since IS NOT NULL
              AND work_order_time_snapshots.active_since <= (NOW() AT TIME ZONE 'UTC') + INTERVAL '10 seconds'
            THEN work_order_time_snapshots.active_since
            ELSE COALESCE(EXCLUDED.active_since, NOW() AT TIME ZONE 'UTC')
          END
          ELSE NULL
        END,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING elapsed_seconds, expected_duration_seconds, workorder_state, quality_failed, active_quality_check_id, is_running, active_since
      `,
      [
        companyId,
        id,
        elapsed,
        Boolean(isRunning),
        String(user?.code || user?.email || ''),
        activeSince || null,
        expectedSeconds,
        sharedState,
        typeof qualityFailed === 'boolean' ? qualityFailed : null,
        Number(activeQualityCheckId) || null,
      ] as any[]
    );

    const snapshot = response.rows?.[0];
    return {
      status: true,
      elapsed_seconds: normalizeElapsedSeconds(snapshot?.elapsed_seconds, elapsed),
      expected_duration_seconds: normalizeExpectedDurationSeconds(snapshot?.expected_duration_seconds) ?? expectedSeconds,
      workorder_state: normalizeSharedWorkOrderState(snapshot?.workorder_state) ?? sharedState,
      quality_failed: typeof snapshot?.quality_failed === 'boolean' ? snapshot.quality_failed : null,
      active_quality_check_id: Number(snapshot?.active_quality_check_id) || null,
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
        SELECT
          workorder_id,
          elapsed_seconds,
          expected_duration_seconds,
          workorder_state,
          quality_failed,
          active_quality_check_id,
          elapsed_seconds + CASE
            WHEN is_running AND active_since IS NOT NULL THEN GREATEST(
              0,
              ROUND(EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - active_since)))::INTEGER
            )
            ELSE 0
          END AS current_elapsed_seconds,
          is_running,
          active_since,
          updated_at
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

export async function getSharedWorkOrderTimers(user: any, workOrderIds: number[]) {
  const ids = Array.from(new Set(workOrderIds.map(Number).filter(Boolean)));
  if (!ids.length) return [];

  const [snapshots, activeBlocks] = await Promise.all([
    getWorkOrderTimerSnapshots(user, ids),
    getActiveWorkOrderBlocks(user, ids),
  ]);

  return ids.flatMap((id) => {
    const snapshot = snapshots.get(id);
    const activeBlock = activeBlocks.get(id);
    if (!snapshot && !activeBlock) return [];

    return [{
      status: true,
      workorder_id: id,
      has_timer_snapshot: Boolean(snapshot),
      elapsed_seconds: snapshot
        ? normalizeElapsedSeconds(snapshot.current_elapsed_seconds, snapshot.elapsed_seconds)
        : null,
      is_running: Boolean(snapshot?.is_running) && !activeBlock,
      calculated_at: new Date().toISOString(),
      local_blocked: Boolean(activeBlock),
      local_block_reason_id: activeBlock?.reason_id ?? null,
      local_block_reason_name: activeBlock?.reason_name || '',
      local_blocked_by: activeBlock?.blocked_by || '',
      local_blocked_at: activeBlock?.blocked_at || null,
      active_since: snapshot?.active_since || null,
      expected_duration_seconds: normalizeExpectedDurationSeconds(snapshot?.expected_duration_seconds),
      workorder_state: normalizeSharedWorkOrderState(snapshot?.workorder_state),
      quality_failed: typeof snapshot?.quality_failed === 'boolean' ? snapshot.quality_failed : null,
      active_quality_check_id: Number(snapshot?.active_quality_check_id) || null,
    }];
  });
}

export async function getSharedWorkOrderTimer(user: any, workOrderId: number) {
  const id = Number(workOrderId);
  if (!id) return { status: false };

  const timers = await getSharedWorkOrderTimers(user, [id]);
  return timers[0] || { status: false };
}

export async function applyWorkOrderTimerSnapshots(user: any, workOrders: any[]) {
  const workOrderIds = (workOrders || []).map((workOrder: any) => Number(workOrder?.id)).filter(Boolean);
  if (!workOrderIds.length) return workOrders || [];

  const snapshots = await getWorkOrderTimerSnapshots(user, workOrderIds);
  if (!snapshots.size) return workOrders || [];

  const missingExpectedDurations = (workOrders || [])
    .map((workOrder: any) => ({
      workorderId: Number(workOrder?.id),
      expectedSeconds: getWorkOrderExpectedDurationSeconds(workOrder),
      snapshot: snapshots.get(Number(workOrder?.id)),
    }))
    .filter(({ workorderId, expectedSeconds, snapshot }) => (
      workorderId
      && expectedSeconds
      && snapshot
      && !normalizeExpectedDurationSeconds(snapshot.expected_duration_seconds)
    ));

  if (missingExpectedDurations.length) {
    try {
      await withPool(async (client) => {
        for (const item of missingExpectedDurations) {
          await client.query(
            `
            UPDATE work_order_time_snapshots
            SET expected_duration_seconds = $3,
                updated_at = NOW()
            WHERE id_company = $1
              AND workorder_id = $2
              AND (expected_duration_seconds IS NULL OR expected_duration_seconds <= 0)
            `,
            [String(user?.company_id || ''), item.workorderId, item.expectedSeconds] as any[]
          );
          item.snapshot.expected_duration_seconds = item.expectedSeconds;
        }
      });
    } catch (error) {
      console.error('No se pudo conservar la duracion teorica de las OT:', error);
    }
  }

  const now = Date.now();
  return (workOrders || []).map((workOrder: any) => {
    const snapshot = snapshots.get(Number(workOrder?.id));
    if (!snapshot) return workOrder;

    const snapshotElapsed = normalizeElapsedSeconds(snapshot.elapsed_seconds);
    const currentElapsed = normalizeElapsedSeconds(snapshot.current_elapsed_seconds, snapshotElapsed);
    const expectedDurationSeconds = normalizeExpectedDurationSeconds(snapshot.expected_duration_seconds)
      ?? getWorkOrderExpectedDurationSeconds(workOrder)
      ?? 0;
    const sharedState = normalizeSharedWorkOrderState(snapshot.workorder_state);
    const sharedDone = sharedState === 'done';
    const sharedQualityPending = sharedState === 'quality_pending';
    const sharedQualityFailed = snapshot.quality_failed === true || ['quality_failed', 'quality_failed_pending'].includes(String(sharedState));
    const hasSharedQualityState = sharedQualityFailed
      || ['quality_pending', 'quality_cleared'].includes(String(sharedState));
    const canRun = Boolean(snapshot.is_running)
      && isTimerAllowedToRun(workOrder)
      && !sharedQualityPending
      && !sharedQualityFailed;
    const realDurationSeconds = canRun ? currentElapsed : snapshotElapsed;
    const synchronizedWorkingState = workOrder?.local_blocked
      ? 'blocked'
      : sharedDone
        ? 'done'
      : canRun
        ? 'progress'
        : !isWorkOrderDone(workOrder)
          ? 'paused'
          : workOrder?.working_state;

    return {
      ...workOrder,
      duration: realDurationSeconds / 60,
      piso_real_duration_seconds: realDurationSeconds,
      piso_expected_duration_seconds: expectedDurationSeconds,
      piso_active_since: canRun ? snapshot.active_since : false,
      piso_duration_calculated_at: new Date(now).toISOString(),
      state: sharedDone ? 'done' : workOrder?.state,
      quality_pending: sharedDone ? false : sharedQualityPending,
      quality_failed: sharedDone ? false : hasSharedQualityState ? sharedQualityFailed : workOrder?.quality_failed,
      quality_failed_count: sharedDone || (hasSharedQualityState && !sharedQualityFailed) ? 0 : workOrder?.quality_failed_count,
      quality_failed_points: sharedDone || (hasSharedQualityState && !sharedQualityFailed) ? [] : workOrder?.quality_failed_points,
      working_state: synchronizedWorkingState,
      is_user_working: canRun,
    };
  });
}
