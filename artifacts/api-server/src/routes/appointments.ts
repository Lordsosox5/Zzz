import { Router } from "express";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { db, appointmentsTable, patientsTable, usersTable } from "../lib/db";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichAppointment(a: typeof appointmentsTable.$inferSelect) {
  const [[patient], [doctor]] = await Promise.all([
    db.select({ nameEn: patientsTable.nameEn }).from(patientsTable).where(eq(patientsTable.id, a.patientId)).limit(1),
    db.select({ nameEn: usersTable.nameEn }).from(usersTable).where(eq(usersTable.id, a.doctorId)).limit(1),
  ]);
  return {
    ...a,
    patientName: patient?.nameEn ?? null,
    doctorName: doctor?.nameEn ?? null,
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const params = ListAppointmentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { date, doctorId, patientId, status } = params.data;
  try {
    const conditions = [];
    if (patientId) conditions.push(eq(appointmentsTable.patientId, patientId));
    if (doctorId) conditions.push(eq(appointmentsTable.doctorId, doctorId));
    if (status) conditions.push(eq(appointmentsTable.status, status));
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      conditions.push(gte(appointmentsTable.scheduledAt, start));
      conditions.push(lte(appointmentsTable.scheduledAt, end));
    }
    const query = db.select().from(appointmentsTable).orderBy(asc(appointmentsTable.scheduledAt));
    const data = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;
    const enriched = await Promise.all(data.map(enrichAppointment));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [appointment] = await db
      .insert(appointmentsTable)
      .values(parsed.data as any)
      .returning();
    res.status(201).json(await enrichAppointment(appointment));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/appointments/today", async (_req, res): Promise<void> => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  try {
    const data = await db
      .select()
      .from(appointmentsTable)
      .where(and(gte(appointmentsTable.scheduledAt, start), lte(appointmentsTable.scheduledAt, end)))
      .orderBy(asc(appointmentsTable.scheduledAt));
    const enriched = await Promise.all(data.map(enrichAppointment));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [appointment] = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.id, params.data.id))
      .limit(1);
    if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(await enrichAppointment(appointment));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
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
  try {
    const [appointment] = await db
      .update(appointmentsTable)
      .set(parsed.data as any)
      .where(eq(appointmentsTable.id, params.data.id))
      .returning();
    if (!appointment) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(await enrichAppointment(appointment));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
