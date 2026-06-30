export function getDefaultOdooUserId() {
  const configuredId = Number(process.env.CHRONOS_DEFAULT_ODOO_USER_ID);
  return Number.isFinite(configuredId) && configuredId > 0 ? configuredId : 6;
}
