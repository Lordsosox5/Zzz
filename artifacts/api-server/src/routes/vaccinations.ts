import { Router } from "express";
import { db, vaccinationsTable, growthRecordsTable } from "../lib/db";
import { eq } from "drizzle-orm";
import {
  ListVaccinationsQueryParams,
  RecordVaccinationBody,
  ListGrowthRecordsQueryParams,
  CreateGrowthRecordBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/vaccinations", async (req, res): Promise<void> => {
  const params = ListVaccinationsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(vaccinationsTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(vaccinationsTable.patientId, params.data.patientId));
    res.json(await query);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [data] = await db.insert(vaccinationsTable).values(parsed.data).returning();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/growth-records", async (req, res): Promise<void> => {
  const params = ListGrowthRecordsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(growthRecordsTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(growthRecordsTable.patientId, params.data.patientId));
    const rows = await query;
    res.json(rows.map(g => ({
      ...g,
      weight: g.weight != null ? Number(g.weight) : null,
      height: g.height != null ? Number(g.height) : null,
      headCircumference: g.headCircumference != null ? Number(g.headCircumference) : null,
      bmi: g.bmi != null ? Number(g.bmi) : null,
      weightPercentile: g.weightPercentile != null ? Number(g.weightPercentile) : null,
      heightPercentile: g.heightPercentile != null ? Number(g.heightPercentile) : null,
      bmiPercentile: g.bmiPercentile != null ? Number(g.bmiPercentile) : null,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/growth-records", async (req, res): Promise<void> => {
  const parsed = CreateGrowthRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    let bmi: string | undefined;
    if (parsed.data.weight && parsed.data.height) {
      const heightM = Number(parsed.data.height) / 100;
      bmi = (Number(parsed.data.weight) / (heightM * heightM)).toFixed(2);
    }
    const [data] = await db.insert(growthRecordsTable).values({ ...parsed.data, ...(bmi ? { bmi } : {}) }).returning();
    res.status(201).json({
      ...data,
      weight: data.weight != null ? Number(data.weight) : null,
      height: data.height != null ? Number(data.height) : null,
      headCircumference: data.headCircumference != null ? Number(data.headCircumference) : null,
      bmi: data.bmi != null ? Number(data.bmi) : null,
      weightPercentile: null,
      heightPercentile: null,
      bmiPercentile: null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
