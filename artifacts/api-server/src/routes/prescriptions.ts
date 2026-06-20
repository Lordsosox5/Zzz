import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake, dbError } from "../lib/supabase";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let q = supabase.from("prescriptions").select("*");
    if (params.data.patientId) q = q.eq("patient_id", params.data.patientId);
    if (params.data.status) q = q.eq("status", params.data.status);
    const { data, error } = await q;
    if (dbError(error, res)) return;
    const rxList = mapRows(data ?? []);
    const patientIds = [...new Set(rxList.map((r: any) => r.patientId).filter(Boolean))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const { data: pd } = await supabase.from("patients").select("id, name_en").in("id", patientIds);
      for (const p of pd ?? []) patientMap[p.id as number] = p.name_en as string;
    }
    res.json(rxList.map((r: any) => ({ ...r, patientName: patientMap[r.patientId] ?? null, prescriberName: null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const row = toSnake({ ...parsed.data, prescriberId: 1 } as Record<string, unknown>);
    const { data, error } = await supabase.from("prescriptions").insert(row).select();
    if (dbError(error, res)) return;
    res.status(201).json({ ...mapRow(data![0]), patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("prescriptions").select("*").eq("id", params.data.id).limit(1);
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ ...mapRow(data[0]), patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = UpdatePrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("prescriptions").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ ...mapRow(data[0]), patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
