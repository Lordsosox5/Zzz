import { Router } from "express";
import { db, admissionAssessmentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/patients/:id/assessment", async (req, res): Promise<void> => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) {
    res.status(400).json({ error: "Invalid patient id" });
    return;
  }
  try {
    const [assessment] = await db
      .select()
      .from(admissionAssessmentsTable)
      .where(eq(admissionAssessmentsTable.patientId, patientId))
      .orderBy(desc(admissionAssessmentsTable.createdAt))
      .limit(1);
    if (!assessment) { res.status(404).json({ error: "No assessment found for this patient" }); return; }
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admission-assessments", async (req, res): Promise<void> => {
  const { patientId, ...rest } = req.body;
  if (!patientId) {
    res.status(400).json({ error: "patientId is required" });
    return;
  }
  try {
    const [assessment] = await db
      .insert(admissionAssessmentsTable)
      .values({ patientId, authorId: 1, ...rest })
      .returning();
    res.status(201).json(assessment);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admission-assessments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [assessment] = await db
      .update(admissionAssessmentsTable)
      .set(req.body)
      .where(eq(admissionAssessmentsTable.id, id))
      .returning();
    if (!assessment) { res.status(404).json({ error: "Assessment not found" }); return; }
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
