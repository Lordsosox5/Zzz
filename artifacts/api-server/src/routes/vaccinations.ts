import { Router } from "express";
import { db, vaccinationsTable, growthRecordsTable } from "@workspace/db";
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
    let query = db.select().from(vaccinationsTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(vaccinationsTable.patientId, params.data.patientId));
    const data = await query.orderBy(asc(vaccinationsTable.administeredDate));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [vacc] = await db.insert(vaccinationsTable).values(parsed.data as any).returning();
    res.status(201).json(vacc);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/growth-records", async (req, res): Promise<void> => {
  const params = ListGrowthRecordsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(growthRecordsTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(growthRecordsTable.patientId, params.data.patientId));
    const data = await query.orderBy(asc(growthRecordsTable.measurementDate));
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
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/growth-records", async (req, res): Promise<void> => {
  const parsed = CreateGrowthRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const values: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.weight && parsed.data.height) {
      const heightM = parsed.data.height / 100;
      values.bmi = (parsed.data.weight / (heightM * heightM)).toFixed(2);
    }
    const [record] = await db.insert(growthRecordsTable).values(values as any).returning();
    res.status(201).json({
      ...record,
      weight: record.weight != null ? Number(record.weight) : null,
      height: record.height != null ? Number(record.height) : null,
      headCircumference: record.headCircumference != null ? Number(record.headCircumference) : null,
      bmi: record.bmi != null ? Number(record.bmi) : null,
      weightPercentile: null,
      heightPercentile: null,
      bmiPercentile: null,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
