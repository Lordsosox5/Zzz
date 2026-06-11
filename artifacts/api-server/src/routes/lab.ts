import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, labOrdersTable, radiologyOrdersTable, patientsTable, usersTable } from "@workspace/db";
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

function mapLabOrder(l: typeof labOrdersTable.$inferSelect) {
  return {
    ...l,
    patientName: null,
    orderedByName: null,
    isCritical: l.isCritical,
    collectedAt: l.collectedAt?.toISOString() ?? null,
    resultedAt: l.resultedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

function mapRadOrder(r: typeof radiologyOrdersTable.$inferSelect) {
  return {
    ...r,
    patientName: null,
    orderedByName: null,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const conditions = [];
  if (params.data.patientId) conditions.push(eq(labOrdersTable.patientId, params.data.patientId));
  if (params.data.status) conditions.push(eq(labOrdersTable.status, params.data.status));
  const results = conditions.length
    ? await db.select().from(labOrdersTable).where(and(...conditions)).orderBy(labOrdersTable.createdAt)
    : await db.select().from(labOrdersTable).orderBy(labOrdersTable.createdAt);
  res.json(results.map(mapLabOrder));
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [order] = await db.insert(labOrdersTable).values({ ...parsed.data, orderedById: 1 }).returning();
  res.status(201).json(mapLabOrder(order));
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [order] = await db.select().from(labOrdersTable).where(eq(labOrdersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Lab order not found" }); return; }
  res.json(mapLabOrder(order));
});

router.patch("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.collectedAt) updateData.collectedAt = new Date(parsed.data.collectedAt);
  if (parsed.data.resultedAt) updateData.resultedAt = new Date(parsed.data.resultedAt);
  const [order] = await db.update(labOrdersTable).set(updateData).where(eq(labOrdersTable.id, params.data.id)).returning();
  if (!order) { res.status(404).json({ error: "Lab order not found" }); return; }
  res.json(mapLabOrder(order));
});

// RADIOLOGY
router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const conditions = [];
  if (params.data.patientId) conditions.push(eq(radiologyOrdersTable.patientId, params.data.patientId));
  if (params.data.status) conditions.push(eq(radiologyOrdersTable.status, params.data.status));
  const results = conditions.length
    ? await db.select().from(radiologyOrdersTable).where(and(...conditions)).orderBy(radiologyOrdersTable.createdAt)
    : await db.select().from(radiologyOrdersTable).orderBy(radiologyOrdersTable.createdAt);
  res.json(results.map(mapRadOrder));
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const insertData: Record<string, unknown> = { ...parsed.data, orderedById: 1 };
  if (parsed.data.scheduledAt) insertData.scheduledAt = new Date(parsed.data.scheduledAt);
  const [order] = await db.insert(radiologyOrdersTable).values(insertData as never).returning();
  res.status(201).json(mapRadOrder(order));
});

router.patch("/radiology-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.scheduledAt) updateData.scheduledAt = new Date(parsed.data.scheduledAt);
  if (parsed.data.completedAt) updateData.completedAt = new Date(parsed.data.completedAt);
  const [order] = await db.update(radiologyOrdersTable).set(updateData as never).where(eq(radiologyOrdersTable.id, params.data.id)).returning();
  if (!order) { res.status(404).json({ error: "Radiology order not found" }); return; }
  res.json(mapRadOrder(order));
});

export default router;
