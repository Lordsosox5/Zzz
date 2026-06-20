import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// ─── Persistent JSON store ───────────────────────────────────────────────────
// Saved to /tmp/units.json so units survive server restarts in the Replit env.
// For production, migrate this to a real DB table in Supabase.

// Use a workspace-relative path so data survives container restarts/sleep.
// /tmp is wiped on every restart; process.cwd() is artifacts/api-server when running.
const STORE_DIR  = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "units.json");
try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch { }

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

const SEED: Unit[] = [
  { id: 1, nameEn: "General Pediatrics",  nameAr: "طب الأطفال العام",                    type: "ward",       description: null, floor: "2", capacity: 40, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 2, nameEn: "PICU",                nameAr: "وحدة العناية المركزة للأطفال",          type: "icu",        description: null, floor: "3", capacity: 15, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 3, nameEn: "NICU",                nameAr: "وحدة العناية المركزة لحديثي الولادة", type: "nicu",       description: null, floor: "3", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 4, nameEn: "Emergency",           nameAr: "الطوارئ",                             type: "emergency",  description: null, floor: "1", capacity: 25, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 5, nameEn: "Surgical Ward",       nameAr: "جناح الجراحة",                        type: "surgical",   description: null, floor: "4", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
  { id: 6, nameEn: "Outpatient Clinic",   nameAr: "العيادات الخارجية",                   type: "outpatient", description: null, floor: "1", capacity: 0,  headDoctorId: null, headDoctorName: null, status: "active",   createdAt: new Date().toISOString() },
];

function load(): { units: Unit[]; nextId: number } {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch {
    // file corrupt — fall through to seed
  }
  return { units: [...SEED], nextId: SEED.length + 1 };
}

function save(units: Unit[], nextId: number) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ units, nextId }, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to persist units:", e);
  }
}

let { units, nextId } = load();
// Flush to disk on startup so the file always exists in the persistent location
save(units, nextId);

// Export so other routes (e.g. patients) can read unit names
export { units };

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/units", (_req, res): void => {
  const { status } = _req.query;
  let result = [...units];
  if (status) result = result.filter(u => u.status === status);
  res.json(result);
});

router.post("/units", (req, res): void => {
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  if (!nameEn) { res.status(400).json({ error: "nameEn is required" }); return; }
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
  save(units, nextId);
  res.status(201).json(unit);
});

router.get("/units/:id", (req, res): void => {
  const id = parseInt(req.params.id, 10);
  const unit = units.find(u => u.id === id);
  if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }
  res.json(unit);
});

router.patch("/units/:id", (req, res): void => {
  const id = parseInt(req.params.id, 10);
  const idx = units.findIndex(u => u.id === id);
  if (idx === -1) { res.status(404).json({ error: "Unit not found" }); return; }
  const { nameEn, nameAr, type, description, floor, capacity, headDoctorId, status } = req.body;
  const u = units[idx];
  if (nameEn !== undefined)      u.nameEn = nameEn;
  if (nameAr !== undefined)      u.nameAr = nameAr ?? null;
  if (type !== undefined)        u.type = type;
  if (description !== undefined) u.description = description ?? null;
  if (floor !== undefined)       u.floor = floor ?? null;
  if (capacity !== undefined)    u.capacity = Number(capacity);
  if (headDoctorId !== undefined) u.headDoctorId = headDoctorId ?? null;
  if (status !== undefined)      u.status = status;
  save(units, nextId);
  res.json(u);
});

export default router;
