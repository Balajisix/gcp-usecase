import dotenv from "dotenv";
import { Pool, PoolConfig } from "pg";

dotenv.config();

const requiredVariables = [
  "DB_USER",
  "DB_PASS",
  "DB_NAME",
  "INSTANCE_UNIX_SOCKET",
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(
      `Missing required environment variable: ${variable}`,
    );
  }
}

const config: PoolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  /*
   * Cloud Run exposes the connected Cloud SQL
   * instance through this Unix socket.
   */
  host: process.env.INSTANCE_UNIX_SOCKET,

  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
};

export const pool = new Pool(config);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export async function testDatabaseConnection() {
  const result = await pool.query(
    "SELECT NOW() AS current_time",
  );

  return result.rows[0];
}
