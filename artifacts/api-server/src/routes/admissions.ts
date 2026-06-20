import { Router } from "express";
import { supabase, mapRow, mapRows, dbError } from "../lib/supabase";

const router = Router();

router.get("/patients/:id/assessment", async (req, res): Promise<void> => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const { data, error } = await supabase
      .from("admission_assessments")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "No assessment found for this patient" }); return; }
    res.json(mapRow(data[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/admission-assessments", async (req, res): Promise<void> => {
  const { patientId, ...rest } = req.body;
  if (!patientId) { res.status(400).json({ error: "patientId is required" }); return; }
  try {
    const row: Record<string, unknown> = { patient_id: Number(patientId), author_id: 1 };
    for (const [k, v] of Object.entries(rest)) {
      row[k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)] = v;
    }
    const { data, error } = await supabase.from("admission_assessments").insert(row).select();
    if (dbError(error, res)) return;
    res.status(201).json(mapRow(data![0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/admission-assessments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(req.body)) {
      updates[k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)] = v;
    }
    const { data, error } = await supabase.from("admission_assessments").update(updates).eq("id", id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Assessment not found" }); return; }
    res.json(mapRow(data[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
