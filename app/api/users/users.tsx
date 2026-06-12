'use server'

import { Client } from "pg";
import Odoo from "async-odoo-xmlrpc";
import { removeSpecialCharacters } from "@/helper/removeSpecialCharacters";

const dbConfig = {
  user: process.env.CHRONOS_DB_USER || "",
  host: process.env.CHRONOS_DB_HOST || "",
  database: process.env.CHRONOS_DB_NAME || "",
  password: process.env.CHRONOS_DB_PASSWORD || "",
  port: process.env.CHRONOS_DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false,
  },
} as any;

async function getCompanyById(idCompany: string | number) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const res = await client.query(
      `SELECT id_company, name, url, domain, database, user_default, password
       FROM company
       WHERE id_company = $1`,
      [idCompany.toString().trim()]
    );

    const company = res.rows[0];
    if (!company) return null;

    return {
      ...company,
      id_company: company.id_company?.trim(),
      name: company.name?.trim(),
      url: company.url?.trim(),
      domain: company.domain?.trim(),
      database: company.database?.trim(),
      user_default: company.user_default?.trim(),
      password: company.password?.trim(),
    };
  } finally {
    await client.end();
  }
}

function getDocumentCandidates(code: string) {
  const rawCode = code?.toString?.().trim?.() || "";
  const cleanCode = rawCode ? removeSpecialCharacters(rawCode).trim() : "";
  return Array.from(new Set([rawCode, cleanCode].filter(Boolean)));
}

function getIdentificationDomain(candidates: string[]) {
  if (candidates.length <= 1) return [["identification_id", "=", candidates[0] || ""]];
  return ["|", ...candidates.slice(0, 2).map((candidate) => ["identification_id", "=", candidate])];
}

function buildOrDomain(conditions: any[]) {
  const validConditions = conditions.filter(Boolean);
  if (validConditions.length <= 1) return validConditions[0] || [];
  return [...Array(validConditions.length - 1).fill("|"), ...validConditions];
}

async function getEmployeeFromOdoo(company: any, code: string) {
  const odoo = new Odoo({
    url: company.url,
    port: "443",
    db: company.database,
    username: company.user_default,
    password: company.password,
  });

  await odoo.connect();

  const candidates = getDocumentCandidates(code);
  const empleados = await odoo.execute_kw("hr.employee", "search_read", [
    getIdentificationDomain(candidates),
    ["id", "identification_id", "name", "user_id"],
    0,
    1,
  ]);

  return empleados.length > 0 ? empleados[0] : null;
}

async function getUserFromOdoo(company: any, userData: any) {
  const name = userData?.name?.toString?.().trim?.() || "";
  const email = userData?.email?.toString?.().trim?.() || "";
  const documentCandidates = getDocumentCandidates(userData?.code || userData?.document || userData?.identification_id || "");
  if (!name && !email && !documentCandidates.length) return null;

  const odoo = new Odoo({
    url: company.url,
    port: "443",
    db: company.database,
    username: company.user_default,
    password: company.password,
  });

  await odoo.connect();

  const domain = buildOrDomain([
    ...documentCandidates.map((candidate) => ["identification_id", "=", candidate]),
    email ? ["login", "=", email] : null,
    email ? ["email", "=", email] : null,
    name ? ["name", "ilike", name] : null,
  ]);

  const users = await odoo.execute_kw("res.users", "search_read", [
    domain,
    ["id", "name", "login", "email", "identification_id", "employee_ids"],
    0,
    10,
  ]);

  if (!users.length) return null;
  const normalizedName = name.toLowerCase();
  const normalizedEmail = email.toLowerCase();

  return users.find((user: any) =>
    documentCandidates.includes(user.identification_id?.toString?.().trim?.()) ||
    (normalizedEmail && [user.login, user.email].some((value: any) => value?.toString?.().trim?.().toLowerCase?.() === normalizedEmail)) ||
    (normalizedName && user.name?.toString?.().trim?.().toLowerCase?.() === normalizedName)
  ) || users[0];
}

async function getOdooEmployeeLink(idCompany: string | number, code: string, userData: any = {}) {
  if (!idCompany || !code) return { employeeId: null, userId: null };

  try {
    const company = await getCompanyById(idCompany);
    if (!company) {
      console.warn("No se encontro empresa para sincronizar usuario:", idCompany);
      return { employeeId: null, userId: null };
    }

    const employee = await getEmployeeFromOdoo(company, code.trim());
    if (!employee) {
      const odooUser = await getUserFromOdoo(company, userData);
      console.log(`Empleado con code ${code} no encontrado en Odoo${odooUser ? `, usuario Odoo ${odooUser.id} encontrado` : ""}`);
      return { employeeId: null, userId: odooUser?.id || null };
    }

    let userId = Array.isArray(employee.user_id) ? employee.user_id[0] : employee.user_id || null;
    if (!userId) {
      const odooUser = await getUserFromOdoo(company, {
        name: employee.name || userData?.name,
        email: userData?.email,
        code: employee.identification_id || code,
      });
      userId = odooUser?.id || null;
    }

    console.log(`Usuario ${code} vinculado a empleado Odoo ${employee.id}${userId ? ` y usuario Odoo ${userId}` : ""}`);
    return { employeeId: employee.id, userId };
  } catch (error) {
    console.error("Error al sincronizar usuario con Odoo:", error);
    return { employeeId: null, userId: null };
  }
}

export async function getUsers() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "users"');
    return res.rows;
  } catch (err) {
    console.error(err);
    throw new Error("There was an error trying to get users");
  } finally {
    await client.end();
  }
}

export async function getUsersByID(id: string) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "users" WHERE code = $1', [id]);

    if (!res.rows[0]) throw new Error(`User with code ${id} not found`);
    return res.rows[0];
  } catch (err) {
    console.error(err);
    throw new Error(`Error getting user with code ${id}`);
  } finally {
    await client.end();
  }
}

export async function refreshUserOdooLink(user: any) {
  const client = new Client(dbConfig);

  try {
    const code = user?.code;
    const idCompany = user?.id_company;
    if (!code || !idCompany) return user;

    const odooEmployeeLink = await getOdooEmployeeLink(idCompany, code, { ...user, code });
    await client.connect();

    const cleanCode = removeSpecialCharacters(code.toString()).trim();
    const result = await client.query(
      `UPDATE users
       SET odoo_id = COALESCE($1, odoo_id),
           odoo_user_id = COALESCE($2, odoo_user_id)
       WHERE TRIM(id_company) = $3
         AND (
           TRIM(code) = $4
           OR regexp_replace(TRIM(code), '[^A-Za-z0-9]', '', 'g') = $5
         )
       RETURNING *`,
      [
        odooEmployeeLink.employeeId,
        odooEmployeeLink.userId,
        idCompany.toString().trim(),
        code.toString().trim(),
        cleanCode,
      ]
    );

    console.log('Sincronizacion IDs Odoo usuario', {
      code: code.toString().trim(),
      id_company: idCompany.toString().trim(),
      odoo_id: odooEmployeeLink.employeeId,
      odoo_user_id: odooEmployeeLink.userId,
      updated: result.rowCount,
    });

    return result.rows[0] || user;
  } catch (error) {
    console.error("Error al refrescar IDs de Odoo del usuario:", error);
    return user;
  } finally {
    await client.end();
  }
}

export async function createUsers(user: any) {
  const client = new Client(dbConfig);

  try {
    const { code, email, id_company, name, password, rol, x_studio_new_material } = user;
    const odooEmployeeLink = await getOdooEmployeeLink(id_company, code, { name, email, code });

    await client.connect();

    const query = `
      INSERT INTO users (code, email, id_company, name, password, rol, x_studio_new_material, odoo_id, odoo_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await client.query(query, [
      code,
      email,
      id_company,
      name,
      password,
      rol,
      Boolean(x_studio_new_material),
      odooEmployeeLink.employeeId,
      odooEmployeeLink.userId,
    ]);

    return result.rows[0];
  } catch (error) {
    console.error("Error al crear usuario:", error);
    throw new Error("No se pudo crear el usuario");
  } finally {
    await client.end();
  }
}

export async function updateUsers(user: any) {
  const client = new Client(dbConfig);

  try {
    const { code, email, id_company, name, password, rol, x_studio_new_material } = user;
    const lookupCode = user.original_code || code;
    const lookupCompany = user.original_id_company || id_company;
    const odooEmployeeLink = await getOdooEmployeeLink(id_company, code, { name, email, code });

    await client.connect();

    const query = `
      UPDATE users
      SET code = $1,
          email = $2,
          id_company = $3,
          name = $4,
          password = $5,
          rol = $6,
          x_studio_new_material = $7,
          odoo_id = $8,
          odoo_user_id = $9
      WHERE code = $10
        AND id_company = $11
      RETURNING *
    `;

    const result = await client.query(query, [
      code,
      email,
      id_company,
      name,
      password,
      rol,
      Boolean(x_studio_new_material),
      odooEmployeeLink.employeeId,
      odooEmployeeLink.userId,
      lookupCode,
      lookupCompany,
    ]);

    if (result.rowCount === 0) {
      console.log(`No se encontro usuario con code ${lookupCode}`);
      return null;
    }

    console.log(`Usuario ${result.rows[0].name} actualizado en DB`);
    return result.rows[0];
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    throw new Error("No se pudo actualizar el usuario");
  } finally {
    await client.end();
  }
}

export async function deleteUsers(user: any) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const code = user.original_code || user.code;
    const idCompany = user.original_id_company || user.id_company;

    const result = await client.query(
      `DELETE FROM users
       WHERE code = $1
         AND id_company = $2
       RETURNING code, id_company`,
      [code, idCompany]
    );

    if (result.rowCount === 0) return null;
    return result.rows[0];
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    throw new Error("No se pudo eliminar el usuario");
  } finally {
    await client.end();
  }
}
