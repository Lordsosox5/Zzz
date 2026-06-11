import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  ListStaffQueryParams,
  CreateStaffBody,
  GetStaffMemberParams,
  UpdateStaffParams,
  UpdateStaffBody,
} from "@workspace/api-zod";

const router = Router();

function mapStaff(u: typeof usersTable.$inferSelect) {
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
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/staff", async (req, res): Promise<void> => {
  const params = ListStaffQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const conditions = [];
  if (params.data.role) conditions.push(eq(usersTable.role, params.data.role));
  if (params.data.department) conditions.push(eq(usersTable.department, params.data.department));
  const results = conditions.length
    ? await db.select().from(usersTable).where(and(...conditions))
    : await db.select().from(usersTable);
  res.json(results.map(mapStaff));
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const username = parsed.data.nameEn.toLowerCase().replace(/\s+/g, ".") + Math.floor(Math.random() * 1000);
  const [user] = await db.insert(usersTable).values({
    username,
    password: "password123",
    nameEn: parsed.data.nameEn,
    nameAr: parsed.data.nameAr ?? null,
    role: parsed.data.role,
    department: parsed.data.department ?? null,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
  }).returning();
  res.status(201).json(mapStaff(user));
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) { res.status(404).json({ error: "Staff member not found" }); return; }
  res.json(mapStaff(user));
});

router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: params.error.message }); return; }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.nameEn) updateData.nameEn = parsed.data.nameEn;
  if (parsed.data.nameAr) updateData.nameAr = parsed.data.nameAr;
  if (parsed.data.department) updateData.department = parsed.data.department;
  if (parsed.data.phone) updateData.phone = parsed.data.phone;
  if (parsed.data.status) updateData.isActive = parsed.data.status === "active";
  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "Staff member not found" }); return; }
  res.json(mapStaff(user));
});

export default router;
