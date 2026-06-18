import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "../lib/db";
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
    const conditions = [];
    if (params.data.role) conditions.push(eq(usersTable.role, params.data.role));
    if (params.data.department) conditions.push(eq(usersTable.department, params.data.department));
    const query = db.select().from(usersTable);
    const data = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
    res.json(data.map(formatStaff));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const username = parsed.data.nameEn.toLowerCase().replace(/\s+/g, ".") + Math.floor(Math.random() * 1000);
    const [user] = await db
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
    res.status(201).json(formatStaff(user));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
    if (!user) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(user));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
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
    if (parsed.data.nameAr) updates.nameAr = parsed.data.nameAr;
    if (parsed.data.department) updates.department = parsed.data.department;
    if (parsed.data.phone) updates.phone = parsed.data.phone;
    if (parsed.data.status) updates.isActive = parsed.data.status === "active";
    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, params.data.id))
      .returning();
    if (!user) { res.status(404).json({ error: "Staff member not found" }); return; }
    res.json(formatStaff(user));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
