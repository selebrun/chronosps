'use server'

import { Client } from "pg";

// DB connection config
const config = {
  user: process.env.CHRONOS_DB_USER || "",
  host: process.env.CHRONOS_DB_HOST || "",
  database: process.env.CHRONOS_DB_NAME || "",
  password: process.env.CHRONOS_DB_PASSWORD || "",
  port: process.env.CHRONOS_DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  }
} as any;

async function ensureCompanyDefaultOdooUserColumn(client: Client) {
  await client.query('ALTER TABLE "company" ADD COLUMN IF NOT EXISTS default_odoo_user_id INTEGER');
}

function normalizeDefaultOdooUserId(value: any) {
  const userId = Number(value);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

/**
 * getCompanies
 * 
 * Retorna todas las companias disponibles en la base de datos
 * 
 * Esta funcion es exclusivamente para usarla
 * del lado del servidor
 */

export async function getCompanies() {
  const client = new Client(config);

  try {
    await client.connect();
    await ensureCompanyDefaultOdooUserColumn(client);
    const res = await client.query('SELECT * FROM "company" ORDER BY LOWER(TRIM(name)) ASC');
    const companies = res.rows;

    return companies;
  } catch (err) {
    console.error(config,err)
    throw new Error("There was an error trying to get companies");
  } finally {
    await client.end();
  }
}

/**
 * getCompanyByID
 * 
 * Retorna una compania en base a su ID
 * 
 * Esta funcion es exclusivamente para usarla
 * del lado del servidor
 */

export async function getCompanyByID(companyId: string) {
  const client = new Client(config);

  try {
    await client.connect();
    await ensureCompanyDefaultOdooUserColumn(client);
    const res = await client.query('SELECT * FROM "company" WHERE id_company = $1', [companyId]);
    const company = res.rows[0];

    if (!company) {
      throw new Error(`Company with id ${companyId} not found`);
    }

    return company;
  } catch (err) {
    console.error(err)
    throw new Error(`There was an error trying to get company with id ${companyId}`);
  } finally {
    await client.end();
  }
}

/**
 * createCompany
 * 
 * Crea una compania y retorna los datos de la compania creada
 * 
 * Esta funcion es exclusivamente para usarla
 * del lado del servidor
 */
export async function createCompany(companyData: any) {
  const client = new Client(config);

  try {
    await client.connect();
    console.log("Conectado correctamente al servidor PostgreSQL en Azure");

    const query = `
        INSERT INTO company (id_company, name, url, domain, database, user_default, password, default_odoo_user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

    await ensureCompanyDefaultOdooUserColumn(client);
    await client.query(query, [
      companyData.id_company,
      companyData.name,
      companyData.url,
      companyData.domain,
      companyData.database,
      companyData.user_default,
      companyData.password,
      normalizeDefaultOdooUserId(companyData.default_odoo_user_id)
    ]);
    return companyData
  } catch (error) {
    console.error("Error al crear la empresa:", error);
    throw new Error("No se pudo crear la compania");
  } finally {
    await client.end();
  }
}

/**
 * updateCompany
 * 
 * Actualiza los datos de una empresa en la base de datos según su ID
 * Retorna los datos de la compania
 * 
 * Esta función es exclusivamente para usarla del lado del servidor
 */
export async function updateCompany(companyData: any) {
  const client = new Client(config);

  try {
    await client.connect();
    console.log("Conectado correctamente al servidor PostgreSQL en Azure");

    const query = `
        UPDATE company
        SET name = $1, url = $2, domain = $3, database = $4, user_default = $5, password = $6, default_odoo_user_id = $7
        WHERE id_company = $8
      `;

    await ensureCompanyDefaultOdooUserColumn(client);
    await client.query(query, [
      companyData.name,
      companyData.url,
      companyData.domain,
      companyData.database,
      companyData.user_default,
      companyData.password,
      normalizeDefaultOdooUserId(companyData.default_odoo_user_id),
      companyData.id_company
    ]);
  
    console.log(`Empresa con ID ${companyData.id_company} actualizada correctamente`);
    return companyData
  
  } catch (error) {
    console.error("Error al actualizar la empresa:", error);
    throw new Error("No se pudo actualizar la compania");
  } finally {
    await client.end();
  }
}

export async function deleteCompany(companyData: any) {
  const client = new Client(config);
  const companyId = companyData?.id_company;

  if (!companyId) {
    throw new Error("Debe indicar la compania a eliminar");
  }

  try {
    await client.connect();

    const usersResult = await client.query(
      'SELECT COUNT(*)::int AS total FROM "users" WHERE id_company = $1',
      [companyId]
    );
    const usersCount = Number(usersResult.rows[0]?.total || 0);

    if (usersCount > 0) {
      return {
        status: false,
        message: "No se puede eliminar la compania porque tiene usuarios asociados.",
        usersCount,
      };
    }

    const result = await client.query(
      'DELETE FROM "company" WHERE id_company = $1 RETURNING id_company',
      [companyId]
    );

    if (result.rowCount === 0) return null;
    return { status: true, company: result.rows[0] };
  } catch (error) {
    console.error("Error al eliminar la empresa:", error);
    throw new Error("No se pudo eliminar la compania");
  } finally {
    await client.end();
  }
}
