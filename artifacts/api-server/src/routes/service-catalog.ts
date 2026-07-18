import { Router } from "express";
import { supabase, mapRow, mapRows } from "../lib/supabase";

const router = Router();

const DEFAULT_SERVICES = [
  "فتح ملف مريض جديد",
  "استخراج ملف مريض",
  "رسوم عنبر",
  "رسوم عناية مكثفة",
  "رسوم متابعة مستمرة",
  "شراء دواء",
  "رسوم فحص",
];

router.get("/service-catalog", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("service_catalog")
    .select("id, name, created_at")
    .order("id");
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(mapRows(data ?? []));
});

router.post("/service-catalog", async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const { data, error } = await supabase
    .from("service_catalog")
    .insert({ name })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") { res.status(409).json({ error: "duplicate" }); return; }
    res.status(500).json({ error: error.message }); return;
  }
  res.status(201).json(mapRow(data));
});

router.delete("/service-catalog/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { error } = await supabase.from("service_catalog").delete().eq("id", id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).end();
});

router.post("/service-catalog/reset", async (_req, res): Promise<void> => {
  await supabase.from("service_catalog").delete().neq("id", 0);
  const rows = DEFAULT_SERVICES.map(name => ({ name }));
  const { data, error } = await supabase
    .from("service_catalog")
    .insert(rows)
    .select();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(mapRows(data ?? []));
});

export default router;
