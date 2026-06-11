import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const drugsTable = pgTable("drugs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  genericName: text("generic_name"),
  category: text("category").notNull().default("general"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(10),
  unit: text("unit").notNull().default("tablet"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  batchNumber: text("batch_number"),
  expiryDate: text("expiry_date"),
  manufacturer: text("manufacturer"),
  isControlled: boolean("is_controlled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDrugSchema = createInsertSchema(drugsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDrug = z.infer<typeof insertDrugSchema>;
export type Drug = typeof drugsTable.$inferSelect;
