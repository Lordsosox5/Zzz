import { Router } from "express";

const router = Router();

// ─── In-memory store (seeded with defaults) ────────────────────────────────
// NOTE: For production, migrate this to a real database table in Supabase.
//       Schema: CREATE TABLE units (id SERIAL PRIMARY KEY, name_en TEXT NOT NULL,
//       name_ar TEXT, type TEXT DEFAULT 'ward', description TEXT, floor TEXT,
//       capacity INTEGER DEFAULT 0, head_doctor_id INTEGER, status TEXT DEFAULT 'active',
//       created_at TIMESTAMPTZ DEFAULT NOW());

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

let nextId = 7;
const units: Unit[] = [
  { id: 1, nameEn: "General Pediatrics",  nameAr: "طب الأطفال العام",                    type: "ward",       description: null, floor: "2", capacity: 40, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 2, nameEn: "PICU",                nameAr: "وحدة العناية المركزة للأطفال",          type: "icu",        description: null, floor: "3", capacity: 15, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 3, nameEn: "NICU",                nameAr: "وحدة العناية المركزة لحديثي الولادة", type: "nicu",       description: null, floor: "3", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 4, nameEn: "Emergency",           nameAr: "الطوارئ",                             type: "emergency",  description: null, floor: "1", capacity: 25, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 5, nameEn: "Surgical Ward",       nameAr: "جناح الجراحة",                        type: "surgical",   description: null, floor: "4", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 6, nameEn: "Outpatient Clinic",   nameAr: "العيادات الخارجية",                   type: "outpatient", description: null, floor: "1", capacity: 0,  headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
];

// ─── Routes ────────────────────────────────────────────────────────────────

router.get("/units", async (req, res): Promise<void> => {
  const { status } = req.query;
  let result = [...units];
  if (status) result = result.filter(u => u.status === status);
  res.json(result);
});

router.post("/units", async (req, res): Promise<void> => {
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  if (!nameEn) {
    res.status(400).json({ error: "nameEn is required" });
    return;
  }
  const unit: Unit = {
    id: nextId++,
    nameEn,
    nameAr: nameAr ?? null,
    type: type ?? "ward",
    description: description ?? null,
    floor: floor ?? null,
    capacity: Number(capacity ?? 0),
    headDoctorId: headDoctorId ?? null,
    headDoctorName: null,
    status: status ?? "active",
    createdAt: new Date().toISOString(),
  };
  units.push(unit);
  res.status(201).json(unit);
});

router.get("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const unit = units.find(u => u.id === id);
  if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }
  res.json(unit);
});

router.patch("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const idx = units.findIndex(u => u.id === id);
  if (idx === -1) { res.status(404).json({ error: "Unit not found" }); return; }
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  const u = units[idx];
  if (nameEn !== undefined) u.nameEn = nameEn;
  if (nameAr !== undefined) u.nameAr = nameAr ?? null;
  if (type !== undefined) u.type = type;
  if (description !== undefined) u.description = description ?? null;
  if (floor !== undefined) u.floor = floor ?? null;
  if (capacity !== undefined) u.capacity = Number(capacity);
  if (headDoctorId !== undefined) u.headDoctorId = headDoctorId ?? null;
  if (status !== undefined) u.status = status;
  res.json(u);
});

export default router;
