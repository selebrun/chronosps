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

async function syncUserWithOdoo(user: any) {
  if (!user) return user;

  try {
    const company = await getCompanyById(user.id_company);
    if (!company) {
      console.warn("No se encontro empresa para el usuario:", user.id_company);
      return user;
    }

    const employee = await getEmployeeFromOdoo(company, user.code);
    if (!employee) {
      console.log(`Empleado con code ${user.code} no encontrado en Odoo`);
      return user;
    }

    const client = new Client(dbConfig);
    try {
      await client.connect();
      await client.query(
        `UPDATE users
         SET odoo_id = $1, odoo_user_id = $1
         WHERE code = $2`,
        [employee.id, user.code]
      );
    } finally {
      await client.end();
    }

    console.log(`Usuario ${user.code} vinculado a Odoo ID ${employee.id}`);
    return {
      ...user,
      odoo_id: employee.id,
      odoo_user_id: employee.id,
    };
  } catch (error) {
    console.error("Error al sincronizar usuario con Odoo:", error);
    return user;
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
  let newUser;

  try {
    await client.connect();

    const query = `
      INSERT INTO users (code, email, id_company, name, password, rol, materiales)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol, materiales } = user;
    const result = await client.query(query, [
      code,
      email,
      id_company,
      name,
      password,
      rol,
      Boolean(materiales),
    ]);

    newUser = result.rows[0];
  } catch (error) {
    console.error("Error al crear usuario:", error);
    throw new Error("No se pudo crear el usuario");
  } finally {
    await client.end();
  }

  return syncUserWithOdoo(newUser);
}

export async function updateUsers(user: any) {
  const client = new Client(dbConfig);
  let updatedUser;

  try {
    await client.connect();

    const query = `
      UPDATE users
      SET code = $1,
          email = $2,
          id_company = $3,
          name = $4,
          password = $5,
          rol = $6,
          materiales = $7
      WHERE code = $8
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol, materiales } = user;
    const lookupCode = user.original_code || code;

    const result = await client.query(query, [
      code,
      email,
      id_company,
      name,
      password,
      rol,
      Boolean(materiales),
      lookupCode,
    ]);

    if (result.rowCount === 0) {
      console.log(`No se encontro usuario con code ${lookupCode}`);
      return null;
    }

    updatedUser = result.rows[0];
    console.log(`Usuario ${updatedUser.name} actualizado en DB`);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    throw new Error("No se pudo actualizar el usuario");
  } finally {
    await client.end();
  }

  return syncUserWithOdoo(updatedUser);
}
