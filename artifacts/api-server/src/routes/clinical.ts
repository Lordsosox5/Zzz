import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, clinicalNotesTable, diagnosesTable, usersTable } from "@workspace/db";
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

function mapNote(n: typeof clinicalNotesTable.$inferSelect, authorName?: string | null) {
  return {
    ...n,
    authorName: authorName ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

router.get("/clinical-notes", async (req, res): Promise<void> => {
  const params = ListClinicalNotesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conditions = [];
  if (params.data.patientId) conditions.push(eq(clinicalNotesTable.patientId, params.data.patientId));
  if (params.data.type) conditions.push(eq(clinicalNotesTable.type, params.data.type));
  const notes = conditions.length
    ? await db.select().from(clinicalNotesTable).where(and(...conditions)).orderBy(clinicalNotesTable.createdAt)
    : await db.select().from(clinicalNotesTable).orderBy(clinicalNotesTable.createdAt);
  res.json(notes.map(n => mapNote(n)));
});

router.post("/clinical-notes", async (req, res): Promise<void> => {
  const parsed = CreateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const authorId = 1; // default author
  const [note] = await db.insert(clinicalNotesTable).values({ ...parsed.data, authorId }).returning();
  res.status(201).json(mapNote(note));
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.id, params.data.id));
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(mapNote(note));
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
  const [note] = await db.update(clinicalNotesTable).set(parsed.data).where(eq(clinicalNotesTable.id, params.data.id)).returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(mapNote(note));
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const results = params.data.patientId
    ? await db.select().from(diagnosesTable).where(eq(diagnosesTable.patientId, params.data.patientId))
    : await db.select().from(diagnosesTable);
  res.json(results.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [dx] = await db.insert(diagnosesTable).values(parsed.data).returning();
  res.status(201).json({ ...dx, createdAt: dx.createdAt.toISOString() });
});

export default router;
