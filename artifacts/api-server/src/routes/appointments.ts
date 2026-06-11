import { Router } from "express";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, appointmentsTable, usersTable, patientsTable } from "@workspace/db";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichAppointment(a: typeof appointmentsTable.$inferSelect) {
  const [patient] = await db.select({ nameEn: patientsTable.nameEn }).from(patientsTable).where(eq(patientsTable.id, a.patientId));
  const [doctor] = await db.select({ nameEn: usersTable.nameEn }).from(usersTable).where(eq(usersTable.id, a.doctorId));
  return {
    ...a,
    patientName: patient?.nameEn ?? null,
    doctorName: doctor?.nameEn ?? null,
    scheduledAt: a.scheduledAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const params = ListAppointmentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { date, doctorId, patientId, status } = params.data;
  let query = db.select().from(appointmentsTable);
  const conditions = [];
  if (patientId) conditions.push(eq(appointmentsTable.patientId, patientId));
  if (doctorId) conditions.push(eq(appointmentsTable.doctorId, doctorId));
  if (status) conditions.push(eq(appointmentsTable.status, status));
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(appointmentsTable.scheduledAt, start));
    conditions.push(lte(appointmentsTable.scheduledAt, end));
  }
  const results = conditions.length
    ? await db.select().from(appointmentsTable).where(and(...conditions)).orderBy(appointmentsTable.scheduledAt)
    : await db.select().from(appointmentsTable).orderBy(appointmentsTable.scheduledAt);
  const enriched = await Promise.all(results.map(enrichAppointment));
  res.json(enriched);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [appt] = await db.insert(appointmentsTable).values({
    ...parsed.data,
    scheduledAt: new Date(parsed.data.scheduledAt),
  }).returning();
  const enriched = await enrichAppointment(appt);
  res.status(201).json(enriched);
});

router.get("/appointments/today", async (_req, res): Promise<void> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const results = await db
    .select()
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.scheduledAt, start), lte(appointmentsTable.scheduledAt, end)))
    .orderBy(appointmentsTable.scheduledAt);
  const enriched = await Promise.all(results.map(enrichAppointment));
  res.json(enriched);
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(await enrichAppointment(appt));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.scheduledAt) updateData.scheduledAt = new Date(parsed.data.scheduledAt);
  const [appt] = await db.update(appointmentsTable).set(updateData).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(await enrichAppointment(appt));
});

export default router;
