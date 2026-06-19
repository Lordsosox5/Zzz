import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
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
  let query = supabase.from("vaccinations").select().order("administered_date");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json(mapRows(data ?? []));
});

router.post("/vaccinations", async (req, res): Promise<void> => {
  const parsed = RecordVaccinationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("vaccinations")
    .insert(toSnake(parsed.data as Record<string, unknown>))
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(mapRow(data));
});

router.get("/growth-records", async (req, res): Promise<void> => {
  const params = ListGrowthRecordsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("growth_records").select().order("measurement_date");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json((data ?? []).map((g: Record<string, unknown>) => {
    const mapped = mapRow(g);
    return {
      ...mapped,
      weight: mapped.weight != null ? Number(mapped.weight) : null,
      height: mapped.height != null ? Number(mapped.height) : null,
      headCircumference: mapped.headCircumference != null ? Number(mapped.headCircumference) : null,
      bmi: mapped.bmi != null ? Number(mapped.bmi) : null,
      weightPercentile: mapped.weightPercentile != null ? Number(mapped.weightPercentile) : null,
      heightPercentile: mapped.heightPercentile != null ? Number(mapped.heightPercentile) : null,
      bmiPercentile: mapped.bmiPercentile != null ? Number(mapped.bmiPercentile) : null,
    };
  }));
});

router.post("/growth-records", async (req, res): Promise<void> => {
  const parsed = CreateGrowthRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const snaked = toSnake(parsed.data as Record<string, unknown>);
  if (parsed.data.weight && parsed.data.height) {
    const heightM = Number(parsed.data.height) / 100;
    snaked.bmi = (Number(parsed.data.weight) / (heightM * heightM)).toFixed(2);
  }
  const { data, error } = await supabase
    .from("growth_records")
    .insert(snaked)
    .select()
    .single();
  if (dbError(error, res)) return;
  const mapped = mapRow(data);
  res.status(201).json({
    ...mapped,
    weight: mapped.weight != null ? Number(mapped.weight) : null,
    height: mapped.height != null ? Number(mapped.height) : null,
    headCircumference: mapped.headCircumference != null ? Number(mapped.headCircumference) : null,
    bmi: mapped.bmi != null ? Number(mapped.bmi) : null,
    weightPercentile: null,
    heightPercentile: null,
    bmiPercentile: null,
  });
});

export default router;
