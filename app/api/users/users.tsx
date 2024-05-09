'use server'

import { Client } from "pg";

// DB connection config
const config = {
  user: process.env.CHRONOS_DB_USER || "",
  host: process.env.CHRONOS_DB_HOST || "",
  database: process.env.CHRONOS_DB_NAME || "",
  password: process.env.CHRONOS_DB_PASSWORD || "",
  port: process.env.CHRONOS_DB_PORT || 5432,
  ssl: true,
} as any;

/**
 * getCompanies
 * 
 * Retorna todas las companias disponibles en la base de datos
 * 
 * Esta funcion es exclusivamente para usarla
 * del lado del servidor
 */

export async function getUsers() {
  const client = new Client(config);
  try {
   const a = await client.connect();
    const res = await client.query('SELECT * FROM "users"');
    const companies = res.rows;

    return companies;
  } catch (err) {
    console.error(err)
    throw new Error("There was an error trying to get companies");
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
export async function createUsers(users: any) {
  const client = new Client(config);

  try {
    await client.connect();
    const query = `
        INSERT INTO users (code, email, id_company, name, password, rol)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

    const { code, email, id_company, name, password, rol } = users;
    client.query(query, [code, email, id_company, name, password, rol]);
    return users
  } catch (error) {
    console.error("Error al crear la empresa:", error);
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
export async function updateUsers(users: any) {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log("Conectado correctamente al servidor PostgreSQL en Azure");

    const query = `
        UPDATE users
        SET id_company = $1, code = $2, password = $3, name = $4, rol = $5
        WHERE email = $6
      `;
      const { code, email, id_company, name, password, rol } = users;
      await client.query(query, [code.trim(), email.trim(), id_company.trim(), name.trim(), password.trim(), rol.trim()]);
  
    console.log(`Empresa con ID ${users.id_company} actualizada correctamente`);
    await client.end();
  
    return users
  
  } catch (error) {
    console.error("Error al actualizar la empresa:", error);
  }
}
