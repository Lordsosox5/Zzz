import { Router } from "express";
import { supabase, mapRow, mapRows, dbError } from "../lib/supabase";

const router = Router();

router.get("/discharge-summaries", async (req, res): Promise<void> => {
  const patientId = req.query.patientId ? parseInt(req.query.patientId as string, 10) : null;
  let query = supabase
    .from("discharge_summaries")
    .select("*")
    .order("created_at", { ascending: false });
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json(mapRows(data ?? []));
});

router.get("/discharge-summaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { data, error } = await supabase
    .from("discharge_summaries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (dbError(error, res)) return;
  if (!data) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRow(data));
});

router.post("/discharge-summaries", async (req, res): Promise<void> => {
  const {
    patientId, createdBy, createdByName,
    admissionDate, dischargeDate, primaryDiagnosis, secondaryDiagnoses,
    hospitalCourse, conditionAtDischarge, dischargeMedications,
    followUpInstructions, dietInstructions, activityRestrictions,
  } = req.body;

  if (!patientId || !primaryDiagnosis || !dischargeDate || !hospitalCourse) {
    res.status(400).json({ error: "patientId, primaryDiagnosis, dischargeDate, hospitalCourse are required" });
    return;
  }

  const { data, error } = await supabase
    .from("discharge_summaries")
    .insert({
      patient_id:           Number(patientId),
      created_by:           createdBy         ?? null,
      created_by_name:      createdByName      ?? null,
      admission_date:       admissionDate      ?? null,
      discharge_date:       dischargeDate,
      primary_diagnosis:    primaryDiagnosis,
      secondary_diagnoses:  secondaryDiagnoses ?? null,
      hospital_course:      hospitalCourse,
      condition_at_discharge: conditionAtDischarge ?? "good",
      discharge_medications:  dischargeMedications  ?? null,
      follow_up_instructions: followUpInstructions  ?? null,
      diet_instructions:      dietInstructions       ?? null,
      activity_restrictions:  activityRestrictions   ?? null,
    })
    .select()
    .single();

  if (dbError(error, res, 400)) return;
  res.status(201).json(mapRow(data));
});

export default router;
