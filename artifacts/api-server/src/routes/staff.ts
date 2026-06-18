import { Router } from "express";
import { db } from "../lib/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListStaffQueryParams,
  CreateStaffBody,
  GetStaffMemberParams,
  UpdateStaffParams,
  UpdateStaffBody,
} from "@workspace/api-zod";

const router = Router();

function formatStaff(u: typeof usersTable.$inferSelect) {
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
    const rows = await query;
    res.json(rows.map(formatStaff));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const username = parsed.data.nameEn.toLowerCase().replace(/\s+/g, ".") + Math.floor(Math.random() * 1000);
  try {
    const [row] = await db.insert(usersTable).values({
      username,
      password: "password123",
      nameEn: parsed.data.nameEn,
      nameAr: parsed.data.nameAr ?? null,
      role: parsed.data.role,
      department: parsed.data.department ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
    }).returning();
    res.status(201).json(formatStaff(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
    if (!row) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: Record<string, unknown> = {};
  if (parsed.data.nameEn) updates.nameEn = parsed.data.nameEn;
  if (parsed.data.nameAr) updates.nameAr = parsed.data.nameAr;
  if (parsed.data.department) updates.department = parsed.data.department;
  if (parsed.data.phone) updates.phone = parsed.data.phone;
  if (parsed.data.status) updates.isActive = parsed.data.status === "active";
  try {
    const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

export default router;
