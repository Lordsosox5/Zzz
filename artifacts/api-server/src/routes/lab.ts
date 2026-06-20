import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
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

/** Decode the base64 auth token and return the numeric user id, or null. */
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

/** Look up names for a set of user ids from the users table. */
async function fetchUserNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from("users").select("id,name_en").in("id", ids);
  const map: Record<number, string> = {};
  if (data) for (const u of data as Array<{ id: number; name_en: string }>) map[u.id] = u.name_en;
  return map;
}

function formatLabOrder(row: Record<string, unknown>, userMap: Record<number, string> = {}, patientMap: Record<number, string> = {}) {
  const mapped = mapRow(row);
  return {
    ...mapped,
    patientName:   patientMap[(row.patient_id as number)]    ?? null,
    orderedByName: userMap[(row.ordered_by_id as number)]    ?? null,
  };
}

function formatRadOrder(row: Record<string, unknown>, userMap: Record<number, string> = {}, patientMap: Record<number, string> = {}) {
  const mapped = mapRow(row);
  return {
    ...mapped,
    patientName:   patientMap[(row.patient_id as number)]    ?? null,
    orderedByName: userMap[(row.ordered_by_id as number)]    ?? null,
  };
}

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("lab_orders").select().order("created_at");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  if (params.data.status) query = query.eq("status", params.data.status);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  const orders = data ?? [];
  const patientIds = [...new Set(orders.map((o: Record<string, unknown>) => o.patient_id).filter(Boolean))] as number[];
  const userIds    = [...new Set(orders.map((o: Record<string, unknown>) => o.ordered_by_id).filter(Boolean))] as number[];
  const [patientMap, userMap] = await Promise.all([
    (async () => {
      if (patientIds.length === 0) return {} as Record<number, string>;
      const { data: patients } = await supabase.from("patients").select("id,name_en").in("id", patientIds);
      const m: Record<number, string> = {};
      if (patients) for (const p of patients as Array<{ id: number; name_en: string }>) m[p.id] = p.name_en;
      return m;
    })(),
    fetchUserNames(userIds),
  ]);
  res.json(orders.map((row: Record<string, unknown>) => formatLabOrder(row, userMap, patientMap)));
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const orderedById = userIdFromReq(req) ?? 1;
  const { data, error } = await supabase
    .from("lab_orders")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), ordered_by_id: orderedById })
    .select()
    .single();
  if (dbError(error, res)) return;
  const userMap = await fetchUserNames([orderedById]);
  res.status(201).json(formatLabOrder(data, userMap));
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { data, error } = await supabase
    .from("lab_orders")
    .select()
    .eq("id", params.data.id)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Lab order not found" }); return; }
  res.json(formatLabOrder(data));
});

router.patch("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("lab_orders")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Lab order not found" }); return; }
  res.json(formatLabOrder(data, userMap));
});

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("radiology_orders").select().order("created_at");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  if (params.data.status) query = query.eq("status", params.data.status);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  const orders = data ?? [];
  const patientIds = [...new Set(orders.map((o: Record<string, unknown>) => o.patient_id).filter(Boolean))] as number[];
  const userIds    = [...new Set(orders.map((o: Record<string, unknown>) => o.ordered_by_id).filter(Boolean))] as number[];
  const [patientMap, userMap] = await Promise.all([
    (async () => {
      if (patientIds.length === 0) return {} as Record<number, string>;
      const { data: patients } = await supabase.from("patients").select("id,name_en").in("id", patientIds);
      const m: Record<number, string> = {};
      if (patients) for (const p of patients as Array<{ id: number; name_en: string }>) m[p.id] = p.name_en;
      return m;
    })(),
    fetchUserNames(userIds),
  ]);
  res.json(orders.map((row: Record<string, unknown>) => formatRadOrder(row, userMap, patientMap)));
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const orderedById = userIdFromReq(req) ?? 1;
  const { data, error } = await supabase
    .from("radiology_orders")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), ordered_by_id: orderedById })
    .select()
    .single();
  if (dbError(error, res)) return;
  const userMap = await fetchUserNames([orderedById]);
  res.status(201).json(formatRadOrder(data, userMap));
});

router.patch("/radiology-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("radiology_orders")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Radiology order not found" }); return; }
  res.json(formatRadOrder(data));
});

export default router;
