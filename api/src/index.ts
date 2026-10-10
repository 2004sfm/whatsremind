import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { initializeDatabase } from "./db/migrate";
import { configRoutes } from "./routes/config";
import { clientRoutes } from "./routes/clients";
import { excelRoutes } from "./routes/excel";
import { messageRoutes } from "./routes/messages";
import { templateRoutes } from "./routes/templates";

// 1. Initialize SQLite Database Schema
initializeDatabase();

// 2. Build Elysia API Server
export const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(configRoutes)
  .use(clientRoutes)
  .use(excelRoutes)
  .use(messageRoutes)
  .use(templateRoutes)
  .listen(3001);

console.log(`🚀 WhatsRemind API running on http://localhost:3001`);

export type App = typeof app;
