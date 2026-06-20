import { Router } from "express";
import { db, clinicalNotesTable, diagnosesTable, patientsTable } from "../lib/db";
import { eq, inArray } from "drizzle-orm";
import {
  ListClinicalNotesQueryParams,
  CreateClinicalNoteBody,
  GetClinicalNoteParams,
  UpdateClinicalNoteParams,
  UpdateClinicalNoteBody,
  ListDiagnosesQueryParams,
  CreateDiagnosisBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/clinical-notes", async (req, res): Promise<void> => {
  const params = ListClinicalNotesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(clinicalNotesTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(clinicalNotesTable.patientId, params.data.patientId));
    const notes = await query;
    const patientIds = [...new Set(notes.map(n => n.patientId))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const patients = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, patientIds));
      for (const p of patients) patientMap[p.id] = p.nameEn;
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
    const [data] = await db.insert(clinicalNotesTable).values({ ...parsed.data, authorId: 1 }).returning();
    res.status(201).json({ ...data, authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [data] = await db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.id, params.data.id)).limit(1);
    if (!data) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...data, authorName: null });
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
    const [data] = await db.update(clinicalNotesTable).set(parsed.data).where(eq(clinicalNotesTable.id, params.data.id)).returning();
    if (!data) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...data, authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(diagnosesTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(diagnosesTable.patientId, params.data.patientId));
    res.json(await query);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [data] = await db.insert(diagnosesTable).values(parsed.data).returning();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
