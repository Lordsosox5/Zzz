import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vaccinationsTable = pgTable("vaccinations", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  vaccineNameAr: text("vaccine_name_ar"),
  doseNumber: integer("dose_number"),
  administeredDate: text("administered_date").notNull(),
  nextDueDate: text("next_due_date"),
  batchNumber: text("batch_number"),
  administeredById: integer("administered_by_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVaccinationSchema = createInsertSchema(vaccinationsTable).omit({ id: true, createdAt: true });
export type InsertVaccination = z.infer<typeof insertVaccinationSchema>;
export type Vaccination = typeof vaccinationsTable.$inferSelect;

export const growthRecordsTable = pgTable("growth_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  measurementDate: text("measurement_date").notNull(),
  weight: numeric("weight", { precision: 5, scale: 2 }),
  height: numeric("height", { precision: 5, scale: 2 }),
  headCircumference: numeric("head_circumference", { precision: 5, scale: 2 }),
  muac: numeric("muac", { precision: 5, scale: 2 }),
  bmi: numeric("bmi", { precision: 5, scale: 2 }),
  weightPercentile: numeric("weight_percentile", { precision: 5, scale: 2 }),
  heightPercentile: numeric("height_percentile", { precision: 5, scale: 2 }),
  bmiPercentile: numeric("bmi_percentile", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGrowthRecordSchema = createInsertSchema(growthRecordsTable).omit({ id: true, createdAt: true });
export type InsertGrowthRecord = z.infer<typeof insertGrowthRecordSchema>;
export type GrowthRecord = typeof growthRecordsTable.$inferSelect;
