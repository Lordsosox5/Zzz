import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake, dbError } from "../lib/supabase";
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

async function getCallerUnitId(authHeader: string | undefined): Promise<number | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const [userId] = Buffer.from(token, "base64").toString("utf-8").split(":");
    const { data } = await supabase.from("users").select("unit_id").eq("id", parseInt(userId, 10)).limit(1);
    return (data?.[0]?.unit_id as number | null) ?? null;
  } catch {
    return null;
  }
}

async function unitPatientIds(unitId: number): Promise<number[]> {
  const { data } = await supabase.from("patients").select("id").eq("unit_id", unitId);
  return (data ?? []).map((r: any) => r.id as number);
}

router.get("/clinical-notes", async (req, res): Promise<void> => {
  const params = ListClinicalNotesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const callerUnitId = await getCallerUnitId(req.headers.authorization);

    let allowedPatientIds: number[] | null = null;
    if (callerUnitId !== null) {
      allowedPatientIds = await unitPatientIds(callerUnitId);
      if (allowedPatientIds.length === 0) { res.json([]); return; }
    }

    let q = supabase.from("clinical_notes").select("*");

    if (params.data.patientId) {
      const pid = params.data.patientId;
      if (allowedPatientIds !== null && !allowedPatientIds.includes(pid)) {
        res.json([]);
        return;
      }
      q = q.eq("patient_id", pid);
    } else if (allowedPatientIds !== null) {
      q = q.in("patient_id", allowedPatientIds);
    }

    const { data, error } = await q;
    if (dbError(error, res)) return;
    const notes = mapRows(data ?? []);
    const patientIds = [...new Set(notes.map((n: any) => n.patientId).filter(Boolean))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const { data: pd } = await supabase.from("patients").select("id, name_en").in("id", patientIds);
      for (const p of pd ?? []) patientMap[p.id as number] = p.name_en as string;
    }
    res.json(notes.map((n: any) => ({ ...n, patientName: patientMap[n.patientId] ?? null, authorName: null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/clinical-notes", async (req, res): Promise<void> => {
  const parsed = CreateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const row = toSnake({ ...parsed.data, authorId: 1 } as Record<string, unknown>);
    const { data, error } = await supabase.from("clinical_notes").insert(row).select();
    if (dbError(error, res)) return;
    res.status(201).json({ ...mapRow(data![0]), authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = GetClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("clinical_notes").select("*").eq("id", params.data.id).limit(1);
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Note not found" }); return; }
    const note = mapRow<any>(data[0]);

    const callerUnitId = await getCallerUnitId(req.headers.authorization);
    if (callerUnitId !== null && note.patientId) {
      const { data: pd } = await supabase.from("patients").select("unit_id").eq("id", note.patientId).limit(1);
      const patientUnitId = (pd?.[0]?.unit_id as number | null) ?? null;
      if (patientUnitId !== callerUnitId) { res.status(403).json({ error: "Access denied" }); return; }
    }

    res.json({ ...note, authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/clinical-notes/:id", async (req, res): Promise<void> => {
  const params = UpdateClinicalNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateClinicalNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("clinical_notes").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ ...mapRow(data[0]), authorName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/diagnoses", async (req, res): Promise<void> => {
  const params = ListDiagnosesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let q = supabase.from("diagnoses").select("*");
    if (params.data.patientId) q = q.eq("patient_id", params.data.patientId);
    const { data, error } = await q;
    if (dbError(error, res)) return;
    res.json(mapRows(data ?? []));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/diagnoses", async (req, res): Promise<void> => {
  const parsed = CreateDiagnosisBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("diagnoses").insert(toSnake(parsed.data as Record<string, unknown>)).select();
    if (dbError(error, res)) return;
    res.status(201).json(mapRow(data![0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
