import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

export function getDb(explicitUrl?: string) {
  const connectionString = explicitUrl ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("No PostgreSQL connection configured");

  const client = postgres(connectionString, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
