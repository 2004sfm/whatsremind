import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const appConfig = sqliteTable("app_config", {
  id: integer("id").primaryKey(), // singleton id = 1
  engine: text("engine").notNull().default("meta"), // 'meta' | 'ycloud' | 'evolution'
  metaToken: text("meta_token"),
  metaPhoneId: text("meta_phone_id"),
  ycloudApiKey: text("ycloud_api_key"),
  ycloudPhone: text("ycloud_phone"),
  evolutionUrl: text("evolution_url"),
  evolutionApiKey: text("evolution_api_key"),
  evolutionInstance: text("evolution_instance"),
  templateName: text("template_name").notNull().default(""),
  defaultCountry: text("default_country").notNull().default("VE"),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    phoneNumber: text("phone_number").notNull(),
    phoneNumber2: text("phone_number_2"),
    name: text("name").notNull(),
    code: text("code").notNull(),
    sheetName: text("sheet_name").notNull(),
    debt: real("debt").notNull().default(0),
    lastSent: text("last_sent"),
    isSendable: integer("is_sendable", { mode: "boolean" }).notNull().default(true),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    excelRow: integer("excel_row"),
  },
  (table) => [
    uniqueIndex("unique_client_code_sheet").on(table.code, table.sheetName),
  ]
);

export const messageLogs = sqliteTable("message_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  waMessageId: text("wa_message_id"),
  engine: text("engine").notNull().default("meta"),
  status: text("status").notNull(), // 'sent' | 'failed'
  httpStatus: integer("http_status"),
  errorDetail: text("error_detail"),
  templateUsed: text("template_used").notNull(),
  sentAt: text("sent_at").notNull(),
});

export const localTemplates = sqliteTable("local_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  language: text("language").notNull(),
  status: text("status").notNull(),
  category: text("category").notNull(),
  componentsJson: text("components_json").notNull(),
});
