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
import { units } from "./units";

const router = Router();

const UNIT_RESTRICTED_ROLES = ["house_officer", "medical_officer"];

let mrnCounter = 1000;
function generateMRN(): string {
  return `AMH-${String(++mrnCounter).padStart(5, "0")}`;
}

/** Call once at server startup to seed the counter from the DB max MRN. */
export async function initMrnCounter(): Promise<void> {
  try {
    const { data } = await supabase
      .from("patients")
      .select("mrn")
      .order("mrn", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.mrn) {
      const num = parseInt(data.mrn.replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > mrnCounter) {
        mrnCounter = num;
      }
    }
  } catch {
    // Non-fatal — fall back to default counter
  }
}

async function getCallerInfo(authHeader: string | undefined): Promise<{ id: number; role: string; unitId: number | null } | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    const { data: user } = await supabase
      .from("users")
      .select("id, role, unit_id")
      .eq("id", parseInt(userId, 10))
      .maybeSingle();
    if (!user) return null;
    return { id: Number(user.id), role: user.role as string, unitId: (user.unit_id as number | null) ?? null };
  } catch {
    return null;
  }
}

router.get("/patients", async (req, res): Promise<void> => {
  const params = ListPatientsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { search, page = 1, limit = 20 } = params.data;
  const offset = (page - 1) * limit;

  // Check if the caller is a unit-restricted role
  const caller = await getCallerInfo(req.headers.authorization);
  const isUnitRestricted = caller && UNIT_RESTRICTED_ROLES.includes(caller.role);

  if (isUnitRestricted) {
    if (caller.unitId !== null) {
      // Return only patients assigned to this unit (read from Supabase unit_id column)
      let query = supabase
        .from("patients")
        .select("*", { count: "exact" })
        .eq("unit_id", caller.unitId);
      if (search) {
        query = query.or(`name_en.ilike.%${search}%,mrn.ilike.%${search}%,name_ar.ilike.%${search}%`);
      }
      query = query.order("created_at").range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (dbError(error, res)) return;
      res.json({ patients: mapRows(data ?? []), total: count ?? 0, page, limit });
      return;
    }
    // Unit-restricted role but no unit assigned → return empty list
    res.json({ patients: [], total: 0, page, limit });
    return;
  }

  // Unrestricted role — return all patients
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
  // Extract unitId before Zod strips unknown fields
  const unitId = req.body.unitId ? Number(req.body.unitId) : undefined;

  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const mrn = generateMRN();
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), mrn, unit_id: unitId ?? null })
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

router.get("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  const { data: patient } = await supabase
    .from("patients")
    .select("unit_id")
    .eq("id", id)
    .maybeSingle();
  const unitId = patient?.unit_id ?? null;
  if (!unitId) {
    res.json({ unitId: null, unitNameEn: null, unitNameAr: null });
    return;
  }
  const unit = units.find(u => u.id === unitId);
  res.json({
    unitId,
    unitNameEn: unit?.nameEn ?? null,
    unitNameAr: unit?.nameAr ?? null,
  });
});

router.patch("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }

  const { unitId } = req.body as { unitId: number | null };

  if (unitId === null || unitId === undefined) {
    await supabase.from("patients").update({ unit_id: null }).eq("id", id);
    res.json({ unitId: null, unitNameEn: null, unitNameAr: null });
    return;
  }

  const unit = units.find(u => u.id === unitId);
  if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }

  await supabase.from("patients").update({ unit_id: unitId }).eq("id", id);
  res.json({
    unitId,
    unitNameEn: unit.nameEn,
    unitNameAr: unit.nameAr ?? null,
  });
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
