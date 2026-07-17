import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  mrn: text("mrn").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  bloodGroup: text("blood_group"),
  motherBloodGroup: text("mother_blood_group"),
  nationality: text("nationality"),
  nationalId: text("national_id"),
  phone: text("phone"),
  address: text("address"),
  residence: text("residence"),
  weight: text("weight"),
  height: text("height"),
  admissionDate: text("admission_date"),
  dischargeDate: text("discharge_date"),
  guardianName: text("guardian_name"),
  guardianRelation: text("guardian_relation"),
  guardianPhone: text("guardian_phone"),
  allergies: text("allergies"),
  status: text("status").notNull().default("active"),
  patientType: text("patient_type").notNull().default("outpatient"),
  unitId: integer("unit_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
