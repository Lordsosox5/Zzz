import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dischargeSummariesTable = pgTable("discharge_summaries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  createdBy: integer("created_by"),
  createdByName: text("created_by_name"),
  admissionDate: text("admission_date"),
  dischargeDate: text("discharge_date").notNull(),
  primaryDiagnosis: text("primary_diagnosis").notNull(),
  secondaryDiagnoses: text("secondary_diagnoses"),
  hospitalCourse: text("hospital_course").notNull(),
  conditionAtDischarge: text("condition_at_discharge").notNull().default("good"),
  dischargeMedications: text("discharge_medications"),
  followUpInstructions: text("follow_up_instructions"),
  dietInstructions: text("diet_instructions"),
  activityRestrictions: text("activity_restrictions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDischargeSummarySchema = createInsertSchema(dischargeSummariesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDischargeSummary = z.infer<typeof insertDischargeSummarySchema>;
export type DischargeSummary = typeof dischargeSummariesTable.$inferSelect;
