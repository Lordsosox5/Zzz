import { Router } from "express";
import { db } from "../lib/db";
import { prescriptionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";

const router = Router();

function formatRx(row: typeof prescriptionsTable.$inferSelect) {
  return { ...row, patientName: null, prescriberName: null };
}

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    let query = db.select().from(prescriptionsTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(prescriptionsTable.patientId, params.data.patientId));
    if (params.data.status) query = query.where(eq(prescriptionsTable.status, params.data.status));
    const rows = await query.orderBy(asc(prescriptionsTable.createdAt));
    res.json(rows.map(formatRx));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db.insert(prescriptionsTable).values({ ...parsed.data, prescriberId: 1 }).returning();
    res.status(201).json(formatRx(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [row] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, params.data.id)).limit(1);
    if (!row) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json(formatRx(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.patch("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = UpdatePrescriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db.update(prescriptionsTable).set(parsed.data).where(eq(prescriptionsTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json(formatRx(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

export default router;
