import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake, dbError } from "../lib/supabase";
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

async function fetchUserNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from("users").select("id, name_en").in("id", ids);
  const map: Record<number, string> = {};
  for (const u of data ?? []) map[u.id as number] = u.name_en as string;
  return map;
}

async function fetchPatientNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from("patients").select("id, name_en").in("id", ids);
  const map: Record<number, string> = {};
  for (const p of data ?? []) map[p.id as number] = p.name_en as string;
  return map;
}

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let q = supabase.from("lab_orders").select("*");
    if (params.data.patientId) q = q.eq("patient_id", params.data.patientId);
    if (params.data.status) q = q.eq("status", params.data.status);
    const { data, error } = await q;
    if (dbError(error, res)) return;
    const orders = mapRows(data ?? []);
    const patientIds = [...new Set(orders.map((o: any) => o.patientId).filter(Boolean))];
    const userIds = [...new Set(orders.map((o: any) => o.orderedById).filter(Boolean))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds as number[]), fetchUserNames(userIds as number[])]);
    res.json(orders.map((o: any) => ({ ...o, patientName: patientMap[o.patientId] ?? null, orderedByName: userMap[o.orderedById] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const row = toSnake({ ...parsed.data, orderedById } as Record<string, unknown>);
    const { data, error } = await supabase.from("lab_orders").insert(row).select();
    if (dbError(error, res)) return;
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...mapRow(data![0]), patientName: null, orderedByName: userMap[orderedById] ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("lab_orders").select("*").eq("id", params.data.id).limit(1);
    if (dbError(error, res)) return;
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
    const { data, error } = await supabase.from("lab_orders").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json({ ...mapRow(data[0]), patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let q = supabase.from("radiology_orders").select("*");
    if (params.data.patientId) q = q.eq("patient_id", params.data.patientId);
    if (params.data.status) q = q.eq("status", params.data.status);
    const { data, error } = await q;
    if (dbError(error, res)) return;
    const orders = mapRows(data ?? []);
    const patientIds = [...new Set(orders.map((o: any) => o.patientId).filter(Boolean))];
    const userIds = [...new Set(orders.map((o: any) => o.orderedById).filter(Boolean))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds as number[]), fetchUserNames(userIds as number[])]);
    res.json(orders.map((o: any) => ({ ...o, patientName: patientMap[o.patientId] ?? null, orderedByName: userMap[o.orderedById] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const row = toSnake({ ...parsed.data, orderedById } as Record<string, unknown>);
    const { data, error } = await supabase.from("radiology_orders").insert(row).select();
    if (dbError(error, res)) return;
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...mapRow(data![0]), patientName: null, orderedByName: userMap[orderedById] ?? null });
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
    const { data, error } = await supabase.from("radiology_orders").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Radiology order not found" }); return; }
    res.json({ ...mapRow(data[0]), patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
