import { Pool } from "pg";
import { config } from "../config/env";

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle client", err);
});

export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log("✓ Database connected successfully");
    client.release();
  } catch (error) {
    console.error("✗ Failed to connect to database:", error);
    throw error;
  }
}

export async function query(
  text: string,
  params?: any[]
): Promise<any> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}
