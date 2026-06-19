import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const unitsTable = pgTable("units", {
  id:            serial("id").primaryKey(),
  nameEn:        text("name_en").notNull(),
  nameAr:        text("name_ar"),
  type:          text("type").default("ward").notNull(),
  description:   text("description"),
  floor:         text("floor"),
  capacity:      integer("capacity").default(0).notNull(),
  headDoctorId:  integer("head_doctor_id"),
  status:        text("status").default("active").notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
