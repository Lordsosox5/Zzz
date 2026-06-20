import { Router } from "express";
import { db, dischargeSummariesTable } from "../lib/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/discharge-summaries", async (req, res): Promise<void> => {
  try {
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string, 10) : null;
    let query = db.select().from(dischargeSummariesTable).orderBy(desc(dischargeSummariesTable.createdAt)).$dynamic();
    if (patientId) query = query.where(eq(dischargeSummariesTable.patientId, patientId));
    res.json(await query);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/discharge-summaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const [data] = await db.select().from(dischargeSummariesTable).where(eq(dischargeSummariesTable.id, id)).limit(1);
    if (!data) { res.status(404).json({ error: "Not found" }); return; }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/discharge-summaries", async (req, res): Promise<void> => {
  const { patientId, createdBy, createdByName, admissionDate, dischargeDate, primaryDiagnosis, secondaryDiagnoses, hospitalCourse, conditionAtDischarge, dischargeMedications, followUpInstructions, dietInstructions, activityRestrictions } = req.body;
  if (!patientId || !primaryDiagnosis || !dischargeDate || !hospitalCourse) {
    res.status(400).json({ error: "patientId, primaryDiagnosis, dischargeDate, hospitalCourse are required" });
    return;
  }
  try {
    const [data] = await db.insert(dischargeSummariesTable).values({
      patientId: Number(patientId),
      createdBy: createdBy ?? null,
      createdByName: createdByName ?? null,
      admissionDate: admissionDate ?? null,
      dischargeDate,
      primaryDiagnosis,
      secondaryDiagnoses: secondaryDiagnoses ?? null,
      hospitalCourse,
      conditionAtDischarge: conditionAtDischarge ?? "good",
      dischargeMedications: dischargeMedications ?? null,
      followUpInstructions: followUpInstructions ?? null,
      dietInstructions: dietInstructions ?? null,
      activityRestrictions: activityRestrictions ?? null,
    }).returning();
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
