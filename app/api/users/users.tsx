import 'server-only';

import { Client } from "pg";
import { removeSpecialCharacters } from "@/helper/removeSpecialCharacters";
import { getOdooData } from "@/app/api/odoo/odooService";

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

async function ensureCompanyAdministratorColumn(client: Client) {
  await client.query('ALTER TABLE "company" ADD COLUMN IF NOT EXISTS admin_user_code CHARACTER(20)');
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

function readOdooRecords(
  model: string,
  domain: any[],
  fields: string[],
  companyId: string,
  limit = 0
): Promise<any> {
  return new Promise((resolve) => {
    getOdooData(
      model,
      domain,
      fields,
      limit || false,
      false,
      companyId,
      (response: any) => resolve(response),
      false
    );
  });
}

async function getEmployeeFromOdoo(companyId: string, code: string) {
  const candidates = getDocumentCandidates(code);
  const response = await readOdooRecords(
    "hr.employee",
    getIdentificationDomain(candidates),
    ["id", "identification_id", "name", "user_id"],
    companyId,
    1
  );

  return {
    status: Boolean(response?.status),
    message: response?.message,
    employee: response?.status && Array.isArray(response?.data) ? response.data[0] || null : null,
  };
}

async function getUserFromOdoo(companyId: string, userData: any, employeeId?: number | null) {
  const name = userData?.name?.toString?.().trim?.() || "";
  const email = userData?.email?.toString?.().trim?.() || "";
  if (!name && !email && !employeeId) return { status: true, user: null };

  const domain = buildOrDomain([
    employeeId ? ["employee_ids", "in", [employeeId]] : null,
    email ? ["login", "=", email] : null,
    email ? ["email", "=", email] : null,
    name ? ["name", "ilike", name] : null,
  ]);

  const response = await readOdooRecords(
    "res.users",
    domain,
    ["id", "name", "login", "email", "employee_ids"],
    companyId,
    10
  );
  if (!response?.status) return { status: false, message: response?.message, user: null };

  const users = Array.isArray(response.data) ? response.data : [];

  if (!users.length) return { status: true, user: null };
  const normalizedName = name.toLowerCase();
  const normalizedEmail = email.toLowerCase();

  const matchedUser = users.find((user: any) =>
    (employeeId && Array.isArray(user.employee_ids) && user.employee_ids.map(Number).includes(Number(employeeId))) ||
    (normalizedEmail && [user.login, user.email].some((value: any) => value?.toString?.().trim?.().toLowerCase?.() === normalizedEmail)) ||
    (normalizedName && user.name?.toString?.().trim?.().toLowerCase?.() === normalizedName)
  ) || users[0];

  return { status: true, user: matchedUser };
}

async function getOdooEmployeeLink(idCompany: string | number, code: string, userData: any = {}) {
  if (!idCompany || !code) {
    return { status: false, employeeId: null, userId: null, message: 'Faltan la empresa o la identificacion para sincronizar con Odoo.' };
  }

  try {
    const companyId = idCompany.toString().trim();
    const employeeResponse = await getEmployeeFromOdoo(companyId, code.trim());
    if (!employeeResponse.status) {
      const message = employeeResponse?.message?.faultString || employeeResponse?.message?.message || employeeResponse?.message || 'No se pudo consultar hr.employee en Odoo.';
      console.error('Error consultando empleado Odoo:', message);
      return { status: false, employeeId: null, userId: null, message };
    }

    const employee = employeeResponse.employee;
    if (!employee) {
      console.warn(`Empleado con identificacion ${code} no encontrado en Odoo.`);
      return {
        status: false,
        employeeId: null,
        userId: null,
        message: `No se encontro un empleado activo en Odoo con la identificacion ${code}.`,
      };
    }

    let userId = Array.isArray(employee.user_id) ? employee.user_id[0] : employee.user_id || null;
    if (!userId) {
      const userResponse = await getUserFromOdoo(companyId, {
        name: employee.name || userData?.name,
        email: userData?.email,
      }, Number(employee.id));
      if (!userResponse.status) {
        const message = userResponse?.message?.faultString || userResponse?.message?.message || userResponse?.message || 'No se pudo consultar res.users en Odoo.';
        return { status: false, employeeId: employee.id, userId: null, message };
      }
      userId = userResponse.user?.id || null;
    }

    console.log(`Usuario ${code} vinculado a empleado Odoo ${employee.id}${userId ? ` y usuario Odoo ${userId}` : ""}`);
    return { status: true, employeeId: employee.id, userId, message: '' };
  } catch (error) {
    console.error("Error al sincronizar usuario con Odoo:", error);
    return {
      status: false,
      employeeId: null,
      userId: null,
      message: error instanceof Error ? error.message : 'Error inesperado sincronizando el usuario con Odoo.',
    };
  }
}

function validateRequiredOdooLink(roleValue: any, link: any) {
  const role = String(roleValue || '').trim();
  const requiresEmployee = ['Operario', 'Lider', 'Jefe', 'Calidad'].includes(role);
  const requiresOdooUser = ['Lider', 'Jefe'].includes(role);

  if (requiresEmployee && !Number(link?.employeeId)) {
    throw new Error(link?.message || `El perfil ${role} debe estar vinculado a un empleado activo en Odoo.`);
  }
  if (requiresOdooUser && !Number(link?.userId)) {
    throw new Error(`El perfil ${role} debe estar vinculado a una cuenta de usuario en Odoo desde el empleado.`);
  }
}

async function ensureUniqueAccessCredentials(
  client: Client,
  codeValue: any,
  passwordValue: any,
  companyValue: any,
  originalCodeValue?: any,
  originalCompanyValue?: any
) {
  const code = removeSpecialCharacters(String(codeValue || '')).trim().toUpperCase();
  const password = String(passwordValue || '').trim();
  const companyId = String(companyValue || '').trim();
  const originalCode = removeSpecialCharacters(String(originalCodeValue || '')).trim().toUpperCase();
  const originalCompanyId = String(originalCompanyValue || '').trim();

  if (!code || !password || !companyId) return;

  const excludesCurrentUser = Boolean(originalCode && originalCompanyId);
  const result = await client.query(
    `SELECT TRIM(id_company) AS id_company
     FROM users
     WHERE UPPER(regexp_replace(TRIM(code), '[^A-Za-z0-9]', '', 'g')) = $1
       AND TRIM(password) = $2
       AND TRIM(id_company) <> $3
       ${excludesCurrentUser ? `AND NOT (
         UPPER(regexp_replace(TRIM(code), '[^A-Za-z0-9]', '', 'g')) = $4
         AND TRIM(id_company) = $5
       )` : ''}
     LIMIT 1`,
    excludesCurrentUser
      ? [code, password, companyId, originalCode, originalCompanyId]
      : [code, password, companyId]
  );

  if (result.rows[0]) {
    throw new Error(
      'Este numero de identificacion y contrasena ya estan registrados en otra empresa. Use una contrasena diferente.'
    );
  }
}

export async function getUsers() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "users" ORDER BY LOWER(TRIM(name)) ASC');
    return res.rows;
  } catch (err) {
    console.error(err);
    throw new Error("There was an error trying to get users");
  } finally {
    await client.end();
  }
}

export async function getUsersByCredentials(codeValue: any, passwordValue: any) {
  const client = new Client(dbConfig);
  const code = removeSpecialCharacters(String(codeValue || '')).trim().toUpperCase();
  const password = String(passwordValue || '');

  if (!code || !password) return [];

  try {
    await client.connect();
    const result = await client.query(
      `SELECT *
       FROM users
       WHERE UPPER(regexp_replace(TRIM(code), '[^A-Za-z0-9]', '', 'g')) = $1
         AND TRIM(password) = $2
       LIMIT 2`,
      [code, password]
    );
    return result.rows;
  } catch (error) {
    console.error('Error validando credenciales de usuario:', error);
    throw new Error('No se pudieron validar las credenciales');
  } finally {
    await client.end();
  }
}

export async function getUsersByCompany(companyId: string) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const result = await client.query(
      `SELECT *
       FROM users
       WHERE TRIM(id_company) = TRIM($1)
       ORDER BY LOWER(TRIM(name)) ASC`,
      [companyId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error consultando usuarios de la empresa:', error);
    throw new Error('No se pudieron consultar los usuarios de la empresa');
  } finally {
    await client.end();
  }
}

export async function getAssignmentUsersByCompany(companyId: string) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const result = await client.query(
      `SELECT TRIM(code) AS code,
              TRIM(name) AS name,
              TRIM(rol) AS rol,
              TRIM(odoo_id) AS odoo_id,
              TRIM(odoo_user_id) AS odoo_user_id
       FROM users
       WHERE TRIM(id_company) = TRIM($1)
       ORDER BY LOWER(TRIM(name)) ASC`,
      [companyId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error consultando usuarios asignables de la empresa:', error);
    throw new Error('No se pudieron consultar los usuarios asignables de la empresa');
  } finally {
    await client.end();
  }
}

export async function getUserByCompanyAndCode(companyId: string, code: string) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const result = await client.query(
      `SELECT *
       FROM users
       WHERE TRIM(id_company) = TRIM($1)
         AND TRIM(code) = TRIM($2)
       LIMIT 1`,
      [companyId, code]
    );
    return result.rows[0] || null;
  } finally {
    await client.end();
  }
}

export async function getUsersByID(id: string, companyId?: string) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    const res = companyId
      ? await client.query(
          `SELECT * FROM users
           WHERE TRIM(code) = TRIM($1)
             AND TRIM(id_company) = TRIM($2)
           LIMIT 1`,
          [id, companyId]
        )
      : await client.query('SELECT * FROM "users" WHERE code = $1 LIMIT 1', [id]);

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
    await client.connect();
    await ensureUniqueAccessCredentials(client, code, password, id_company);

    const odooEmployeeLink = await getOdooEmployeeLink(id_company, code, { name, email, code });
    validateRequiredOdooLink(rol, odooEmployeeLink);

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
    throw error instanceof Error ? error : new Error("No se pudo crear el usuario");
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
    await client.connect();
    await ensureCompanyAdministratorColumn(client);
    const companyAdminResult = await client.query(
      `SELECT TRIM(admin_user_code) AS admin_user_code
       FROM company
       WHERE TRIM(id_company) = TRIM($1)
         AND TRIM(admin_user_code) = TRIM($2)
       LIMIT 1`,
      [lookupCompany, lookupCode]
    );
    const updatesCompanyAdministrator = Boolean(companyAdminResult.rows[0]);
    if (updatesCompanyAdministrator && (
      id_company?.toString?.().trim?.() !== lookupCompany?.toString?.().trim?.()
      || rol?.toString?.().trim?.() !== 'Jefe'
    )) {
      throw new Error('El administrador designado debe permanecer en la misma empresa y conservar el perfil Jefe.');
    }

    await ensureUniqueAccessCredentials(
      client,
      code,
      password,
      id_company,
      lookupCode,
      lookupCompany
    );

    const odooEmployeeLink = await getOdooEmployeeLink(id_company, code, { name, email, code });
    validateRequiredOdooLink(rol, odooEmployeeLink);

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

    if (updatesCompanyAdministrator && code?.toString?.().trim?.() !== lookupCode?.toString?.().trim?.()) {
      await client.query(
        `UPDATE company
         SET admin_user_code = $1
         WHERE TRIM(id_company) = TRIM($2)
           AND TRIM(admin_user_code) = TRIM($3)`,
        [code, lookupCompany, lookupCode]
      );
    }

    console.log(`Usuario ${result.rows[0].name} actualizado en DB`);
    return result.rows[0];
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    throw error instanceof Error ? error : new Error("No se pudo actualizar el usuario");
  } finally {
    await client.end();
  }
}

export async function deleteUsers(user: any) {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    await ensureCompanyAdministratorColumn(client);
    const code = user.original_code || user.code;
    const idCompany = user.original_id_company || user.id_company;

    const companyAdminResult = await client.query(
      `SELECT 1
       FROM company
       WHERE TRIM(id_company) = TRIM($1)
         AND TRIM(admin_user_code) = TRIM($2)
       LIMIT 1`,
      [idCompany, code]
    );
    if (companyAdminResult.rows[0]) {
      throw new Error('No se puede eliminar al administrador designado de la empresa. Reasigne primero el administrador en la ficha de la empresa.');
    }

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
    if (error instanceof Error && error.message.includes('administrador designado')) throw error;
    throw new Error("No se pudo eliminar el usuario");
  } finally {
    await client.end();
  }
}
