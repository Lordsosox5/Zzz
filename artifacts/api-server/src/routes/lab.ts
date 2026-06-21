import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
import {
  ListLabOrdersQueryParams,
  CreateLabOrderBody,
  GetLabOrderParams,
  UpdateLabOrderParams,
  UpdateLabOrderBody,
  ListRadiologyOrdersQueryParams,
  CreateRadiologyOrderBody,
  UpdateRadiologyOrderParams,
  UpdateRadiologyOrderBody,
} from "@workspace/api-zod";

const router = Router();

function userIdFromReq(req: import("express").Request): number | null {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    if (!token) return null;
    const [id] = Buffer.from(token, "base64").toString("utf8").split(":");
    const n = parseInt(id, 10);
    return isNaN(n) ? null : n;
  } catch { return null; }
}

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

async function fetchUserNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from("users").select("id, name_en").in("id", ids);
  const map: Record<number, string> = {};
  for (const u of (data ?? [])) map[u.id] = u.name_en;
  return map;
}

async function fetchPatientNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from("patients").select("id, name_en").in("id", ids);
  const map: Record<number, string> = {};
  for (const p of (data ?? [])) map[p.id] = p.name_en;
  return map;
}

// ── Lab Orders ──────────────────────────────────────────────────────────────

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const callerUnitId = await getCallerUnitId(req.headers.authorization);
    let allowedPatientIds: number[] | null = null;
    if (callerUnitId !== null) {
      allowedPatientIds = await unitPatientIds(callerUnitId);
      if (allowedPatientIds.length === 0) { res.json([]); return; }
    }

    let query = supabase.from("lab_orders").select("*");
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
    const orders = mapRows(data ?? []);
    const patientIds = [...new Set(orders.map((o: Record<string, unknown>) => o.patientId as number).filter(Boolean))];
    const userIds = [...new Set(orders.map((o: Record<string, unknown>) => o.orderedById as number).filter(Boolean))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds), fetchUserNames(userIds)]);
    res.json(orders.map((o: Record<string, unknown>) => ({ ...o, patientName: patientMap[o.patientId as number] ?? null, orderedByName: userMap[o.orderedById as number] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const insertData = { ...toSnake(parsed.data as Record<string, unknown>), ordered_by_id: orderedById };
    const { data, error } = await supabase.from("lab_orders").insert(insertData).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...mapRow(data), patientName: null, orderedByName: userMap[orderedById] ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("lab_orders").select("*").eq("id", params.data.id).limit(1);
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data?.[0]) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json({ ...mapRow(data[0]), patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("lab_orders").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json({ ...mapRow(data), patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Radiology Orders ─────────────────────────────────────────────────────────

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const callerUnitId = await getCallerUnitId(req.headers.authorization);
    let allowedPatientIds: number[] | null = null;
    if (callerUnitId !== null) {
      allowedPatientIds = await unitPatientIds(callerUnitId);
      if (allowedPatientIds.length === 0) { res.json([]); return; }
    }

    let query = supabase.from("radiology_orders").select("*");
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
    const orders = mapRows(data ?? []);
    const patientIds = [...new Set(orders.map((o: Record<string, unknown>) => o.patientId as number).filter(Boolean))];
    const userIds = [...new Set(orders.map((o: Record<string, unknown>) => o.orderedById as number).filter(Boolean))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds), fetchUserNames(userIds)]);
    res.json(orders.map((o: Record<string, unknown>) => ({ ...o, patientName: patientMap[o.patientId as number] ?? null, orderedByName: userMap[o.orderedById as number] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const insertData = { ...toSnake(parsed.data as Record<string, unknown>), ordered_by_id: orderedById };
    const { data, error } = await supabase.from("radiology_orders").insert(insertData).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...mapRow(data), patientName: null, orderedByName: userMap[orderedById] ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/radiology-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("radiology_orders").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data) { res.status(404).json({ error: "Radiology order not found" }); return; }
    res.json({ ...mapRow(data), patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
