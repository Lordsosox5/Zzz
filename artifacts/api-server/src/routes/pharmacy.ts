import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
import {
  ListDrugsQueryParams,
  CreateDrugBody,
  UpdateDrugParams,
  UpdateDrugBody,
} from "@workspace/api-zod";

const router = Router();

function formatDrug(row: Record<string, unknown>) {
  return { ...row, unitPrice: Number(row.unitPrice ?? 0) };
}

router.get("/drugs", async (req, res): Promise<void> => {
  const params = ListDrugsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    if (params.data.lowStock) {
      const { data, error } = await supabase.from("drugs").select("*");
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.json(mapRows(data ?? []).filter(d => Number(d.stockQuantity) <= Number(d.minStockLevel)).map(formatDrug));
      return;
    }
    let query = supabase.from("drugs").select("*");
    if (params.data.search) query = query.ilike("name", `%${params.data.search}%`);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(mapRows(data ?? []).map(formatDrug));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/drugs", async (req, res): Promise<void> => {
  const parsed = CreateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const insertData = {
      ...toSnake(parsed.data as Record<string, unknown>),
      unit_price: parsed.data.unitPrice?.toFixed(2) ?? "0.00",
    };
    const { data, error } = await supabase.from("drugs").insert(insertData).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(formatDrug(mapRow(data)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/drugs/:id", async (req, res): Promise<void> => {
  const params = UpdateDrugParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates = { ...toSnake(parsed.data as Record<string, unknown>) };
    if (parsed.data.unitPrice !== undefined) (updates as Record<string, unknown>).unit_price = parsed.data.unitPrice.toFixed(2);
    const { data, error } = await supabase.from("drugs").update(updates).eq("id", params.data.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data) { res.status(404).json({ error: "Drug not found" }); return; }
    res.json(formatDrug(mapRow(data)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
