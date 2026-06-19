import { Router } from "express";
import { supabase, mapRow, dbError, toSnake } from "../lib/supabase";

const router = Router();

router.get("/patients/:id/assessment", async (req, res): Promise<void> => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) {
    res.status(400).json({ error: "Invalid patient id" });
    return;
  }
  const { data, error } = await supabase
    .from("admission_assessments")
    .select()
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "No assessment found for this patient" }); return; }
  res.json(mapRow(data));
});

router.post("/admission-assessments", async (req, res): Promise<void> => {
  const { patientId, ...rest } = req.body;
  if (!patientId) {
    res.status(400).json({ error: "patientId is required" });
    return;
  }
  const snaked = toSnake(rest as Record<string, unknown>);
  const { data, error } = await supabase
    .from("admission_assessments")
    .insert({ patient_id: patientId, author_id: 1, ...snaked })
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(mapRow(data));
});

router.patch("/admission-assessments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { data, error } = await supabase
    .from("admission_assessments")
    .update(toSnake(req.body as Record<string, unknown>))
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Assessment not found" }); return; }
  res.json(mapRow(data));
});

export default router;
