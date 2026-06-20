import { Router } from "express";
import { db, admissionAssessmentsTable } from "../lib/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/patients/:id/assessment", async (req, res): Promise<void> => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const [data] = await db.select().from(admissionAssessmentsTable)
      .where(eq(admissionAssessmentsTable.patientId, patientId))
      .orderBy(desc(admissionAssessmentsTable.createdAt))
      .limit(1);
    if (!data) { res.status(404).json({ error: "No assessment found for this patient" }); return; }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/admission-assessments", async (req, res): Promise<void> => {
  const { patientId, ...rest } = req.body;
  if (!patientId) { res.status(400).json({ error: "patientId is required" }); return; }
  try {
    const [data] = await db.insert(admissionAssessmentsTable).values({
      patientId: Number(patientId),
      authorId: 1,
      ...rest,
    }).returning();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/admission-assessments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [data] = await db.update(admissionAssessmentsTable).set(req.body).where(eq(admissionAssessmentsTable.id, id)).returning();
    if (!data) { res.status(404).json({ error: "Assessment not found" }); return; }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
