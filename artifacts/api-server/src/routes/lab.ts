import { Router } from "express";
import { db, labOrdersTable, radiologyOrdersTable, patientsTable } from "../lib/db";
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

function formatLabOrder(row: Record<string, unknown>) {
  return { ...row, patientName: null, orderedByName: null };
}

function formatRadOrder(row: Record<string, unknown>) {
  return { ...row, patientName: null, orderedByName: null };
}

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(labOrdersTable).orderBy(asc(labOrdersTable.createdAt));
    if (params.data.patientId) {
      query = query.where(eq(labOrdersTable.patientId, params.data.patientId)) as typeof query;
    }
    const orders = await query;

    const patientIds = [...new Set(orders.map((o) => o.patientId).filter(Boolean))] as number[];
    let patientMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const patients = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, patientIds));
      for (const p of patients) patientMap[p.id] = p.nameEn;
    }

    res.json(orders.map((row) => ({
      ...row,
      patientName: patientMap[row.patientId] ?? null,
      orderedByName: null,
    })));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db
      .insert(labOrdersTable)
      .values({ ...parsed.data, orderedById: 1 })
      .returning();
    res.status(201).json(formatLabOrder(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(labOrdersTable).where(eq(labOrdersTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json(formatLabOrder(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db
      .update(labOrdersTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(labOrdersTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json(formatLabOrder(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(radiologyOrdersTable).orderBy(asc(radiologyOrdersTable.createdAt));
    if (params.data.patientId) {
      query = query.where(eq(radiologyOrdersTable.patientId, params.data.patientId)) as typeof query;
    }
    const data = await query;
    res.json(data.map((r) => formatRadOrder(r as unknown as Record<string, unknown>)));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db
      .insert(radiologyOrdersTable)
      .values({ ...parsed.data, orderedById: 1 })
      .returning();
    res.status(201).json(formatRadOrder(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/radiology-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db
      .update(radiologyOrdersTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(radiologyOrdersTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Radiology order not found" }); return; }
    res.json(formatRadOrder(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
