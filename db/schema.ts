import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  specification: text("specification").notNull(),
  status: text("status").notNull().default("Needs Review"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
