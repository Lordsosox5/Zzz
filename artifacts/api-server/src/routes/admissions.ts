import { Router } from "express";
import { db, admissionAssessmentsTable } from "../lib/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/patients/:id/assessment", async (req, res): Promise<void> => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const rows = await db.select().from(admissionAssessmentsTable).where(eq(admissionAssessmentsTable.patientId, patientId)).orderBy(desc(admissionAssessmentsTable.createdAt)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "No assessment found for this patient" }); return; }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/assessments", async (req, res): Promise<void> => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const rows = await db.select().from(admissionAssessmentsTable).where(eq(admissionAssessmentsTable.patientId, patientId)).orderBy(desc(admissionAssessmentsTable.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/admission-assessments", async (req, res): Promise<void> => {
  const { patientId, ...rest } = req.body;
  if (!patientId) { res.status(400).json({ error: "patientId is required" }); return; }
  try {
    const rows = await db.insert(admissionAssessmentsTable).values({ ...rest, patientId: Number(patientId), authorId: 1 }).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/admission-assessments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const rows = await db.update(admissionAssessmentsTable).set(req.body).where(eq(admissionAssessmentsTable.id, id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Assessment not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
