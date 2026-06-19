import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
import {
  ListClinicalNotesQueryParams,
  CreateClinicalNoteBody,
  GetClinicalNoteParams,
  UpdateClinicalNoteParams,
  UpdateClinicalNoteBody,
  ListDiagnosesQueryParams,
  CreateDiagnosisBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/clinical-notes", async (req, res): Promise<void> => {
  const params = ListClinicalNotesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("clinical_notes").select().order("created_at");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  if (params.data.type) query = query.eq("type", params.data.type);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  const notes = data ?? [];
  const patientIds = [...new Set(notes.map((n: Record<string, unknown>) => n.patient_id).filter(Boolean))];
  let patientMap: Record<number, string> = {};
  if (patientIds.length > 0) {
    const { data: patients } = await supabase.from("patients").select("id,name_en").in("id", patientIds);
    if (patients) {
      for (const p of patients as Array<{ id: number; name_en: string }>) patientMap[p.id] = p.name_en;
    }
  }
  res.json(mapRows(notes).map((n: Record<string, unknown>) => ({
    ...n,
    patientName: patientMap[(n.patientId as number)] ?? null,
    authorName: null,
  })));
});

router.post("/clinical-notes", async (req, res): Promise<void> => {
  const parsed = CreateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("clinical_notes")
    .insert({ ...toSnake(parsed.data as Record<string, unknown>), author_id: 1 })
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json({ ...mapRow(data), authorName: null });
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { data, error } = await supabase
    .from("clinical_notes")
    .select()
    .eq("id", params.data.id)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Note not found" }); return; }
  res.json({ ...mapRow(data), authorName: null });
});

router.patch("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = UpdateClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("clinical_notes")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Note not found" }); return; }
  res.json({ ...mapRow(data), authorName: null });
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("diagnoses").select().order("created_at");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json(mapRows(data ?? []));
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { data, error } = await supabase
    .from("diagnoses")
    .insert(toSnake(parsed.data as Record<string, unknown>))
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(mapRow(data));
});

export default router;
