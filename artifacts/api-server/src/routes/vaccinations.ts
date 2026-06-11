import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, vaccinationsTable, growthRecordsTable } from "@workspace/db";
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
  const results = params.data.patientId
    ? await db.select().from(vaccinationsTable).where(eq(vaccinationsTable.patientId, params.data.patientId)).orderBy(vaccinationsTable.administeredDate)
    : await db.select().from(vaccinationsTable).orderBy(vaccinationsTable.administeredDate);
  res.json(results.map(v => ({ ...v, createdAt: v.createdAt.toISOString() })));
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [vacc] = await db.insert(vaccinationsTable).values(parsed.data).returning();
  res.status(201).json({ ...vacc, createdAt: vacc.createdAt.toISOString() });
});

router.get("/growth-records", async (req, res): Promise<void> => {
  const params = ListGrowthRecordsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const results = params.data.patientId
    ? await db.select().from(growthRecordsTable).where(eq(growthRecordsTable.patientId, params.data.patientId)).orderBy(growthRecordsTable.measurementDate)
    : await db.select().from(growthRecordsTable).orderBy(growthRecordsTable.measurementDate);
  res.json(results.map(g => ({
    ...g,
    weight: g.weight ? Number(g.weight) : null,
    height: g.height ? Number(g.height) : null,
    headCircumference: g.headCircumference ? Number(g.headCircumference) : null,
    bmi: g.bmi ? Number(g.bmi) : null,
    weightPercentile: g.weightPercentile ? Number(g.weightPercentile) : null,
    heightPercentile: g.heightPercentile ? Number(g.heightPercentile) : null,
    bmiPercentile: g.bmiPercentile ? Number(g.bmiPercentile) : null,
    createdAt: g.createdAt.toISOString(),
  })));
});

router.post("/growth-records", async (req, res): Promise<void> => {
  const parsed = CreateGrowthRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = { ...parsed.data };
  // Calculate BMI if weight and height provided
  if (parsed.data.weight && parsed.data.height) {
    const heightM = parsed.data.height / 100;
    data.bmi = (parsed.data.weight / (heightM * heightM)).toFixed(2);
  }
  const [record] = await db.insert(growthRecordsTable).values(data as never).returning();
  res.status(201).json({
    ...record,
    weight: record.weight ? Number(record.weight) : null,
    height: record.height ? Number(record.height) : null,
    headCircumference: record.headCircumference ? Number(record.headCircumference) : null,
    bmi: record.bmi ? Number(record.bmi) : null,
    weightPercentile: null,
    heightPercentile: null,
    bmiPercentile: null,
    createdAt: record.createdAt.toISOString(),
  });
});

export default router;
