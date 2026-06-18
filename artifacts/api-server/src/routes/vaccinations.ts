import { Router } from "express";
import { db } from "../lib/db";
import { vaccinationsTable, growthRecordsTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
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
    const rows = await query.orderBy(asc(vaccinationsTable.administeredDate));
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [row] = await db.insert(vaccinationsTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/growth-records", async (req, res): Promise<void> => {
  const params = ListGrowthRecordsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(growthRecordsTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(growthRecordsTable.patientId, params.data.patientId));
    const rows = await query.orderBy(asc(growthRecordsTable.measurementDate));
    res.json(rows.map((g) => ({
      ...g,
      weight: g.weight != null ? Number(g.weight) : null,
      height: g.height != null ? Number(g.height) : null,
      headCircumference: g.headCircumference != null ? Number(g.headCircumference) : null,
      bmi: g.bmi != null ? Number(g.bmi) : null,
      weightPercentile: g.weightPercentile != null ? Number(g.weightPercentile) : null,
      heightPercentile: g.heightPercentile != null ? Number(g.heightPercentile) : null,
      bmiPercentile: g.bmiPercentile != null ? Number(g.bmiPercentile) : null,
    })));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.post("/growth-records", async (req, res): Promise<void> => {
  const parsed = CreateGrowthRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const values: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.weight && parsed.data.height) {
    const heightM = Number(parsed.data.height) / 100;
    values.bmi = (Number(parsed.data.weight) / (heightM * heightM)).toFixed(2);
  }
  try {
    const [row] = await db.insert(growthRecordsTable).values(values as typeof growthRecordsTable.$inferInsert).returning();
    res.status(201).json({
      ...row,
      weight: row.weight != null ? Number(row.weight) : null,
      height: row.height != null ? Number(row.height) : null,
      headCircumference: row.headCircumference != null ? Number(row.headCircumference) : null,
      bmi: row.bmi != null ? Number(row.bmi) : null,
      weightPercentile: null,
      heightPercentile: null,
      bmiPercentile: null,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

export default router;
