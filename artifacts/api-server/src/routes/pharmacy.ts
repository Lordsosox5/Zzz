import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
import {
  ListDrugsQueryParams,
  CreateDrugBody,
  UpdateDrugParams,
  UpdateDrugBody,
} from "@workspace/api-zod";

const router = Router();

function formatDrug(row: Record<string, unknown>) {
  const mapped = mapRow(row);
  return { ...mapped, unitPrice: Number(mapped.unitPrice ?? 0) };
}

router.get("/drugs", async (req, res): Promise<void> => {
  const params = ListDrugsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("drugs").select();
  if (params.data.search) {
    query = query.ilike("name", `%${params.data.search}%`);
  } else if (params.data.lowStock) {
    const { data: allDrugs, error } = await supabase.from("drugs").select();
    if (dbError(error, res)) return;
    const lowStock = (allDrugs ?? []).filter(
      (d: Record<string, unknown>) => Number(d.stock_quantity) <= Number(d.min_stock_level)
    );
    res.json(lowStock.map(formatDrug));
    return;
  } else {
    query = query.order("name");
  }
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json((data ?? []).map(formatDrug));
});

router.post("/drugs", async (req, res): Promise<void> => {
  const parsed = CreateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const snaked = toSnake(parsed.data as Record<string, unknown>);
  snaked.unit_price = parsed.data.unitPrice?.toFixed(2) ?? "0.00";
  const { data, error } = await supabase
    .from("drugs")
    .insert(snaked)
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(formatDrug(data));
});

router.patch("/drugs/:id", async (req, res): Promise<void> => {
  const params = UpdateDrugParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates = toSnake(parsed.data as Record<string, unknown>);
  if (parsed.data.unitPrice !== undefined) updates.unit_price = parsed.data.unitPrice.toFixed(2);
  const { data, error } = await supabase
    .from("drugs")
    .update(updates)
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Drug not found" }); return; }
  res.json(formatDrug(data));
});

export default router;
