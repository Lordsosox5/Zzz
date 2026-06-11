import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clinicalNotesTable = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  authorId: integer("author_id").notNull(),
  type: text("type").notNull().default("soap"),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type ClinicalNote = typeof clinicalNotesTable.$inferSelect;

export const diagnosesTable = pgTable("diagnoses", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  icd10Code: text("icd10_code").notNull(),
  description: text("description").notNull(),
  descriptionAr: text("description_ar"),
  status: text("status").notNull().default("active"),
  onsetDate: text("onset_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiagnosisSchema = createInsertSchema(diagnosesTable).omit({ id: true, createdAt: true });
export type InsertDiagnosis = z.infer<typeof insertDiagnosisSchema>;
export type Diagnosis = typeof diagnosesTable.$inferSelect;
