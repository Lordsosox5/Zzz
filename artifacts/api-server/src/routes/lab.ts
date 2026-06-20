import { Router } from "express";
import { db, labOrdersTable, radiologyOrdersTable, patientsTable, usersTable } from "../lib/db";
import { eq, inArray } from "drizzle-orm";
import {
  ListLabOrdersQueryParams,
  CreateLabOrderBody,
  GetLabOrderParams,
  UpdateLabOrderParams,
  UpdateLabOrderBody,
  ListRadiologyOrdersQueryParams,
  CreateRadiologyOrderBody,
  UpdateRadiologyOrderParams,
  UpdateRadiologyOrderBody,
} from "@workspace/api-zod";

const router = Router();

function userIdFromReq(req: import("express").Request): number | null {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    if (!token) return null;
    const [id] = Buffer.from(token, "base64").toString("utf8").split(":");
    const n = parseInt(id, 10);
    return isNaN(n) ? null : n;
  } catch { return null; }
}

async function fetchUserNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const users = await db.select({ id: usersTable.id, nameEn: usersTable.nameEn }).from(usersTable).where(inArray(usersTable.id, ids));
  const map: Record<number, string> = {};
  for (const u of users) map[u.id] = u.nameEn;
  return map;
}

async function fetchPatientNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const patients = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, ids));
  const map: Record<number, string> = {};
  for (const p of patients) map[p.id] = p.nameEn;
  return map;
}

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(labOrdersTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(labOrdersTable.patientId, params.data.patientId));
    if (params.data.status) query = query.where(eq(labOrdersTable.status, params.data.status));
    const orders = await query;
    const patientIds = [...new Set(orders.map(o => o.patientId))];
    const userIds = [...new Set(orders.map(o => o.orderedById))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds), fetchUserNames(userIds)]);
    res.json(orders.map(o => ({ ...o, patientName: patientMap[o.patientId] ?? null, orderedByName: userMap[o.orderedById] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const [data] = await db.insert(labOrdersTable).values({ ...parsed.data, orderedById }).returning();
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...data, patientName: null, orderedByName: userMap[orderedById] ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [data] = await db.select().from(labOrdersTable).where(eq(labOrdersTable.id, params.data.id)).limit(1);
    if (!data) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json({ ...data, patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.collectedAt) updates.collectedAt = new Date(parsed.data.collectedAt);
    if (parsed.data.resultedAt) updates.resultedAt = new Date(parsed.data.resultedAt);
    const [data] = await db.update(labOrdersTable).set(updates).where(eq(labOrdersTable.id, params.data.id)).returning();
    if (!data) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json({ ...data, patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(radiologyOrdersTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(radiologyOrdersTable.patientId, params.data.patientId));
    if (params.data.status) query = query.where(eq(radiologyOrdersTable.status, params.data.status));
    const orders = await query;
    const patientIds = [...new Set(orders.map(o => o.patientId))];
    const userIds = [...new Set(orders.map(o => o.orderedById))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds), fetchUserNames(userIds)]);
    res.json(orders.map(o => ({ ...o, patientName: patientMap[o.patientId] ?? null, orderedByName: userMap[o.orderedById] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const [data] = await db.insert(radiologyOrdersTable).values({ ...parsed.data, orderedById }).returning();
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...data, patientName: null, orderedByName: userMap[orderedById] ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/radiology-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.scheduledAt) updates.scheduledAt = new Date(parsed.data.scheduledAt);
    if (parsed.data.completedAt) updates.completedAt = new Date(parsed.data.completedAt);
    const [data] = await db.update(radiologyOrdersTable).set(updates).where(eq(radiologyOrdersTable.id, params.data.id)).returning();
    if (!data) { res.status(404).json({ error: "Radiology order not found" }); return; }
    res.json({ ...data, patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
