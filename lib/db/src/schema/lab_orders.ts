import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const labOrdersTable = pgTable("lab_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  orderedById: integer("ordered_by_id").notNull(),
  testName: text("test_name").notNull(),
  testCode: text("test_code"),
  priority: text("priority").notNull().default("routine"),
  status: text("status").notNull().default("pending"),
  result: text("result"),
  resultValue: text("result_value"),
  unit: text("unit"),
  referenceRange: text("reference_range"),
  isCritical: boolean("is_critical").notNull().default(false),
  notes: text("notes"),
  collectedAt: timestamp("collected_at", { withTimezone: true }),
  resultedAt: timestamp("resulted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLabOrderSchema = createInsertSchema(labOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLabOrder = z.infer<typeof insertLabOrderSchema>;
export type LabOrder = typeof labOrdersTable.$inferSelect;

export const radiologyOrdersTable = pgTable("radiology_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  orderedById: integer("ordered_by_id").notNull(),
  modality: text("modality").notNull(),
  studyDescription: text("study_description").notNull(),
  priority: text("priority").notNull().default("routine"),
  status: text("status").notNull().default("pending"),
  report: text("report"),
  radiologistId: integer("radiologist_id"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRadiologyOrderSchema = createInsertSchema(radiologyOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRadiologyOrder = z.infer<typeof insertRadiologyOrderSchema>;
export type RadiologyOrder = typeof radiologyOrdersTable.$inferSelect;
