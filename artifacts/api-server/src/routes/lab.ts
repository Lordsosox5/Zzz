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

function formatLabOrder(row: Record<string, unknown>) {
  const mapped = mapRow(row);
  return { ...mapped, patientName: null, orderedByName: null };
}

function formatRadOrder(row: Record<string, unknown>) {
  const mapped = mapRow(row);
  return { ...mapped, patientName: null, orderedByName: null };
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
  const patientIds = [...new Set(orders.map((o: Record<string, unknown>) => o.patient_id).filter(Boolean))];
  let patientMap: Record<number, string> = {};
  if (patientIds.length > 0) {
    const { data: patients } = await supabase.from("patients").select("id,name_en").in("id", patientIds);
    if (patients) {
      for (const p of patients as Array<{ id: number; name_en: string }>) patientMap[p.id] = p.name_en;
    }
  }
  res.json(orders.map((row: Record<string, unknown>) => {
    const mapped = mapRow(row);
    return { ...mapped, patientName: patientMap[(row.patient_id as number)] ?? null, orderedByName: null };
  }));
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("lab_orders")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), ordered_by_id: 1 })
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(formatLabOrder(data));
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
  res.json(formatLabOrder(data));
});

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("radiology_orders").select().order("created_at");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  if (params.data.status) query = query.eq("status", params.data.status);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json((data ?? []).map(formatRadOrder));
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("radiology_orders")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), ordered_by_id: 1 })
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(formatRadOrder(data));
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
