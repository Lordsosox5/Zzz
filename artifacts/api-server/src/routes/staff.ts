import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
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
  const role = u.role as string;
  const accountExpiryDate = expiryStore.has(id)
    ? expiryStore.get(id) ?? null
    : role === "house_officer" ? computeExpiryDate("house_officer") : null;

  return {
    id: u.id,
    nameEn: u.name_en,
    nameAr: u.name_ar ?? null,
    role,
    department: u.department ?? "General",
    unitId: u.unit_id ?? null,
    specialization: null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    licenseNumber: null,
    status: u.is_active ? "active" : "inactive",
    accountExpiryDate,
    createdAt: u.created_at,
  };
}

router.get("/staff", async (req, res): Promise<void> => {
  const params = ListStaffQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("users").select();
  if (params.data.role) query = query.eq("role", params.data.role);
  if (params.data.department) query = query.eq("department", params.data.department);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json((data ?? []).map(formatStaff));
});

router.post("/staff", async (req, res): Promise<void> => {
  const unitId = req.body.unitId ? Number(req.body.unitId) : undefined;

  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const username = parsed.data.username?.trim()
    || (parsed.data.nameEn.toLowerCase().replace(/\s+/g, ".") + Math.floor(Math.random() * 1000));
  const password = parsed.data.password?.trim() || "password123";
  const { data, error } = await supabase
    .from("users")
    .insert({
      username,
      password,
      name_en: parsed.data.nameEn,
      name_ar: parsed.data.nameAr ?? null,
      role: parsed.data.role,
      department: parsed.data.department ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      is_active: true,
      unit_id: unitId ?? null,
    })
    .select()
    .single();
  if (dbError(error, res)) return;

  const id = Number(data.id);
  const expiry = computeExpiryDate(parsed.data.role);
  expiryStore.set(id, expiry);

  res.status(201).json({ ...formatStaff(data), username, password });
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", params.data.id)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Staff member not found" }); return; }
  res.json(formatStaff(data));
});

router.patch("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const unitId = req.body.unitId !== undefined ? (req.body.unitId ? Number(req.body.unitId) : null) : undefined;

  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: Record<string, unknown> = {};
  if (parsed.data.nameEn) updates.name_en = parsed.data.nameEn;
  if (parsed.data.nameAr !== undefined) updates.name_ar = parsed.data.nameAr;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.department) updates.department = parsed.data.department;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.status) updates.is_active = parsed.data.status === "active";
  if (parsed.data.password) updates.password = parsed.data.password;
  if (unitId !== undefined) updates.unit_id = unitId;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Staff member not found" }); return; }

  res.json(formatStaff(data));
});

export default router;
