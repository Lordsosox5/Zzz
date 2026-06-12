import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const admissionAssessmentsTable = pgTable("admission_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  authorId: integer("author_id").notNull(),

  // Section 2 — History
  mainComplaint: text("main_complaint"),
  analysisSite: text("analysis_site"),
  analysisOnset: text("analysis_onset"),
  analysisCharacter: text("analysis_character"),
  analysisRadiation: text("analysis_radiation"),
  analysisAggravation: text("analysis_aggravation"),
  analysisRelieving: text("analysis_relieving"),
  analysisAssociations: text("analysis_associations"),
  systemicReview: text("systemic_review"),
  pastMedicalHistory: text("past_medical_history"),
  familyHistory: text("family_history"),
  drugHistory: text("drug_history"),
  socialHistory: text("social_history"),
  developmentalHistory: text("developmental_history"),
  historySummary: text("history_summary"),
  provisionalDiagnosis: text("provisional_diagnosis"),

  // Section 3 — Examination
  examinationSummary: text("examination_summary"),
  chestExam: text("chest_exam"),
  cnsExam: text("cns_exam"),
  abdomenExam: text("abdomen_exam"),
  vitalBp: text("vital_bp"),
  vitalPr: text("vital_pr"),
  vitalRr: text("vital_rr"),
  vitalGcs: text("vital_gcs"),
  vitalRbg: text("vital_rbg"),

  // Section 4 — Investigations & Plan
  investigationsOrdered: text("investigations_ordered"),
  managementPlan: text("management_plan"),

  // Section 5 — Follow-up & Discharge
  morningFollowUp: text("morning_follow_up"),
  eveningFollowUp: text("evening_follow_up"),
  dischargeLetter: text("discharge_letter"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdmissionAssessmentSchema = createInsertSchema(admissionAssessmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdmissionAssessment = z.infer<typeof insertAdmissionAssessmentSchema>;
export type AdmissionAssessment = typeof admissionAssessmentsTable.$inferSelect;
