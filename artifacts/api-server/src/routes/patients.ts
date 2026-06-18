import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
import {
  ListPatientsQueryParams,
  CreatePatientBody,
  GetPatientParams,
  UpdatePatientParams,
  UpdatePatientBody,
  GetPatientSummaryParams,
} from "@workspace/api-zod";

const router = Router();

let mrnCounter = 1000;
function generateMRN(): string {
  return `AMH-${String(++mrnCounter).padStart(5, "0")}`;
}

router.get("/patients", async (req, res): Promise<void> => {
  const params = ListPatientsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { search, page = 1, limit = 20 } = params.data;
  const offset = (page - 1) * limit;

  let query = supabase.from("patients").select("*", { count: "exact" });
  if (search) {
    query = query.or(`name_en.ilike.%${search}%,mrn.ilike.%${search}%,name_ar.ilike.%${search}%`);
  }
  query = query.order("created_at").range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (dbError(error, res)) return;
  res.json({
    patients: mapRows(data ?? []),
    total: count ?? 0,
    page,
    limit,
  });
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const mrn = generateMRN();
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), mrn })
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(mapRow(data));
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("patients")
    .select()
    .eq("id", params.data.id)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(mapRow(data));
});

router.patch("/patients/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("patients")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(mapRow(data));
});

router.get("/patients/:id/summary", async (req, res): Promise<void> => {
  const params = GetPatientSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const id = params.data.id;
  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (pErr) { res.status(500).json({ error: pErr.message }); return; }
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

  const [
    { data: notes },
    { data: rxs },
    { data: labs },
    { data: appts },
    { data: vaccs },
    { data: growth },
  ] = await Promise.all([
    supabase.from("clinical_notes").select().eq("patient_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("prescriptions").select().eq("patient_id", id).limit(5),
    supabase.from("lab_orders").select().eq("patient_id", id).limit(5),
    supabase.from("appointments").select().eq("patient_id", id).order("scheduled_at").limit(3),
    supabase.from("vaccinations").select().eq("patient_id", id).limit(10),
    supabase.from("growth_records").select().eq("patient_id", id).order("measurement_date", { ascending: false }).limit(1),
  ]);

  const latestGrowth = growth?.[0] ? mapRow(growth[0]) : null;

  res.json({
    patient: mapRow(patient),
    recentNotes: mapRows(notes ?? []).map((n: Record<string, unknown>) => ({ ...n, authorName: null })),
    activePrescriptions: mapRows(rxs ?? []).map((p: Record<string, unknown>) => ({ ...p, patientName: null, prescriberName: null })),
    pendingLabOrders: mapRows(labs ?? []).map((l: Record<string, unknown>) => ({ ...l, patientName: null, orderedByName: null })),
    upcomingAppointments: mapRows(appts ?? []).map((a: Record<string, unknown>) => ({ ...a, patientName: null, doctorName: null })),
    latestGrowth,
    vaccinations: mapRows(vaccs ?? []),
  });
});

export default router;
