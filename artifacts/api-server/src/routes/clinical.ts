import { Router } from "express";
import { db, clinicalNotesTable, diagnosesTable } from "../lib/db";
import { eq, asc } from "drizzle-orm";
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
    let query = db.select().from(clinicalNotesTable).orderBy(asc(clinicalNotesTable.createdAt));
    if (params.data.patientId) {
      query = query.where(eq(clinicalNotesTable.patientId, params.data.patientId)) as typeof query;
    }
    const data = await query;
    res.json(data.map((n) => ({ ...n, authorName: null })));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/clinical-notes", async (req, res): Promise<void> => {
  const parsed = CreateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db
      .insert(clinicalNotesTable)
      .values({ ...parsed.data, authorId: 1 })
      .returning();
    res.status(201).json({ ...rows[0], authorName: null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...rows[0], authorName: null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = UpdateClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db
      .update(clinicalNotesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(clinicalNotesTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...rows[0], authorName: null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(diagnosesTable).orderBy(asc(diagnosesTable.createdAt));
    if (params.data.patientId) {
      query = query.where(eq(diagnosesTable.patientId, params.data.patientId)) as typeof query;
    }
    const data = await query;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.insert(diagnosesTable).values(parsed.data).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
