import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, admissionAssessmentsTable } from "@workspace/db";

const router = Router();

function mapAssessment(a: typeof admissionAssessmentsTable.$inferSelect) {
  return {
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

router.get("/patients/:id/assessment", async (req, res): Promise<void> => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) {
    res.status(400).json({ error: "Invalid patient id" });
    return;
  }
  const [assessment] = await db
    .select()
    .from(admissionAssessmentsTable)
    .where(eq(admissionAssessmentsTable.patientId, patientId))
    .limit(1);
  if (!assessment) {
    res.status(404).json({ error: "No assessment found for this patient" });
    return;
  }
  res.json(mapAssessment(assessment));
});

router.post("/admission-assessments", async (req, res): Promise<void> => {
  const { patientId, ...rest } = req.body;
  if (!patientId) {
    res.status(400).json({ error: "patientId is required" });
    return;
  }
  const authorId = 1; // default author; replace with req.user.id when auth middleware added
  const [assessment] = await db
    .insert(admissionAssessmentsTable)
    .values({ patientId, authorId, ...rest })
    .returning();
  res.status(201).json(mapAssessment(assessment));
});

router.patch("/admission-assessments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [assessment] = await db
    .update(admissionAssessmentsTable)
    .set(req.body)
    .where(eq(admissionAssessmentsTable.id, id))
    .returning();
  if (!assessment) {
    res.status(404).json({ error: "Assessment not found" });
    return;
  }
  res.json(mapAssessment(assessment));
});

export default router;
