import { Router } from "express";
import { supabase, mapRow, mapRows } from "../lib/supabase";

const router = Router();

router.get("/discharge-summaries", async (req, res): Promise<void> => {
  try {
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string, 10) : null;
    let query = supabase.from("discharge_summaries").select("*").order("created_at", { ascending: false });
    if (patientId) query = query.eq("patient_id", patientId);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(mapRows(data ?? []));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/discharge-summaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const { data, error } = await supabase.from("discharge_summaries").select("*").eq("id", id).limit(1);
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data?.[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapRow(data[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/discharge-summaries", async (req, res): Promise<void> => {
  const {
    patientId, createdBy, createdByName, admissionDate, dischargeDate,
    primaryDiagnosis, secondaryDiagnoses, hospitalCourse, conditionAtDischarge,
    dischargeMedications, followUpInstructions, dietInstructions, activityRestrictions,
  } = req.body;
  if (!patientId || !primaryDiagnosis || !dischargeDate || !hospitalCourse) {
    res.status(400).json({ error: "patientId, primaryDiagnosis, dischargeDate, hospitalCourse are required" });
    return;
  }
  try {
    const insertData = {
      patient_id: Number(patientId),
      created_by: createdBy ?? null,
      created_by_name: createdByName ?? null,
      admission_date: admissionDate ?? null,
      discharge_date: dischargeDate,
      primary_diagnosis: primaryDiagnosis,
      secondary_diagnoses: secondaryDiagnoses ?? null,
      hospital_course: hospitalCourse,
      condition_at_discharge: conditionAtDischarge ?? "good",
      discharge_medications: dischargeMedications ?? null,
      follow_up_instructions: followUpInstructions ?? null,
      diet_instructions: dietInstructions ?? null,
      activity_restrictions: activityRestrictions ?? null,
    };
    const { data, error } = await supabase.from("discharge_summaries").insert(insertData).select().single();
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.status(201).json(mapRow(data));
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
