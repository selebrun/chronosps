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

  try {
    await client.connect();
<<<<<<< ours

    const res = await client.query(
      `SELECT id_company, name, url, domain, database, user_default, password
       FROM company
       WHERE id_company = $1`,
      [id_company]
    );

=======

    const res = await client.query(
      `SELECT id_company, name, url, domain, database, user_default, password
       FROM company
       WHERE id_company = $1`,
      [id_company]
    );

>>>>>>> theirs
    return res.rows[0];
  } finally {
    await client.end();
  }
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
  try {
    const company = await getCompanyById(user.id_company);
    if (!company) {
      console.warn("No se encontró empresa para el usuario:", user.id_company);
      return user;
    }

    const empleado = await getEmployeeFromOdoo(company, user.code);
<<<<<<< ours

    if (!empleado) {
      console.log(`⚠️ Empleado con code ${user.code} no encontrado en Odoo`);
      return user;
    }

=======

    if (!empleado) {
      console.log(`⚠️ Empleado con code ${user.code} no encontrado en Odoo`);
      return user;
    }

>>>>>>> theirs
    const client = new Client(config);

    try {
      await client.connect();
      await client.query(
        `UPDATE users
         SET odoo_id = $1, odoo_user_id = $1
         WHERE code = $2`,
        [empleado.id, user.code]
      );
    } finally {
      await client.end();
    }

<<<<<<< ours
<<<<<<< ours
  if (empleado) {
    await client.query(
      `UPDATE users
       SET odoo_id = $1, odoo_user_id = $1
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
       WHERE odoo_id = $1`,
      [empleado.id, user.odoo_id]
=======
       WHERE code = $2`,
      [empleado.id, user.code]
>>>>>>> theirs
=======
       WHERE code = $2`,
      [empleado.id, user.code]
>>>>>>> theirs
=======
       WHERE code = $2`,
      [empleado.id, user.code]
>>>>>>> theirs
=======
       WHERE code = $2`,
      [empleado.id, user.code]
>>>>>>> theirs
    );
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    console.log(`✅ Usuario ${user.code} vinculado a Odoo ID ${empleado.id}`);
    user.odoo_id = empleado.id;
    user.odoo_user_id = empleado.id;
  } catch (error) {
    console.error("Error al sincronizar usuario con Odoo:", error);
  }

  return user;
}

// ------------------ CRUD ------------------

// Traer todos los usuarios
export async function getUsers() {
  const client = new Client(config);
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

// Traer usuario por code
export async function getUsersByID(id: string) {
  const client = new Client(config);
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

// Crear usuario y sincronizar con Odoo
export async function createUsers(user: any) {
  const client = new Client(config);
  let newUser;

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

    newUser = result.rows[0];
  } catch (error) {
    console.error("Error al crear usuario:", error);
    throw new Error("No se pudo crear el usuario");
<<<<<<< ours
<<<<<<< ours
=======
  } finally {
    await client.end();
>>>>>>> theirs
=======
  } finally {
    await client.end();
>>>>>>> theirs
  }

  // 🔄 sincronizar con Odoo
  return await syncUserWithOdoo(newUser);
}

// Actualizar usuario y sincronizar con Odoo
export async function updateUsers(user: any) {
  const client = new Client(config);
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
          rol = $6
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      WHERE odoo_id = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol, odoo_id } = user;
=======
      WHERE code = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol } = user;
>>>>>>> theirs
=======
      WHERE code = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol } = user;
>>>>>>> theirs
=======
      WHERE code = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol } = user;
>>>>>>> theirs
=======
      WHERE code = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol } = user;
>>>>>>> theirs
=======
      WHERE code = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol } = user;
    const lookupCode = user.original_code || code;
>>>>>>> theirs
=======
      WHERE code = $7
      RETURNING *
    `;

    const { code, email, id_company, name, password, rol } = user;
    const lookupCode = user.original_code || code;
>>>>>>> theirs

    const result = await client.query(query, [
      code,
      email,
      id_company,
      name,
      password,
      rol,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      odoo_id,
=======
      code,
>>>>>>> theirs
=======
      code,
>>>>>>> theirs
=======
      code,
>>>>>>> theirs
=======
      code,
>>>>>>> theirs
=======
      lookupCode,
>>>>>>> theirs
    ]);

    if (result.rowCount === 0) {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      console.log(`⚠️ No se encontró usuario con id ${odoo_id}`);
=======
      console.log(`⚠️ No se encontró usuario con code ${code}`);
>>>>>>> theirs
=======
      console.log(`⚠️ No se encontró usuario con code ${code}`);
>>>>>>> theirs
=======
      console.log(`⚠️ No se encontró usuario con code ${code}`);
>>>>>>> theirs
=======
      console.log(`⚠️ No se encontró usuario con code ${code}`);
>>>>>>> theirs
=======
      console.log(`⚠️ No se encontró usuario con code ${lookupCode}`);
>>>>>>> theirs
=======
      lookupCode,
    ]);

    if (result.rowCount === 0) {
      console.log(`⚠️ No se encontró usuario con code ${lookupCode}`);
>>>>>>> theirs
      return null;
    }

    updatedUser = result.rows[0];
    console.log(`✅ Usuario ${updatedUser.name} actualizado en DB`);
<<<<<<< ours
<<<<<<< ours

    // 🔄 sincronizar con Odoo
    return await syncUserWithOdoo(updatedUser);
<<<<<<< ours
  } catch (error: any) {
  console.error("Error al actualizar usuario:", error);
  // No devuelvas el objeto 'error' crudo, devuelve un objeto simple:
  return { 
    error: true, 
    message: error.message || "Error desconocido" 
  };
=======
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    throw new Error("No se pudo actualizar el usuario");
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    throw new Error("No se pudo actualizar el usuario");
  } finally {
    await client.end();
>>>>>>> theirs
=======
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    throw new Error("No se pudo actualizar el usuario");
  } finally {
    await client.end();
>>>>>>> theirs
  }

  // 🔄 sincronizar con Odoo
  return await syncUserWithOdoo(updatedUser);
}
