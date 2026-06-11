'use server'

import { Client } from "pg";
import Odoo from "async-odoo-xmlrpc";

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
      [idCompany.toString()]
    );

    return res.rows[0];
  } finally {
    await client.end();
  }
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

  const empleados = await odoo.execute_kw("hr.employee", "search_read", [
    [[["identification_id", "=", code]]],
    ["id", "identification_id", "name"],
  ]);

  return empleados.length > 0 ? empleados[0] : null;
}

async function getOdooEmployeeId(idCompany: string | number, code: string) {
  if (!idCompany || !code) return null;

  try {
    const company = await getCompanyById(idCompany);
    if (!company) {
      console.warn("No se encontro empresa para sincronizar usuario:", idCompany);
      return null;
    }

    const employee = await getEmployeeFromOdoo(company, code.trim());
    if (!employee) {
      console.log(`Empleado con code ${code} no encontrado en Odoo`);
      return null;
    }

    console.log(`Usuario ${code} vinculado a Odoo ID ${employee.id}`);
    return employee.id;
  } catch (error) {
    console.error("Error al sincronizar usuario con Odoo:", error);
    return null;
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

export async function createUsers(user: any) {
  const client = new Client(dbConfig);

  try {
    const { code, email, id_company, name, password, rol, x_studio_new_material } = user;
    const odooEmployeeId = await getOdooEmployeeId(id_company, code);

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
      odooEmployeeId,
      odooEmployeeId,
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
    const odooEmployeeId = await getOdooEmployeeId(id_company, code);

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
      odooEmployeeId,
      odooEmployeeId,
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
