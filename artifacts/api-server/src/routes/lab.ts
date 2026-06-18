import { Router } from "express";
import { db, labOrdersTable, radiologyOrdersTable, patientsTable } from "@workspace/db";
import { eq, inArray, asc } from "drizzle-orm";
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

function formatLabOrder(row: typeof labOrdersTable.$inferSelect) {
  return { ...row, patientName: null, orderedByName: null };
}

function formatRadOrder(row: typeof radiologyOrdersTable.$inferSelect) {
  return { ...row, patientName: null, orderedByName: null };
}

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(labOrdersTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(labOrdersTable.patientId, params.data.patientId));
    if (params.data.status) query = query.where(eq(labOrdersTable.status, params.data.status));
    const orders = await query.orderBy(asc(labOrdersTable.createdAt));

    const patientIds = [...new Set(orders.map((o) => o.patientId))];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const patients = await db
        .select({ id: patientsTable.id, nameEn: patientsTable.nameEn })
        .from(patientsTable)
        .where(inArray(patientsTable.id, patientIds));
      for (const p of patients) patientMap[p.id] = p.nameEn;
    }

    res.json(orders.map((row) => ({ ...row, patientName: patientMap[row.patientId] ?? null, orderedByName: null })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [order] = await db.insert(labOrdersTable).values({ ...parsed.data as any, orderedById: 1 }).returning();
    res.status(201).json(formatLabOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [order] = await db.select().from(labOrdersTable).where(eq(labOrdersTable.id, params.data.id)).limit(1);
    if (!order) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json(formatLabOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [order] = await db.update(labOrdersTable).set(parsed.data as any).where(eq(labOrdersTable.id, params.data.id)).returning();
    if (!order) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json(formatLabOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(radiologyOrdersTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(radiologyOrdersTable.patientId, params.data.patientId));
    if (params.data.status) query = query.where(eq(radiologyOrdersTable.status, params.data.status));
    const data = await query.orderBy(asc(radiologyOrdersTable.createdAt));
    res.json(data.map(formatRadOrder));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [order] = await db.insert(radiologyOrdersTable).values({ ...parsed.data as any, orderedById: 1 }).returning();
    res.status(201).json(formatRadOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/radiology-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [order] = await db.update(radiologyOrdersTable).set(parsed.data as any).where(eq(radiologyOrdersTable.id, params.data.id)).returning();
    if (!order) { res.status(404).json({ error: "Radiology order not found" }); return; }
    res.json(formatRadOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
