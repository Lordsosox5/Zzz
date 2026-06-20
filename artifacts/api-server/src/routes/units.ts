import { Router } from "express";
import { db, unitsTable } from "../lib/db";
import { eq } from "drizzle-orm";

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
  createdAt: Date | string;
}

const SEED: Unit[] = [
  { id: 1, nameEn: "Al-Farouq, Hanaa & Hanan",   nameAr: "الفاروق و هناء وحنان",  type: "ward", description: null, floor: "2", capacity: 40, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 2, nameEn: "Abdullatif & Mus'ab",         nameAr: "عبداللطيف و مصعب",      type: "ward", description: null, floor: "3", capacity: 15, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 3, nameEn: "Abdulraziq & Asia",           nameAr: "عبدالرازق و اسيآ",      type: "ward", description: null, floor: "3", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 4, nameEn: "Al-Hadi & Hatim",             nameAr: "الهادي و حاتم",          type: "ward", description: null, floor: "1", capacity: 25, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 5, nameEn: "Abdullah & Rawiya",           nameAr: "عبدالله و راوية",        type: "ward", description: null, floor: "4", capacity: 20, headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
  { id: 6, nameEn: "Aisha & Israa",               nameAr: "عائشة و اسراء",          type: "ward", description: null, floor: "1", capacity: 0,  headDoctorId: null, headDoctorName: null, status: "active", createdAt: new Date().toISOString() },
];

export let units: Unit[] = [...SEED];

export async function refreshUnitsCache(): Promise<void> {
  try {
    const data = await db.select().from(unitsTable).orderBy(unitsTable.id);
    if (data && data.length > 0) {
      units = data.map(u => ({ ...u, headDoctorName: null }));
    }
  } catch {
    // Keep seed if table not ready
  }
}

refreshUnitsCache().catch(console.error);

router.get("/units", async (req, res): Promise<void> => {
  try {
    const { status } = req.query;
    const data = await db.select().from(unitsTable).orderBy(unitsTable.id);
    let result = data.map(u => ({ ...u, headDoctorName: null }));
    if (status) result = result.filter(u => u.status === status as string);
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
    const [data] = await db.insert(unitsTable).values({
      nameEn,
      nameAr: nameAr ?? null,
      type: type ?? "ward",
      description: description ?? null,
      floor: floor ?? null,
      capacity: Number(capacity ?? 0),
      headDoctorId: headDoctorId ?? null,
      status: status ?? "active",
    }).returning();
    await refreshUnitsCache();
    res.status(201).json({ ...data, headDoctorName: null });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.get("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const [data] = await db.select().from(unitsTable).where(eq(unitsTable.id, id)).limit(1);
    if (!data) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json({ ...data, headDoctorName: null });
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
  if (nameEn !== undefined) updates.nameEn = nameEn;
  if (nameAr !== undefined) updates.nameAr = nameAr ?? null;
  if (type !== undefined) updates.type = type;
  if (description !== undefined) updates.description = description ?? null;
  if (floor !== undefined) updates.floor = floor ?? null;
  if (capacity !== undefined) updates.capacity = Number(capacity);
  if (headDoctorId !== undefined) updates.headDoctorId = headDoctorId ?? null;
  if (status !== undefined) updates.status = status;
  try {
    const [data] = await db.update(unitsTable).set(updates).where(eq(unitsTable.id, id)).returning();
    if (!data) { res.status(404).json({ error: "Unit not found" }); return; }
    await refreshUnitsCache();
    res.json({ ...data, headDoctorName: null });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
