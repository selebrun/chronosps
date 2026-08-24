export function applySuccessfulWorkOrderAction(order: any, action: string) {
  switch (action) {
    case 'start_work_order':
      return {
        ...order,
        is_user_working: true,
        working_state: 'progress',
        local_blocked: false,
        quality_pending: false,
        quality_failed: false,
      };
    case 'stop_work_order':
      return { ...order, is_user_working: false, working_state: 'paused' };
    case 'block_work_order':
      return { ...order, is_user_working: false, working_state: 'blocked', local_blocked: true };
    case 'unblock_work_order':
      return { ...order, is_user_working: false, working_state: 'paused', local_blocked: false };
    case 'release_quality_failure':
      return { ...order, is_user_working: false, working_state: 'paused', quality_failed: false };
    case 'finish_work_order':
      return {
        ...order,
        state: 'done',
        is_user_working: false,
        working_state: 'done',
        local_blocked: false,
        quality_pending: false,
        quality_failed: false,
        piso_active_elapsed_seconds: 0,
      };
    default:
      return order;
  }
}
