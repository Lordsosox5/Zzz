import { Router } from "express";
import { db, usersTable } from "../lib/db";
import { eq } from "drizzle-orm";
import {
  ListStaffQueryParams,
  CreateStaffBody,
  GetStaffMemberParams,
  UpdateStaffParams,
  UpdateStaffBody,
} from "@workspace/api-zod";

const router = Router();

const expiryStore = new Map<number, string | null>();

function computeExpiryDate(role: string): string | null {
  if (role === "house_officer") {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  }
  return null;
}

function formatStaff(u: typeof usersTable.$inferSelect) {
  const id = u.id;
  const role = u.role;
  const accountExpiryDate = expiryStore.has(id)
    ? expiryStore.get(id) ?? null
    : role === "house_officer" ? computeExpiryDate("house_officer") : null;
  return {
    id: u.id,
    nameEn: u.nameEn,
    nameAr: u.nameAr ?? null,
    role,
    department: u.department ?? "General",
    unitId: u.unitId ?? null,
    specialization: null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    licenseNumber: null,
    status: u.isActive ? "active" : "inactive",
    accountExpiryDate,
    createdAt: u.createdAt,
  };
}

router.get("/staff", async (req, res): Promise<void> => {
  const params = ListStaffQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(usersTable).$dynamic();
    if (params.data.role) query = query.where(eq(usersTable.role, params.data.role));
    if (params.data.department) query = query.where(eq(usersTable.department, params.data.department));
    res.json((await query).map(formatStaff));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/staff", async (req, res): Promise<void> => {
  const unitId = req.body.unitId ? Number(req.body.unitId) : undefined;
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const username = parsed.data.username?.trim()
      || (parsed.data.nameEn.toLowerCase().replace(/\s+/g, ".") + Math.floor(Math.random() * 1000));
    const password = parsed.data.password?.trim() || "password123";
    const [data] = await db.insert(usersTable).values({
      username,
      password,
      nameEn: parsed.data.nameEn,
      nameAr: parsed.data.nameAr ?? null,
      role: parsed.data.role,
      department: parsed.data.department ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      isActive: true,
      unitId: unitId ?? null,
    }).returning();
    const expiry = computeExpiryDate(parsed.data.role);
    expiryStore.set(data.id, expiry);
    res.status(201).json({ ...formatStaff(data), username, password });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [data] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
    if (!data) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(data));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.nameEn) updates.nameEn = parsed.data.nameEn;
    if (parsed.data.nameAr !== undefined) updates.nameAr = parsed.data.nameAr;
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.department) updates.department = parsed.data.department;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.status) updates.isActive = parsed.data.status === "active";
    if (parsed.data.password) updates.password = parsed.data.password;
    if (parsed.data.unitId !== undefined) updates.unitId = parsed.data.unitId ? Number(parsed.data.unitId) : null;
    const [data] = await db.update(usersTable).set(updates).where(eq(usersTable.id, params.data.id)).returning();
    if (!data) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(data));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
