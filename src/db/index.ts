import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

function getConnectionString(): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const hyperdrive = (env as { HYPERDRIVE?: { connectionString?: string } })
      .HYPERDRIVE;
    if (hyperdrive?.connectionString) return hyperdrive.connectionString;
  } catch {
    // Node development/build: fall through to process.env.
  }
  return process.env.DATABASE_URL;
}

export function getDb(explicitUrl?: string) {
  const connectionString = explicitUrl ?? getConnectionString();
  if (!connectionString) throw new Error("No PostgreSQL connection configured");

  const client = postgres(connectionString, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
