import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
import {
  ListPatientsQueryParams,
  CreatePatientBody,
  GetPatientParams,
  UpdatePatientParams,
  UpdatePatientBody,
  GetPatientSummaryParams,
} from "@workspace/api-zod";

const router = Router();

const UNIT_RESTRICTED_ROLES = ["house_officer", "medical_officer"];

// Supabase patients table has no 'place' column; we store it in 'address'.
// mapPatient re-exposes address as 'place' so the frontend receives the right field.
function mapPatient(raw: Record<string, unknown>) {
  const p = mapRow<Record<string, unknown>>(raw);
  return { ...p, place: (p as any).address ?? null };
}

let mrnCounter = 1000;
function generateMRN(): string {
  return `AMH-${String(++mrnCounter).padStart(5, "0")}`;
}

export async function initMrnCounter(): Promise<void> {
  try {
    const { data } = await supabase.from("patients").select("mrn").order("id", { ascending: false }).limit(1);
    const mrn = data?.[0]?.mrn;
    if (mrn) {
      const num = parseInt(String(mrn).replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > mrnCounter) mrnCounter = num;
    }
  } catch { }
}

async function getCallerInfo(authHeader: string | undefined): Promise<{ id: number; role: string; unitId: number | null } | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const [userId] = Buffer.from(token, "base64").toString("utf-8").split(":");
    const { data } = await supabase.from("users").select("id, role, unit_id").eq("id", parseInt(userId, 10)).limit(1);
    const raw = data?.[0];
    if (!raw) return null;
    return { id: raw.id, role: raw.role, unitId: raw.unit_id ?? null };
  } catch {
    return null;
  }
}

router.get("/patients", async (req, res): Promise<void> => {
  const params = ListPatientsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { search, page = 1, limit = 20 } = params.data;
    const offset = (page - 1) * limit;
    const caller = await getCallerInfo(req.headers.authorization);
    const isUnitRestricted = caller && UNIT_RESTRICTED_ROLES.includes(caller.role);

    if (isUnitRestricted && caller.unitId === null) {
      res.json({ patients: [], total: 0, page, limit });
      return;
    }

    let query = supabase.from("patients").select("*", { count: "exact" });
    if (isUnitRestricted && caller.unitId !== null) query = query.eq("unit_id", caller.unitId);
    if (search) query = query.or(`name_en.ilike.%${search}%,mrn.ilike.%${search}%`);
    query = query.order("created_at", { ascending: true }).range(offset, offset + limit - 1);

    const { data, count: total, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ patients: (data ?? []).map(mapPatient), total: total ?? 0, page, limit });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/patients", async (req, res): Promise<void> => {
  const unitId = req.body.unitId ? Number(req.body.unitId) : undefined;
  const place = req.body.place ? String(req.body.place) : null;
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const mrn = generateMRN();
    const base = toSnake(parsed.data as Record<string, unknown>);
    delete base.place; // no 'place' column in Supabase; stored in 'address' instead
    const insertData = { ...base, mrn, unit_id: unitId ?? null, address: place };
    const { data, error } = await supabase.from("patients").insert(insertData).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(mapPatient(data));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("patients").select("*").eq("id", params.data.id).limit(1);
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data?.[0]) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(mapRow(data[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/patients/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("patients").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(mapRow(data));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/patients/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const caller = await getCallerInfo(req.headers.authorization);
    if (!caller || caller.role !== "super_admin") {
      res.status(403).json({ error: "Forbidden: super_admin only" });
      return;
    }
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const { data } = await supabase.from("patients").select("unit_id").eq("id", id).limit(1);
    const unitId = data?.[0]?.unit_id ?? null;
    if (!unitId) { res.json({ unitId: null, unitNameEn: null, unitNameAr: null }); return; }
    const { data: unitData } = await supabase.from("units").select("id, name_en, name_ar").eq("id", unitId).single();
    res.json({ unitId, unitNameEn: unitData?.name_en ?? null, unitNameAr: unitData?.name_ar ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  const { unitId } = req.body as { unitId: number | null };
  try {
    if (unitId === null || unitId === undefined) {
      await supabase.from("patients").update({ unit_id: null }).eq("id", id);
      res.json({ unitId: null, unitNameEn: null, unitNameAr: null });
      return;
    }
    const { data: unitData, error: unitError } = await supabase.from("units").select("id, name_en, name_ar").eq("id", unitId).single();
    if (unitError || !unitData) { res.status(404).json({ error: "Unit not found" }); return; }
    await supabase.from("patients").update({ unit_id: unitId }).eq("id", id);
    res.json({ unitId, unitNameEn: unitData.name_en ?? null, unitNameAr: unitData.name_ar ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/summary", async (req, res): Promise<void> => {
  const params = GetPatientSummaryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const id = params.data.id;
  try {
    const { data: patientData, error: pe } = await supabase.from("patients").select("*").eq("id", id).limit(1);
    if (pe || !patientData?.[0]) { res.status(404).json({ error: "Patient not found" }); return; }

    const [notes, rxs, labs, appts, vaccs, growth] = await Promise.all([
      supabase.from("clinical_notes").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(5),
      supabase.from("prescriptions").select("*").eq("patient_id", id).limit(5),
      supabase.from("lab_orders").select("*").eq("patient_id", id).limit(5),
      supabase.from("appointments").select("*").eq("patient_id", id).order("scheduled_at", { ascending: true }).limit(3),
      supabase.from("vaccinations").select("*").eq("patient_id", id).limit(10),
      supabase.from("growth_records").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(1),
    ]);

    res.json({
      patient: mapRow(patientData[0]),
      recentNotes: mapRows(notes.data ?? []).map(n => ({ ...n, authorName: null })),
      activePrescriptions: mapRows(rxs.data ?? []).map(p => ({ ...p, patientName: null, prescriberName: null })),
      pendingLabOrders: mapRows(labs.data ?? []).map(l => ({ ...l, patientName: null, orderedByName: null })),
      upcomingAppointments: mapRows(appts.data ?? []).map(a => ({ ...a, patientName: null, doctorName: null })),
      latestGrowth: growth.data?.[0] ? mapRow(growth.data[0]) : null,
      vaccinations: mapRows(vaccs.data ?? []),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
