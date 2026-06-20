import { Router } from "express";
import { db, prescriptionsTable, patientsTable, usersTable } from "../lib/db";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";
import { eq, inArray, and, SQL } from "drizzle-orm";

const router = Router();

async function getCallerUnitId(authHeader: string | undefined): Promise<number | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const [userId] = Buffer.from(token, "base64").toString("utf-8").split(":");
    const rows = await db.select({ unitId: usersTable.unitId }).from(usersTable).where(eq(usersTable.id, parseInt(userId, 10))).limit(1);
    return rows[0]?.unitId ?? null;
  } catch {
    return null;
  }
}

async function unitPatientIds(unitId: number): Promise<number[]> {
  const rows = await db.select({ id: patientsTable.id }).from(patientsTable).where(eq(patientsTable.unitId, unitId));
  return rows.map(r => r.id);
}

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const callerUnitId = await getCallerUnitId(req.headers.authorization);

    let allowedPatientIds: number[] | null = null;
    if (callerUnitId !== null) {
      allowedPatientIds = await unitPatientIds(callerUnitId);
      if (allowedPatientIds.length === 0) { res.json([]); return; }
    }

    const conditions: SQL[] = [];
    if (params.data.patientId) {
      const pid = params.data.patientId;
      if (allowedPatientIds !== null && !allowedPatientIds.includes(pid)) { res.json([]); return; }
      conditions.push(eq(prescriptionsTable.patientId, pid));
    } else if (allowedPatientIds !== null) {
      conditions.push(inArray(prescriptionsTable.patientId, allowedPatientIds));
    }
    if (params.data.status) conditions.push(eq(prescriptionsTable.status, params.data.status));

    const rxList = conditions.length > 0
      ? await db.select().from(prescriptionsTable).where(and(...conditions))
      : await db.select().from(prescriptionsTable);

    const patientIds = [...new Set(rxList.map(r => r.patientId).filter(Boolean))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const pd = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, patientIds));
      for (const p of pd) patientMap[p.id] = p.nameEn;
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
    const rows = await db.insert(prescriptionsTable).values({ ...parsed.data, prescriberId: 1 } as any).returning();
    res.status(201).json({ ...rows[0], patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ ...rows[0], patientName: null, prescriberName: null });
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
    const rows = await db.update(prescriptionsTable).set(parsed.data as any).where(eq(prescriptionsTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ ...rows[0], patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
