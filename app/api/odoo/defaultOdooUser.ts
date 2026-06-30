import { getCompanies } from "@/app/api/companies/companies";

let defaultUsersByCompanyCache: { data: Map<string, number>; expiresAt: number } | null = null;

function getGlobalDefaultOdooUserId() {
  const configuredId = Number(process.env.CHRONOS_DEFAULT_ODOO_USER_ID);
  return Number.isFinite(configuredId) && configuredId > 0 ? configuredId : 6;
}

export async function getDefaultOdooUserId(companyId?: string) {
  const fallbackId = getGlobalDefaultOdooUserId();
  const cleanCompanyId = companyId?.toString?.().trim?.();
  if (!cleanCompanyId) return fallbackId;

  try {
    const now = Date.now();
    if (!defaultUsersByCompanyCache || defaultUsersByCompanyCache.expiresAt <= now) {
      const companies = await getCompanies();
      const entries = (companies || []).reduce<Array<[string, number]>>((acc, company: any) => {
        const id = company?.id_company?.toString?.().trim?.();
        const userId = Number(company?.default_odoo_user_id);
        if (id && Number.isFinite(userId) && userId > 0) {
          acc.push([id, userId]);
        }
        return acc;
      }, []);

      defaultUsersByCompanyCache = {
        data: new Map(entries),
        expiresAt: now + 5 * 60 * 1000,
      };
    }

    return defaultUsersByCompanyCache.data.get(cleanCompanyId) || fallbackId;
  } catch (error) {
    console.error('No se pudo resolver usuario Odoo por defecto por compania:', error);
    return fallbackId;
  }
}
