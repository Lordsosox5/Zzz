import { Router } from "express";
import { db, appointmentsTable, patientsTable, usersTable } from "../lib/db";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
} from "@workspace/api-zod";
import { eq, gte, lte, and, SQL } from "drizzle-orm";
import type { Appointment } from "@workspace/db";

const router = Router();

async function enrichAppointment(a: Appointment) {
  const [patientRows, doctorRows] = await Promise.all([
    db.select({ nameEn: patientsTable.nameEn }).from(patientsTable).where(eq(patientsTable.id, a.patientId)).limit(1),
    db.select({ nameEn: usersTable.nameEn }).from(usersTable).where(eq(usersTable.id, a.doctorId)).limit(1),
  ]);
  return { ...a, patientName: patientRows[0]?.nameEn ?? null, doctorName: doctorRows[0]?.nameEn ?? null };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const params = ListAppointmentsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { date, doctorId, patientId, status } = params.data;
    const conditions: SQL[] = [];
    if (patientId) conditions.push(eq(appointmentsTable.patientId, patientId));
    if (doctorId) conditions.push(eq(appointmentsTable.doctorId, doctorId));
    if (status) conditions.push(eq(appointmentsTable.status, status));
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      conditions.push(gte(appointmentsTable.scheduledAt, start));
      conditions.push(lte(appointmentsTable.scheduledAt, end));
    }
    const rows = conditions.length > 0
      ? await db.select().from(appointmentsTable).where(and(...conditions))
      : await db.select().from(appointmentsTable);
    const enriched = await Promise.all(rows.map(enrichAppointment));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.insert(appointmentsTable).values(parsed.data as any).returning();
    res.status(201).json(await enrichAppointment(rows[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/appointments/today", async (req, res): Promise<void> => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const doctorId = req.query.doctorId ? Number(req.query.doctorId) : null;
    const conditions: SQL[] = [
      gte(appointmentsTable.scheduledAt, start),
      lte(appointmentsTable.scheduledAt, end),
    ];
    if (doctorId) conditions.push(eq(appointmentsTable.doctorId, doctorId));
    const rows = await db.select().from(appointmentsTable).where(and(...conditions));
    const enriched = await Promise.all(rows.map(enrichAppointment));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(await enrichAppointment(rows[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.update(appointmentsTable).set(parsed.data as any).where(eq(appointmentsTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(await enrichAppointment(rows[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
