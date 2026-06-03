import { Client } from 'pg';

export const pgConfig = {
  user: process.env.CHRONOS_DB_USER || '',
  host: process.env.CHRONOS_DB_HOST || '',
  database: process.env.CHRONOS_DB_NAME || '',
  password: process.env.CHRONOS_DB_PASSWORD || '',
  port: process.env.CHRONOS_DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
} as any;

export async function runQuery<T = any>(query: string, values: any[] = []): Promise<T[]> {
  const client = new Client(pgConfig);
  await client.connect();
  try {
    const res = await client.query(query, values);
    return res.rows;
  } finally {
    await client.end();
  }
}
