'use server'

import { Client } from "pg";
import Odoo from "async-odoo-xmlrpc";

// Config DB PostgreSQL
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

// ------------------ HELPERS ------------------

// Obtener datos de empresa para conexión a Odoo
async function getCompanyById(id_company: number) {
  const client = new Client(config);
  await client.connect();

  const res = await client.query(
    `SELECT id_company, name, url, domain, database, user_default, password
     FROM company
     WHERE id_company = $1`,
    [id_company]
  );

  await client.end();
  return res.rows[0];
}

// Buscar empleado en Odoo
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

// Sincronizar user con Odoo (update de odoo_id)
async function syncUserWithOdoo(user: any) {
  const client = new Client(config);
  await client.connect();

  const company = await getCompanyById(user.id_company);
  if (!company) {
    console.warn("No se encontró empresa para el usuario:", user.id_company);
    await client.end();
    return user;
  }

  const empleado = await getEmployeeFromOdoo(company, user.code);

  if (empleado) {
    await client.query(
      `UPDATE users
       SET odoo_id = $1, odoo_user_id = $1
       WHERE id = $2`,
      [empleado.id, user.id]
    );
    console.log(`✅ Usuario ${user.code} vinculado a Odoo ID ${empleado.id}`);
    user.odoo_id = empleado.id;
    user.odoo_user_id = empleado.id;
  } else {
    console.log(`⚠️ Empleado con code ${user.code} no encontrado en Odoo`);
  }

  await client.end();
  return user;
}

// ------------------ CRUD ------------------

// Traer todos los usuarios
export async function getUsers() {
  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "users"');
    await client.end();
    return res.rows;
  } catch (err) {
    console.error(err);
    throw new Error("There was an error trying to get users");
  }
}

// Traer usuario por code
export async function getUsersByID(id: string) {
  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "users" WHERE code = $1', [id]);
    await client.end();

    if (!res.rows[0]) throw new Error(`User with code ${id} not found`);
    return res.rows[0];
  } catch (err) {
    console.error(err);
    throw new Error(`Error getting user with code ${id}`);
  }
}

// Crear usuario y sincronizar con Odoo
export async function createUsers(user: any) {
  const client = new Client(config);
  try {
    await client.connect();

    const query = `
      INSERT INTO users (code, email, id_company, name, password, rol)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol } = user;

    const result = await client.query(query, [
      code,
      email,
      id_company,
      name,
      password,
      rol,
    ]);

    const newUser = result.rows[0];
    await client.end();

    // 🔄 sincronizar con Odoo
    return await syncUserWithOdoo(newUser);
  } catch (error) {
    console.error("Error al crear usuario:", error);
  }
}

// Actualizar usuario y sincronizar con Odoo
export async function updateUsers(user: any) {
  const client = new Client(config);
  try {
    await client.connect();

    const query = `
      UPDATE users
      SET code = $1,
          email = $2,
          id_company = $3,
          name = $4,
          password = $5,
          rol = $6
      WHERE id = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol, id } = user;

    const result = await client.query(query, [
      code,
      email,
      id_company,
      name,
      password,
      rol,
      id,
    ]);

    await client.end();

    if (result.rowCount === 0) {
      console.log(`⚠️ No se encontró usuario con id ${id}`);
      return null;
    }

    const updatedUser = result.rows[0];
    console.log(`✅ Usuario ${updatedUser.name} actualizado en DB`);

    // 🔄 sincronizar con Odoo
    return await syncUserWithOdoo(updatedUser);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
  }
}
