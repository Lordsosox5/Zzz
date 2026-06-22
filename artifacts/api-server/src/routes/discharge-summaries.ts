import { Router } from "express";
import { db, dischargeSummariesTable } from "../lib/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/discharge-summaries", async (req, res): Promise<void> => {
  try {
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string, 10) : null;
    const rows = patientId
      ? await db.select().from(dischargeSummariesTable).where(eq(dischargeSummariesTable.patientId, patientId)).orderBy(desc(dischargeSummariesTable.createdAt))
      : await db.select().from(dischargeSummariesTable).orderBy(desc(dischargeSummariesTable.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/discharge-summaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await db.select().from(dischargeSummariesTable).where(eq(dischargeSummariesTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/discharge-summaries", async (req, res): Promise<void> => {
  const {
    patientId, createdBy, createdByName, admissionDate, dischargeDate,
    primaryDiagnosis, secondaryDiagnoses, hospitalCourse, conditionAtDischarge,
    dischargeMedications, followUpInstructions, dietInstructions, activityRestrictions,
  } = req.body;
  if (!patientId || !primaryDiagnosis || !dischargeDate || !hospitalCourse) {
    res.status(400).json({ error: "patientId, primaryDiagnosis, dischargeDate, hospitalCourse are required" });
    return;
  }
  try {
    const rows = await db.insert(dischargeSummariesTable).values({
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
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
