import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake, dbError } from "../lib/supabase";
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
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    const { data } = await supabase.from("users").select("id, role, unit_id").eq("id", parseInt(userId, 10)).limit(1);
    const raw = data?.[0];
    if (!raw) return null;
    return { id: raw.id as number, role: raw.role as string, unitId: (raw.unit_id as number | null) ?? null };
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

    let countQ = supabase.from("patients").select("*", { count: "exact", head: true });
    let dataQ = supabase.from("patients").select("*").order("created_at", { ascending: true }).range(offset, offset + limit - 1);

    if (isUnitRestricted && caller.unitId !== null) {
      countQ = countQ.eq("unit_id", caller.unitId);
      dataQ = dataQ.eq("unit_id", caller.unitId);
    }

    if (search) {
      const f = `name_en.ilike.%${search}%,mrn.ilike.%${search}%`;
      countQ = countQ.or(f);
      dataQ = dataQ.or(f);
    }

    const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
    if (dbError(error, res)) return;
    res.json({ patients: mapRows(data ?? []), total: count ?? 0, page, limit });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/patients", async (req, res): Promise<void> => {
  const unitId = req.body.unitId ? Number(req.body.unitId) : undefined;
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const mrn = generateMRN();
    const row = toSnake({ ...parsed.data, mrn, unitId: unitId ?? null } as Record<string, unknown>);
    const { data, error } = await supabase.from("patients").insert(row).select();
    if (dbError(error, res)) return;
    res.status(201).json(mapRow(data![0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("patients").select("*").eq("id", params.data.id).limit(1);
    if (dbError(error, res)) return;
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
    const { data, error } = await supabase.from("patients").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(mapRow(data[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const { data } = await supabase.from("patients").select("unit_id").eq("id", id).limit(1);
    const unitId = (data?.[0]?.unit_id as number | null) ?? null;
    if (!unitId) { res.json({ unitId: null, unitNameEn: null, unitNameAr: null }); return; }
    const unit = units.find(u => u.id === unitId);
    res.json({ unitId, unitNameEn: unit?.nameEn ?? null, unitNameAr: unit?.nameAr ?? null });
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
    const unit = units.find(u => u.id === unitId);
    if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }
    await supabase.from("patients").update({ unit_id: unitId }).eq("id", id);
    res.json({ unitId, unitNameEn: unit.nameEn, unitNameAr: unit.nameAr ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/summary", async (req, res): Promise<void> => {
  const params = GetPatientSummaryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const id = params.data.id;
  try {
    const { data: patientData } = await supabase.from("patients").select("*").eq("id", id).limit(1);
    if (!patientData?.[0]) { res.status(404).json({ error: "Patient not found" }); return; }

    const [
      { data: notes },
      { data: rxs },
      { data: labs },
      { data: appts },
      { data: vaccs },
      { data: growth },
    ] = await Promise.all([
      supabase.from("clinical_notes").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(5),
      supabase.from("prescriptions").select("*").eq("patient_id", id).limit(5),
      supabase.from("lab_orders").select("*").eq("patient_id", id).limit(5),
      supabase.from("appointments").select("*").eq("patient_id", id).order("scheduled_at", { ascending: true }).limit(3),
      supabase.from("vaccinations").select("*").eq("patient_id", id).limit(10),
      supabase.from("growth_records").select("*").eq("patient_id", id).order("measurement_date", { ascending: false }).limit(1),
    ]);

    res.json({
      patient: mapRow(patientData[0]),
      recentNotes: mapRows(notes ?? []).map(n => ({ ...n, authorName: null })),
      activePrescriptions: mapRows(rxs ?? []).map(p => ({ ...p, patientName: null, prescriberName: null })),
      pendingLabOrders: mapRows(labs ?? []).map(l => ({ ...l, patientName: null, orderedByName: null })),
      upcomingAppointments: mapRows(appts ?? []).map(a => ({ ...a, patientName: null, doctorName: null })),
      latestGrowth: growth?.[0] ? mapRow(growth[0]) : null,
      vaccinations: mapRows(vaccs ?? []),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
