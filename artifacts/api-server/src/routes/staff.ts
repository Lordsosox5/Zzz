import { Router } from "express";
import { db, usersTable } from "../lib/db";
import {
  ListStaffQueryParams,
  CreateStaffBody,
  GetStaffMemberParams,
  UpdateStaffParams,
  UpdateStaffBody,
} from "@workspace/api-zod";
import { eq, and, SQL } from "drizzle-orm";
import type { User } from "@workspace/db";

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

function formatStaff(u: User) {
  const accountExpiryDate = expiryStore.has(u.id)
    ? expiryStore.get(u.id) ?? null
    : u.role === "house_officer" ? computeExpiryDate("house_officer") : null;
  return {
    id: u.id,
    nameEn: u.nameEn,
    nameAr: u.nameAr ?? null,
    role: u.role,
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
    const conditions: SQL[] = [];
    if (params.data.role) conditions.push(eq(usersTable.role, params.data.role));
    if (params.data.department) conditions.push(eq(usersTable.department, params.data.department));
    const rows = conditions.length > 0
      ? await db.select().from(usersTable).where(and(...conditions))
      : await db.select().from(usersTable);
    res.json(rows.map(formatStaff));
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
    const rows = await db.insert(usersTable).values({
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
    const user = rows[0];
    const expiry = computeExpiryDate(parsed.data.role);
    expiryStore.set(user.id, expiry);
    res.status(201).json({ ...formatStaff(user), username, password });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(rows[0]));
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
    const rows = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(rows[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
