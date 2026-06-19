import { Router } from "express";
import { db, vaccinationsTable, growthRecordsTable } from "../lib/db";
import { eq, asc } from "drizzle-orm";
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
    let query = db.select().from(vaccinationsTable).orderBy(asc(vaccinationsTable.administeredDate));
    if (params.data.patientId) {
      query = query.where(eq(vaccinationsTable.patientId, params.data.patientId)) as typeof query;
    }
    const data = await query;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.insert(vaccinationsTable).values(parsed.data).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/growth-records", async (req, res): Promise<void> => {
  const params = ListGrowthRecordsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(growthRecordsTable).orderBy(asc(growthRecordsTable.measurementDate));
    if (params.data.patientId) {
      query = query.where(eq(growthRecordsTable.patientId, params.data.patientId)) as typeof query;
    }
    const data = await query;
    res.json(data.map((g) => ({
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
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/growth-records", async (req, res): Promise<void> => {
  const parsed = CreateGrowthRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const values: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.weight && parsed.data.height) {
      const heightM = Number(parsed.data.height) / 100;
      values.bmi = (Number(parsed.data.weight) / (heightM * heightM)).toFixed(2);
    }
    const rows = await db.insert(growthRecordsTable).values(values as never).returning();
    const g = rows[0] as Record<string, unknown>;
    res.status(201).json({
      ...g,
      weight: g.weight != null ? Number(g.weight) : null,
      height: g.height != null ? Number(g.height) : null,
      headCircumference: g.headCircumference != null ? Number(g.headCircumference) : null,
      bmi: g.bmi != null ? Number(g.bmi) : null,
      weightPercentile: null,
      heightPercentile: null,
      bmiPercentile: null,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
