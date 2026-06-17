import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

let dbSingleton: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add Neon Postgres URL to .env.local",
    );
  }
  if (!dbSingleton) {
    const sql = neon(connectionString);
    dbSingleton = drizzle(sql, { schema });
  }
  return dbSingleton;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString);
}

export type Db = ReturnType<typeof getDb>;
export * from "./schema";
