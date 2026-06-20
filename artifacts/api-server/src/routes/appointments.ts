import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake, dbError } from "../lib/supabase";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichAppointment(a: Record<string, unknown>) {
  const [{ data: pd }, { data: dd }] = await Promise.all([
    supabase.from("patients").select("name_en").eq("id", a.patientId).limit(1),
    supabase.from("users").select("name_en").eq("id", a.doctorId).limit(1),
  ]);
  return { ...a, patientName: (pd?.[0]?.name_en as string) ?? null, doctorName: (dd?.[0]?.name_en as string) ?? null };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const params = ListAppointmentsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { date, doctorId, patientId, status } = params.data;
    let q = supabase.from("appointments").select("*");
    if (patientId) q = q.eq("patient_id", patientId);
    if (doctorId) q = q.eq("doctor_id", doctorId);
    if (status) q = q.eq("status", status);
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      q = q.gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());
    }
    const { data, error } = await q;
    if (dbError(error, res)) return;
    const mapped = mapRows(data ?? []);
    const enriched = await Promise.all(mapped.map(enrichAppointment));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const row = toSnake({ ...parsed.data } as Record<string, unknown>);
    const { data, error } = await supabase.from("appointments").insert(row).select();
    if (dbError(error, res)) return;
    const mapped = mapRow(data![0]);
    res.status(201).json(await enrichAppointment(mapped));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/appointments/today", async (req, res): Promise<void> => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const doctorId = req.query.doctorId ? Number(req.query.doctorId) : null;
    let q = supabase.from("appointments").select("*")
      .gte("scheduled_at", start.toISOString())
      .lte("scheduled_at", end.toISOString());
    if (doctorId) q = q.eq("doctor_id", doctorId);
    const { data, error } = await q;
    if (dbError(error, res)) return;
    const mapped = mapRows(data ?? []);
    const enriched = await Promise.all(mapped.map(enrichAppointment));
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
    if (dbError(error, res)) return;
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
    const { data, error } = await supabase.from("appointments").update(toSnake(parsed.data as Record<string, unknown>)).eq("id", params.data.id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(await enrichAppointment(mapRow(data[0])));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
