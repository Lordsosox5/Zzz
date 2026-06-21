import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichAppointment(a: Record<string, unknown>) {
  const [patientRes, doctorRes] = await Promise.all([
    supabase.from("patients").select("name_en").eq("id", a.patientId).limit(1),
    supabase.from("users").select("name_en").eq("id", a.doctorId).limit(1),
  ]);
  return { ...a, patientName: patientRes.data?.[0]?.name_en ?? null, doctorName: doctorRes.data?.[0]?.name_en ?? null };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const params = ListAppointmentsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { date, doctorId, patientId, status } = params.data;
    let query = supabase.from("appointments").select("*");
    if (patientId) query = query.eq("patient_id", patientId);
    if (doctorId) query = query.eq("doctor_id", doctorId);
    if (status) query = query.eq("status", status);
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      query = query.gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());
    }
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    const rows = mapRows(data ?? []);
    const enriched = await Promise.all(rows.map(enrichAppointment));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("appointments").insert(toSnake(parsed.data as Record<string, unknown>)).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    const row = mapRow(data);
    res.status(201).json(await enrichAppointment(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/appointments/today", async (req, res): Promise<void> => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const doctorId = req.query.doctorId ? Number(req.query.doctorId) : null;
    let query = supabase.from("appointments").select("*")
      .gte("scheduled_at", start.toISOString())
      .lte("scheduled_at", end.toISOString());
    if (doctorId) query = query.eq("doctor_id", doctorId);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    const rows = mapRows(data ?? []);
    const enriched = await Promise.all(rows.map(enrichAppointment));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("appointments").select("*").eq("id", params.data.id).limit(1);
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data?.[0]) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(await enrichAppointment(mapRow(data[0])));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { data, error } = await supabase.from("appointments").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(await enrichAppointment(mapRow(data)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
