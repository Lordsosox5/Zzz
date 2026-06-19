import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";

const router = Router();

function formatRx(row: Record<string, unknown>) {
  return { ...mapRow(row), patientName: null, prescriberName: null };
}

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  let query = supabase.from("prescriptions").select().order("created_at");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  if (params.data.status) query = query.eq("status", params.data.status);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  const rxList = data ?? [];
  const patientIds = [...new Set(rxList.map((o: Record<string, unknown>) => o.patient_id).filter(Boolean))];
  let patientMap: Record<number, string> = {};
  if (patientIds.length > 0) {
    const { data: patients } = await supabase.from("patients").select("id,name_en").in("id", patientIds);
    if (patients) {
      for (const p of patients as Array<{ id: number; name_en: string }>) patientMap[p.id] = p.name_en;
    }
  }
  res.json(rxList.map((row: Record<string, unknown>) => ({
    ...mapRow(row),
    patientName: patientMap[(row.patient_id as number)] ?? null,
    prescriberName: null,
  })));
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("prescriptions")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), prescriber_id: 1 })
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(formatRx(data));
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("prescriptions")
    .select()
    .eq("id", params.data.id)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.json(formatRx(data));
});

router.patch("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = UpdatePrescriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("prescriptions")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.json(formatRx(data));
});

export default router;
