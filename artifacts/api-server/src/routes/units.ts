import { Router } from "express";
import { supabase, mapRow, mapRows, dbError } from "../lib/supabase";

const router = Router();

interface Unit {
  id: number;
  nameEn: string;
  nameAr: string | null;
  type: string;
  description: string | null;
  floor: string | null;
  capacity: number;
  headDoctorId: number | null;
  headDoctorName: string | null;
  status: string;
  createdAt: string;
}

// In-memory cache — populated from Supabase at startup, refreshed after writes.
// Used by patients.ts for unit name lookups without an extra DB call per request.
export let units: Unit[] = [];

export async function refreshUnitsCache(): Promise<void> {
  const { data, error } = await supabase.from("units").select("*").order("id");
  if (!error && data) units = mapRows<Unit>(data);
}

// Warm the cache on module load
refreshUnitsCache().catch(console.error);

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/units", async (req, res): Promise<void> => {
  const { status } = req.query;
  let query = supabase.from("units").select("*").order("id");
  if (status) query = query.eq("status", status as string);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json(mapRows(data ?? []));
});

router.post("/units", async (req, res): Promise<void> => {
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  if (!nameEn) { res.status(400).json({ error: "nameEn is required" }); return; }
  const { data, error } = await supabase
    .from("units")
    .insert({
      name_en: nameEn,
      name_ar: nameAr ?? null,
      type: type ?? "ward",
      description: description ?? null,
      floor: floor ?? null,
      capacity: Number(capacity ?? 0),
      head_doctor_id: headDoctorId ?? null,
      status: status ?? "active",
    })
    .select()
    .single();
  if (dbError(error, res, 400)) return;
  await refreshUnitsCache();
  res.status(201).json(mapRow<Unit>(data));
});

router.get("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { data, error } = await supabase.from("units").select("*").eq("id", id).maybeSingle();
  if (dbError(error, res)) return;
  if (!data) { res.status(404).json({ error: "Unit not found" }); return; }
  res.json(mapRow<Unit>(data));
});

router.patch("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (nameEn      !== undefined) updates.name_en       = nameEn;
  if (nameAr      !== undefined) updates.name_ar       = nameAr ?? null;
  if (type        !== undefined) updates.type          = type;
  if (description !== undefined) updates.description   = description ?? null;
  if (floor       !== undefined) updates.floor         = floor ?? null;
  if (capacity    !== undefined) updates.capacity      = Number(capacity);
  if (headDoctorId !== undefined) updates.head_doctor_id = headDoctorId ?? null;
  if (status      !== undefined) updates.status        = status;
  const { data, error } = await supabase.from("units").update(updates).eq("id", id).select().single();
  if (dbError(error, res)) return;
  await refreshUnitsCache();
  res.json(mapRow<Unit>(data));
});

export default router;
