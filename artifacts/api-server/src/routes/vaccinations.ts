import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
import { computeGrowthMetrics } from "../lib/who-growth";
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

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function enrichWithMetrics(
  row: Record<string, unknown>,
  patient: { dateOfBirth: string; gender: string } | null,
): Record<string, unknown> {
  const weight = toNum(row.weight);
  const height = toNum(row.height);
  const muac = toNum(row.muac);
  const measurementDate = row.measurementDate as string;

  let metrics = {
    bmi: toNum(row.bmi),
    weightZScore: null as number | null,
    weightPercentile: null as number | null,
    heightZScore: null as number | null,
    heightPercentile: null as number | null,
    bmiZScore: null as number | null,
    bmiPercentile: null as number | null,
    muacZScore: null as number | null,
    muacPercentile: null as number | null,
    sdCategory: null as string | null,
  };

  if (patient?.dateOfBirth && patient?.gender && measurementDate) {
    const computed = computeGrowthMetrics(
      weight, height, muac, patient.gender, patient.dateOfBirth, measurementDate,
    );
    metrics = {
      bmi: computed.bmi ?? metrics.bmi,
      weightZScore: computed.weightZScore,
      weightPercentile: computed.weightPercentile,
      heightZScore: computed.heightZScore,
      heightPercentile: computed.heightPercentile,
      bmiZScore: computed.bmiZScore,
      bmiPercentile: computed.bmiPercentile,
      muacZScore: computed.muacZScore,
      muacPercentile: computed.muacPercentile,
      sdCategory: computed.sdCategory,
    };
  }

  return {
    ...row,
    weight,
    height,
    headCircumference: toNum(row.headCircumference),
    muac,
    ...metrics,
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

    const rows = mapRows(data ?? []) as Record<string, unknown>[];
    const patientIds = [...new Set(rows.map((r) => r.patientId as number).filter(Boolean))];

    let patientMap: Record<number, { name: string; dob: string; gender: string }> = {};
    if (patientIds.length > 0) {
      const { data: pd } = await supabase
        .from("patients")
        .select("id, name_en, date_of_birth, gender")
        .in("id", patientIds);
      for (const p of (pd ?? [])) {
        patientMap[p.id] = { name: p.name_en, dob: p.date_of_birth, gender: p.gender };
      }
    }

    const result = rows.map((r) => {
      const pid = r.patientId as number;
      const pt = patientMap[pid] ?? null;
      return {
        ...enrichWithMetrics(r, pt ? { dateOfBirth: pt.dob, gender: pt.gender } : null),
        patientName: pt?.name ?? null,
        patientDob: pt?.dob ?? null,
        patientGender: pt?.gender ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/growth-records", async (req, res): Promise<void> => {
  const parsed = CreateGrowthRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    // Fetch patient DOB + gender for z-score calculation
    const { data: patient } = await supabase
      .from("patients")
      .select("date_of_birth, gender")
      .eq("id", parsed.data.patientId)
      .single();

    const weight = parsed.data.weight ? Number(parsed.data.weight) : null;
    const height = parsed.data.height ? Number(parsed.data.height) : null;
    const muac = (parsed.data as Record<string, unknown>).muac
      ? Number((parsed.data as Record<string, unknown>).muac)
      : null;

    // Compute BMI
    let bmi: number | null = null;
    if (weight && height) {
      const hm = height / 100;
      bmi = Math.round((weight / (hm * hm)) * 100) / 100;
    }

    // Build insert object (muac may not exist in DB yet — handle gracefully)
    const insertBase: Record<string, unknown> = {
      ...toSnake(parsed.data as Record<string, unknown>),
      ...(bmi !== null ? { bmi: bmi.toString() } : {}),
    };

    // Attempt insert with muac; if column missing Supabase will error → retry without
    let insertData: Record<string, unknown>;
    if (muac !== null) {
      insertData = { ...insertBase, muac: muac.toString() };
    } else {
      insertData = insertBase;
    }

    let dbRow: Record<string, unknown>;
    const { data: d1, error: e1 } = await supabase
      .from("growth_records")
      .insert(insertData)
      .select()
      .single();

    if (e1 && e1.message?.includes("muac")) {
      // Column not yet in DB — insert without muac
      const { muac: _m, ...withoutMuac } = insertData;
      const { data: d2, error: e2 } = await supabase
        .from("growth_records")
        .insert(withoutMuac)
        .select()
        .single();
      if (e2) { res.status(500).json({ error: e2.message }); return; }
      dbRow = mapRow(d2) as Record<string, unknown>;
      dbRow.muac = muac; // attach submitted value in response even if not stored
    } else if (e1) {
      res.status(500).json({ error: e1.message });
      return;
    } else {
      dbRow = mapRow(d1) as Record<string, unknown>;
    }

    const pt = patient
      ? { dateOfBirth: patient.date_of_birth, gender: patient.gender }
      : null;
    const enriched = enrichWithMetrics(dbRow, pt);

    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
