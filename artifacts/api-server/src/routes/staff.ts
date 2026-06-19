import { Router } from "express";
import { db, usersTable } from "../lib/db";
import { eq, and } from "drizzle-orm";
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

function formatStaff(u: Record<string, unknown>) {
  const id = Number(u.id);
  const accountExpiryDate = expiryStore.has(id)
    ? expiryStore.get(id) ?? null
    : u.role === "house_officer" ? computeExpiryDate("house_officer") : null;

  return {
    id: u.id,
    nameEn: u.nameEn,
    nameAr: u.nameAr ?? null,
    role: u.role,
    department: u.department ?? "General",
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
    let query = db.select().from(usersTable);
    if (params.data.role) {
      query = query.where(eq(usersTable.role, params.data.role)) as typeof query;
    }
    const data = await query;
    res.json(data.map((u) => formatStaff(u as unknown as Record<string, unknown>)));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const username = parsed.data.nameEn.toLowerCase().replace(/\s+/g, ".") + Math.floor(Math.random() * 1000);
    const rows = await db
      .insert(usersTable)
      .values({
        username,
        password: "password123",
        nameEn: parsed.data.nameEn,
        nameAr: parsed.data.nameAr ?? null,
        role: parsed.data.role,
        department: parsed.data.department ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
      })
      .returning();
    const id = Number(rows[0].id);
    const expiry = computeExpiryDate(parsed.data.role);
    expiryStore.set(id, expiry);
    res.status(201).json(formatStaff(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.nameEn) updates.nameEn = parsed.data.nameEn;
    if (parsed.data.nameAr) updates.nameAr = parsed.data.nameAr;
    if (parsed.data.department) updates.department = parsed.data.department;
    if (parsed.data.phone) updates.phone = parsed.data.phone;
    if (parsed.data.status) updates.isActive = parsed.data.status === "active";
    const rows = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
