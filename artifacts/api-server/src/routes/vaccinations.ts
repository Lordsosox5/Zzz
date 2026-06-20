import { Router } from "express";
import { db, vaccinationsTable, growthRecordsTable } from "../lib/db";
import {
  ListVaccinationsQueryParams,
  RecordVaccinationBody,
  ListGrowthRecordsQueryParams,
  CreateGrowthRecordBody,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import type { GrowthRecord } from "@workspace/db";

const router = Router();

router.get("/vaccinations", async (req, res): Promise<void> => {
  const params = ListVaccinationsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = params.data.patientId
      ? await db.select().from(vaccinationsTable).where(eq(vaccinationsTable.patientId, params.data.patientId))
      : await db.select().from(vaccinationsTable);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.insert(vaccinationsTable).values(parsed.data as any).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

function formatGrowth(g: GrowthRecord) {
  return {
    ...g,
    weight: g.weight != null ? Number(g.weight) : null,
    height: g.height != null ? Number(g.height) : null,
    headCircumference: g.headCircumference != null ? Number(g.headCircumference) : null,
    bmi: g.bmi != null ? Number(g.bmi) : null,
    weightPercentile: g.weightPercentile != null ? Number(g.weightPercentile) : null,
    heightPercentile: g.heightPercentile != null ? Number(g.heightPercentile) : null,
    bmiPercentile: g.bmiPercentile != null ? Number(g.bmiPercentile) : null,
  };
}

router.get("/growth-records", async (req, res): Promise<void> => {
  const params = ListGrowthRecordsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = params.data.patientId
      ? await db.select().from(growthRecordsTable).where(eq(growthRecordsTable.patientId, params.data.patientId))
      : await db.select().from(growthRecordsTable);
    res.json(rows.map(formatGrowth));
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
    const rows = await db.insert(growthRecordsTable).values({ ...parsed.data, ...(bmi ? { bmi } : {}) } as any).returning();
    const g = rows[0];
    res.status(201).json({
      ...formatGrowth(g),
      weightPercentile: null,
      heightPercentile: null,
      bmiPercentile: null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
