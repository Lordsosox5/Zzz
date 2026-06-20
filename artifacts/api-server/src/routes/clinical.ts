import { Router } from "express";
import { db, clinicalNotesTable, diagnosesTable, usersTable, patientsTable } from "../lib/db";
import {
  ListClinicalNotesQueryParams,
  CreateClinicalNoteBody,
  GetClinicalNoteParams,
  UpdateClinicalNoteParams,
  UpdateClinicalNoteBody,
  ListDiagnosesQueryParams,
  CreateDiagnosisBody,
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

router.get("/clinical-notes", async (req, res): Promise<void> => {
  const params = ListClinicalNotesQueryParams.safeParse(req.query);
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
      conditions.push(eq(clinicalNotesTable.patientId, pid));
    } else if (allowedPatientIds !== null) {
      conditions.push(inArray(clinicalNotesTable.patientId, allowedPatientIds));
    }

    const notes = conditions.length > 0
      ? await db.select().from(clinicalNotesTable).where(and(...conditions))
      : await db.select().from(clinicalNotesTable);

    const patientIds = [...new Set(notes.map(n => n.patientId).filter(Boolean))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const pd = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, patientIds));
      for (const p of pd) patientMap[p.id] = p.nameEn;
    }
    res.json(notes.map(n => ({ ...n, patientName: patientMap[n.patientId] ?? null, authorName: null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clinical-notes", async (req, res): Promise<void> => {
  const parsed = CreateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.insert(clinicalNotesTable).values({ ...parsed.data, authorId: 1 } as any).returning();
    res.status(201).json({ ...rows[0], authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Note not found" }); return; }
    const note = rows[0];

    const callerUnitId = await getCallerUnitId(req.headers.authorization);
    if (callerUnitId !== null && note.patientId) {
      const pd = await db.select({ unitId: patientsTable.unitId }).from(patientsTable).where(eq(patientsTable.id, note.patientId)).limit(1);
      const patientUnitId = pd[0]?.unitId ?? null;
      if (patientUnitId !== callerUnitId) { res.status(403).json({ error: "Access denied" }); return; }
    }

    res.json({ ...note, authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = UpdateClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.update(clinicalNotesTable).set(parsed.data as any).where(eq(clinicalNotesTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...rows[0], authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = params.data.patientId
      ? await db.select().from(diagnosesTable).where(eq(diagnosesTable.patientId, params.data.patientId))
      : await db.select().from(diagnosesTable);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.insert(diagnosesTable).values(parsed.data as any).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
