import { Router } from "express";
import { supabase, mapRow, mapRows, dbError } from "../lib/supabase";

const router = Router();

export interface Unit {
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

const SEED: Unit[] = [
  { id: 1, nameEn: "Al-Farouq, Hanaa & Hanan", nameAr: "الفاروق و هناء وحنان", type: "ward", description: null, floor: "2", capacity: 40, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 2, nameEn: "Abdullatif & Mus'ab", nameAr: "عبداللطيف و مصعب", type: "ward", description: null, floor: "3", capacity: 15, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 3, nameEn: "Abdulraziq & Asia", nameAr: "عبدالرازق و اسيآ", type: "ward", description: null, floor: "3", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 4, nameEn: "Al-Hadi & Hatim", nameAr: "الهادي و حاتم", type: "ward", description: null, floor: "1", capacity: 25, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 5, nameEn: "Abdullah & Rawiya", nameAr: "عبدالله و راوية", type: "ward", description: null, floor: "4", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 6, nameEn: "Aisha & Israa", nameAr: "عائشة و اسراء", type: "ward", description: null, floor: "1", capacity: 0, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
];

export let units: Unit[] = [...SEED];

export async function refreshUnitsCache(): Promise<void> {
  try {
    const { data } = await supabase.from("units").select("*").order("id", { ascending: true });
    if (data && data.length > 0) {
      units = mapRows<Unit>(data).map(u => ({ ...u, headDoctorName: null }));
    }
  } catch {
    // Keep seed if unavailable
  }
}

refreshUnitsCache().catch(console.error);

router.get("/units", async (req, res): Promise<void> => {
  try {
    const { data, error } = await supabase.from("units").select("*").order("id", { ascending: true });
    if (error) throw error;
    let result = mapRows<Unit>(data ?? []).map(u => ({ ...u, headDoctorName: null }));
    if (req.query.status) result = result.filter(u => u.status === req.query.status as string);
    res.json(result);
  } catch {
    let result = [...units];
    if (req.query.status) result = result.filter(u => u.status === req.query.status as string);
    res.json(result);
  }
});

router.post("/units", async (req, res): Promise<void> => {
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  if (!nameEn) { res.status(400).json({ error: "nameEn is required" }); return; }
  try {
    const row = {
      name_en: nameEn,
      name_ar: nameAr ?? null,
      type: type ?? "ward",
      description: description ?? null,
      floor: floor ?? null,
      capacity: Number(capacity ?? 0),
      head_doctor_id: headDoctorId ?? null,
      status: status ?? "active",
    };
    const { data, error } = await supabase.from("units").insert(row).select();
    if (dbError(error, res)) return;
    await refreshUnitsCache();
    res.status(201).json({ ...mapRow(data![0]), headDoctorName: null });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.get("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const { data, error } = await supabase.from("units").select("*").eq("id", id).limit(1);
    if (error) throw error;
    if (!data?.[0]) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json({ ...mapRow(data[0]), headDoctorName: null });
  } catch {
    const unit = units.find(u => u.id === id);
    if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json(unit);
  }
});

router.patch("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (nameEn !== undefined) updates.name_en = nameEn;
  if (nameAr !== undefined) updates.name_ar = nameAr ?? null;
  if (type !== undefined) updates.type = type;
  if (description !== undefined) updates.description = description ?? null;
  if (floor !== undefined) updates.floor = floor ?? null;
  if (capacity !== undefined) updates.capacity = Number(capacity);
  if (headDoctorId !== undefined) updates.head_doctor_id = headDoctorId ?? null;
  if (status !== undefined) updates.status = status;
  try {
    const { data, error } = await supabase.from("units").update(updates).eq("id", id).select();
    if (dbError(error, res)) return;
    if (!data?.[0]) { res.status(404).json({ error: "Unit not found" }); return; }
    await refreshUnitsCache();
    res.json({ ...mapRow(data[0]), headDoctorName: null });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
