import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
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
    let query = supabase.from("vaccinations").select("*");
    if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(mapRows(data ?? []));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("vaccinations").insert(toSnake(parsed.data as Record<string, unknown>)).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(mapRow(data));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

function formatGrowth(g: Record<string, unknown>) {
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
    let query = supabase.from("growth_records").select("*");
    if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(mapRows(data ?? []).map(formatGrowth));
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
    const insertData = { ...toSnake(parsed.data as Record<string, unknown>), ...(bmi ? { bmi } : {}) };
    const { data, error } = await supabase.from("growth_records").insert(insertData).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json({
      ...formatGrowth(mapRow(data)),
      weightPercentile: null,
      heightPercentile: null,
      bmiPercentile: null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
