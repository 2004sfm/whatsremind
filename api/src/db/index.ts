import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { resolve } from "path";

// Initialize SQLite database file in project root or api directory
const dbPath = resolve(process.cwd(), "data.sqlite");
export const sqlite = new Database(dbPath, { create: true });

// Enable Write-Ahead Logging (WAL) for better concurrent performance
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export { schema };
