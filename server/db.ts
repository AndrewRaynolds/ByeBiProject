import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

export type AppDatabase = NodePgDatabase<typeof schema>;

export interface DatabaseConnection {
  db: AppDatabase;
  close(): Promise<void>;
}

export function createDatabase(databaseUrl: string): DatabaseConnection {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  return {
    db: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
}
