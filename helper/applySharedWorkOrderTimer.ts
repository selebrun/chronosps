function normalizeState(value: any) {
  return value?.toString?.().trim?.().toLowerCase?.() || '';
}

export function applySharedWorkOrderTimer(order: any, timer: any) {
  const orderId = Number(order?.id);
  const timerWorkOrderId = Number(timer?.workorder_id);
  if (!orderId || (timerWorkOrderId && orderId !== timerWorkOrderId)) return order;

  const isBlocked = Boolean(timer?.local_blocked);
  const sharedState = normalizeState(timer?.workorder_state);
  const sharedDone = sharedState === 'done';
  const sharedQualityPending = sharedState === 'quality_pending';
  const sharedQualityFailed = timer?.quality_failed === true || ['quality_failed', 'quality_failed_pending'].includes(sharedState);
  const hasSharedQualityState = sharedQualityFailed
    || ['quality_pending', 'quality_cleared', 'progress', 'done'].includes(sharedState);
  const orderState = normalizeState(order?.state);
  const orderIsDone = ['done', 'completed', 'cancel'].includes(orderState);
  const canRun = Boolean(timer?.is_running)
    && !sharedDone
    && !isBlocked
    && !sharedQualityPending
    && !sharedQualityFailed
    && !(order?.quality_failed && !hasSharedQualityState)
    && !orderIsDone;
  const elapsedSeconds = timer?.has_timer_snapshot === false
    ? Number(order?.piso_real_duration_seconds || Number(order?.duration || 0) * 60)
    : Number(timer?.elapsed_seconds || 0);
  const expectedSeconds = Number(timer?.expected_duration_seconds);
  const sharedWorkingState = isBlocked
    ? 'blocked'
    : sharedDone
      ? 'done'
      : canRun
        ? 'progress'
        : !orderIsDone && timer?.has_timer_snapshot !== false
          ? 'paused'
          : order?.working_state === 'blocked' ? 'paused' : order?.working_state;

  return {
    ...order,
    state: sharedDone ? 'done' : order?.state,
    quality_pending: sharedDone ? false : sharedQualityPending,
    quality_failed: sharedDone ? false : hasSharedQualityState ? sharedQualityFailed : order?.quality_failed,
    quality_failed_count: sharedDone || (hasSharedQualityState && !sharedQualityFailed) ? 0 : order?.quality_failed_count,
    quality_failed_points: sharedDone || (hasSharedQualityState && !sharedQualityFailed) ? [] : order?.quality_failed_points,
    duration: elapsedSeconds / 60,
    piso_real_duration_seconds: elapsedSeconds,
    piso_expected_duration_seconds: Number.isFinite(expectedSeconds) && expectedSeconds > 0
      ? expectedSeconds
      : order?.piso_expected_duration_seconds,
    piso_duration_calculated_at: timer?.calculated_at,
    local_blocked: isBlocked,
    local_block_reason_id: timer?.local_block_reason_id ?? null,
    local_block_reason_name: timer?.local_block_reason_name || '',
    local_blocked_by: timer?.local_blocked_by || '',
    local_blocked_at: timer?.local_blocked_at || null,
    working_state: sharedWorkingState,
    is_user_working: canRun,
  };
}
