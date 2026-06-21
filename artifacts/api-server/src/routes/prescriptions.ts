import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";

const router = Router();

async function getCallerUnitId(authHeader: string | undefined): Promise<number | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const [userId] = Buffer.from(token, "base64").toString("utf-8").split(":");
    const { data } = await supabase.from("users").select("unit_id").eq("id", parseInt(userId, 10)).limit(1);
    return data?.[0]?.unit_id ?? null;
  } catch { return null; }
}

async function unitPatientIds(unitId: number): Promise<number[]> {
  const { data } = await supabase.from("patients").select("id").eq("unit_id", unitId);
  return (data ?? []).map(r => r.id);
}

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const callerUnitId = await getCallerUnitId(req.headers.authorization);
    let allowedPatientIds: number[] | null = null;
    if (callerUnitId !== null) {
      allowedPatientIds = await unitPatientIds(callerUnitId);
      if (allowedPatientIds.length === 0) { res.json([]); return; }
    }

    let query = supabase.from("prescriptions").select("*");
    if (params.data.patientId) {
      const pid = params.data.patientId;
      if (allowedPatientIds !== null && !allowedPatientIds.includes(pid)) { res.json([]); return; }
      query = query.eq("patient_id", pid);
    } else if (allowedPatientIds !== null) {
      query = query.in("patient_id", allowedPatientIds);
    }
    if (params.data.status) query = query.eq("status", params.data.status);

    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    const rxList = mapRows(data ?? []);

    const patientIds = [...new Set(rxList.map((r: Record<string, unknown>) => r.patientId as number).filter(Boolean))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const { data: pd } = await supabase.from("patients").select("id, name_en").in("id", patientIds);
      for (const p of (pd ?? [])) patientMap[p.id] = p.name_en;
    }
    res.json(rxList.map((r: Record<string, unknown>) => ({ ...r, patientName: patientMap[r.patientId as number] ?? null, prescriberName: null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const insertData = { ...toSnake(parsed.data as Record<string, unknown>), prescriber_id: 1 };
    const { data, error } = await supabase.from("prescriptions").insert(insertData).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json({ ...mapRow(data), patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("prescriptions").select("*").eq("id", params.data.id).limit(1);
    if (error) { res.status(500).json({ error: error.message }); return; }
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
    const { data, error } = await supabase.from("prescriptions").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ ...mapRow(data), patientName: null, prescriberName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
