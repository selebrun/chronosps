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

export async function getCompanies() {
  const client = new Client(config);

  try {
   const a = await client.connect();
    const res = await client.query('SELECT * FROM "company"');
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
export async function createCompany(companyData: any) {
  const client = new Client(config);

  try {
    await client.connect();
    console.log("Conectado correctamente al servidor PostgreSQL en Azure");

    const query = `
        INSERT INTO company (id_company, name, url, domain, database, user_default, password)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

    client.query(query, [
      companyData.id_company,
      companyData.name,
      companyData.url,
      companyData.domain,
      companyData.database,
      companyData.user_default,
      companyData.password
    ]);
    return companyData
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
export async function updateCompany(companyData: any) {
  const client = new Client(config);

  try {
    await client.connect();
    console.log("Conectado correctamente al servidor PostgreSQL en Azure");

    const query = `
        UPDATE company
        SET name = $1, url = $2, domain = $3, database = $4, user_default = $5, password = $6
        WHERE id_company = $7
      `;

    await client.query(query, [
      companyData.name,
      companyData.url,
      companyData.domain,
      companyData.database,
      companyData.user_default,
      companyData.password,
      companyData.id_company
    ]);
  
    console.log(`Empresa con ID ${companyData.id_company} actualizada correctamente`);
    await client.end();
  
    return companyData
  
  } catch (error) {
    console.error("Error al actualizar la empresa:", error);
  }
}
