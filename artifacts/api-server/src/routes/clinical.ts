import { Router } from "express";
import { db } from "../lib/db";
import { clinicalNotesTable, diagnosesTable } from "@workspace/db";
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
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    let query = db.select().from(clinicalNotesTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(clinicalNotesTable.patientId, params.data.patientId));
    const rows = await query.orderBy(asc(clinicalNotesTable.createdAt));
    res.json(rows.map((n) => ({ ...n, authorName: null })));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.post("/clinical-notes", async (req, res): Promise<void> => {
  const parsed = CreateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db.insert(clinicalNotesTable).values({ ...parsed.data, authorId: 1 }).returning();
    res.status(201).json({ ...row, authorName: null });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [row] = await db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.id, params.data.id)).limit(1);
    if (!row) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...row, authorName: null });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.patch("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = UpdateClinicalNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db.update(clinicalNotesTable).set(parsed.data).where(eq(clinicalNotesTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...row, authorName: null });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    let query = db.select().from(diagnosesTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(diagnosesTable.patientId, params.data.patientId));
    const rows = await query.orderBy(asc(diagnosesTable.createdAt));
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db.insert(diagnosesTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

export default router;
