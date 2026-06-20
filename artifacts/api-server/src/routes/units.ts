import { Router } from "express";
import { supabase, mapRow, mapRows } from "../lib/supabase";

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

// Default units with the correct names.
// Used as a fallback when the Supabase table doesn't exist yet.
const SEED: Unit[] = [
  { id: 1, nameEn: "Al-Farouq, Hanaa & Hanan",   nameAr: "الفاروق و هناء وحنان",  type: "ward",       description: null, floor: "2", capacity: 40, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 2, nameEn: "Abdullatif & Mus'ab",         nameAr: "عبداللطيف و مصعب",      type: "ward",       description: null, floor: "3", capacity: 15, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 3, nameEn: "Abdulraziq & Asia",           nameAr: "عبدالرازق و اسيآ",      type: "ward",       description: null, floor: "3", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 4, nameEn: "Al-Hadi & Hatim",             nameAr: "الهادي و حاتم",          type: "ward",       description: null, floor: "1", capacity: 25, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 5, nameEn: "Abdullah & Rawiya",           nameAr: "عبدالله و راوية",        type: "ward",       description: null, floor: "4", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 6, nameEn: "Aisha & Israa",               nameAr: "عائشة و اسراء",          type: "ward",       description: null, floor: "1", capacity: 0,  headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
];

// In-memory cache — populated from Supabase when the table exists,
// otherwise falls back to SEED so the app always works.
export let units: Unit[] = [...SEED];

export async function refreshUnitsCache(): Promise<void> {
  const { data, error } = await supabase.from("units").select("*").order("id");
  if (!error && data && data.length > 0) {
    units = mapRows<Unit>(data);
  }
  // If error (table not created yet) we silently keep the SEED in memory
}

refreshUnitsCache().catch(console.error);

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/units", async (req, res): Promise<void> => {
  const { status } = req.query;
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .order("id");

  if (error) {
    // Table not yet created — return in-memory seed
    let result = [...units];
    if (status) result = result.filter(u => u.status === status);
    res.json(result);
    return;
  }

  let result = mapRows<Unit>(data ?? []);
  if (status) result = result.filter(u => u.status === status as string);
  res.json(result);
});

router.post("/units", async (req, res): Promise<void> => {
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  if (!nameEn) { res.status(400).json({ error: "nameEn is required" }); return; }

  const { data, error } = await supabase
    .from("units")
    .insert({
      name_en:       nameEn,
      name_ar:       nameAr       ?? null,
      type:          type         ?? "ward",
      description:   description  ?? null,
      floor:         floor        ?? null,
      capacity:      Number(capacity ?? 0),
      head_doctor_id: headDoctorId ?? null,
      status:        status       ?? "active",
    })
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  const unit = mapRow<Unit>(data);
  await refreshUnitsCache();
  res.status(201).json(unit);
});

router.get("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { data, error } = await supabase
    .from("units").select("*").eq("id", id).maybeSingle();

  if (error) {
    const unit = units.find(u => u.id === id);
    if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json(unit);
    return;
  }
  if (!data) { res.status(404).json({ error: "Unit not found" }); return; }
  res.json(mapRow<Unit>(data));
});

router.patch("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (nameEn       !== undefined) updates.name_en        = nameEn;
  if (nameAr       !== undefined) updates.name_ar        = nameAr ?? null;
  if (type         !== undefined) updates.type           = type;
  if (description  !== undefined) updates.description    = description ?? null;
  if (floor        !== undefined) updates.floor          = floor ?? null;
  if (capacity     !== undefined) updates.capacity       = Number(capacity);
  if (headDoctorId !== undefined) updates.head_doctor_id = headDoctorId ?? null;
  if (status       !== undefined) updates.status         = status;

  const { data, error } = await supabase
    .from("units").update(updates).eq("id", id).select().single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  await refreshUnitsCache();
  res.json(mapRow<Unit>(data));
});

export default router;
