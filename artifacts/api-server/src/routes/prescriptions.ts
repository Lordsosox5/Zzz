import { Router } from "express";
import { db, prescriptionsTable, patientsTable } from "../lib/db";
import { eq, inArray } from "drizzle-orm";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(prescriptionsTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(prescriptionsTable.patientId, params.data.patientId));
    if (params.data.status) query = query.where(eq(prescriptionsTable.status, params.data.status));
    const rxList = await query;
    const patientIds = [...new Set(rxList.map(r => r.patientId))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const patients = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, patientIds));
      for (const p of patients) patientMap[p.id] = p.nameEn;
    }
    res.json(rxList.map(r => ({ ...r, patientName: patientMap[r.patientId] ?? null, prescriberName: null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [data] = await db.insert(prescriptionsTable).values({ ...parsed.data, prescriberId: 1 }).returning();
    res.status(201).json({ ...data, patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [data] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, params.data.id)).limit(1);
    if (!data) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ ...data, patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = UpdatePrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [data] = await db.update(prescriptionsTable).set(parsed.data).where(eq(prescriptionsTable.id, params.data.id)).returning();
    if (!data) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ ...data, patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
