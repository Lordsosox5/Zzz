import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichAppointment(a: Record<string, unknown>) {
  const [{ data: patient }, { data: doctor }] = await Promise.all([
    supabase.from("patients").select("name_en").eq("id", a.patient_id).maybeSingle(),
    supabase.from("users").select("name_en").eq("id", a.doctor_id).maybeSingle(),
  ]);
  const mapped = mapRow(a);
  return {
    ...mapped,
    patientName: patient?.name_en ?? null,
    doctorName: doctor?.name_en ?? null,
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const params = ListAppointmentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { date, doctorId, patientId, status } = params.data;
  let query = supabase.from("appointments").select().order("scheduled_at");
  if (patientId) query = query.eq("patient_id", patientId);
  if (doctorId) query = query.eq("doctor_id", doctorId);
  if (status) query = query.eq("status", status);
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query = query.gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());
  }
  const { data, error } = await query;
  if (dbError(error, res)) return;
  const enriched = await Promise.all((data ?? []).map(enrichAppointment));
  res.json(enriched);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("appointments")
    .insert(toSnake(parsed.data as Record<string, unknown>))
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(await enrichAppointment(data));
});

router.get("/appointments/today", async (_req, res): Promise<void> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from("appointments")
    .select()
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at");
  if (dbError(error, res)) return;
  const enriched = await Promise.all((data ?? []).map(enrichAppointment));
  res.json(enriched);
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("appointments")
    .select()
    .eq("id", params.data.id)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(await enrichAppointment(data));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data, error } = await supabase
    .from("appointments")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(await enrichAppointment(data));
});

export default router;
