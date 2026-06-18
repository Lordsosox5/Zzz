import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, clinicalNotesTable, diagnosesTable } from "../lib/db";
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
    const conditions = [];
    if (params.data.patientId) conditions.push(eq(clinicalNotesTable.patientId, params.data.patientId));
    if (params.data.type) conditions.push(eq(clinicalNotesTable.type, params.data.type));
    const query = db.select().from(clinicalNotesTable).orderBy(asc(clinicalNotesTable.createdAt));
    const data = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
    res.json(data.map((n) => ({ ...n, authorName: null })));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.post("/clinical-notes", async (req, res): Promise<void> => {
  const parsed = CreateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [note] = await db
      .insert(clinicalNotesTable)
      .values({ ...(parsed.data as any), authorId: 1 })
      .returning();
    res.status(201).json({ ...note, authorName: null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [note] = await db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.id, params.data.id)).limit(1);
    if (!note) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...note, authorName: null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.patch("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = UpdateClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [note] = await db
      .update(clinicalNotesTable)
      .set(parsed.data as any)
      .where(eq(clinicalNotesTable.id, params.data.id))
      .returning();
    if (!note) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...note, authorName: null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const query = db.select().from(diagnosesTable).orderBy(asc(diagnosesTable.createdAt));
    const data = params.data.patientId
      ? await query.where(eq(diagnosesTable.patientId, params.data.patientId))
      : await query;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [diagnosis] = await db
      .insert(diagnosesTable)
      .values(parsed.data as any)
      .returning();
    res.status(201).json(diagnosis);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
