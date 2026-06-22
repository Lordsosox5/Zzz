import { Router } from "express";
import { supabase, mapRow, mapRows } from "../lib/supabase";

const router = Router();

function formatUnit(r: Record<string, unknown>) {
  return {
    id: r.id,
    nameEn: r.nameEn,
    nameAr: r.nameAr ?? null,
    type: r.type ?? "ward",
    description: r.description ?? null,
    floor: r.floor ?? null,
    capacity: r.capacity ?? null,
    headDoctorId: r.headDoctorId ?? null,
    headDoctorName: r.headDoctorName ?? null,
    status: r.status ?? "active",
    createdAt: r.createdAt,
  };
}

router.get("/units", async (req, res): Promise<void> => {
  try {
    let query = supabase.from("units").select("*").order("id");
    if (req.query.status) query = query.eq("status", req.query.status as string);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(mapRows(data ?? []).map(formatUnit));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/units/:id", async (req, res): Promise<void> => {
  try {
    const { data, error } = await supabase.from("units").select("*").eq("id", req.params.id).single();
    if (error) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json(formatUnit(mapRow(data)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/units", async (req, res): Promise<void> => {
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, headDoctorName, status } = req.body;
  if (!nameEn) { res.status(400).json({ error: "nameEn is required" }); return; }
  try {
    const { data, error } = await supabase.from("units").insert({
      name_en: nameEn,
      name_ar: nameAr ?? null,
      type: type ?? "ward",
      description: description ?? null,
      floor: floor ?? null,
      capacity: capacity != null ? Number(capacity) : null,
      head_doctor_id: headDoctorId ?? null,
      head_doctor_name: headDoctorName ?? null,
      status: status ?? "active",
    }).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(formatUnit(mapRow(data)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/units/:id", async (req, res): Promise<void> => {
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, headDoctorName, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (nameEn !== undefined) updates.name_en = nameEn;
  if (nameAr !== undefined) updates.name_ar = nameAr ?? null;
  if (type !== undefined) updates.type = type;
  if (description !== undefined) updates.description = description ?? null;
  if (floor !== undefined) updates.floor = floor ?? null;
  if (capacity !== undefined) updates.capacity = Number(capacity);
  if (headDoctorId !== undefined) updates.head_doctor_id = headDoctorId ?? null;
  if (headDoctorName !== undefined) updates.head_doctor_name = headDoctorName ?? null;
  if (status !== undefined) updates.status = status;
  try {
    const { data, error } = await supabase.from("units").update(updates).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(formatUnit(mapRow(data)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
