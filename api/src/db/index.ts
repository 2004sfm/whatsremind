import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { resolve, dirname } from "path";
import { existsSync } from "fs";

/**
 * Resolves the SQLite database file path robustly:
 * 1. Checks DATABASE_URL or DB_PATH environment variables.
 * 2. Traverses upwards from import.meta.dir to locate the api package.json root.
 * Avoids relying on process.cwd(), preventing database files from being created in random working directories.
 */
function resolveDatabasePath(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  let current = import.meta.dir;
  while (current !== dirname(current)) {
    if (existsSync(resolve(current, "package.json"))) {
      return resolve(current, "data.sqlite");
    }
    current = dirname(current);
  }

  return resolve(import.meta.dir, "../../data.sqlite");
}

export const dbPath = resolveDatabasePath();
export const sqlite = new Database(dbPath, { create: true });

// Enable Write-Ahead Logging (WAL) for better concurrent performance
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export { schema };
