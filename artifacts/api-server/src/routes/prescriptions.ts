import { Router } from "express";
import { db, prescriptionsTable } from "../lib/db";
import { eq, asc } from "drizzle-orm";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";

const router = Router();

function formatRx(row: Record<string, unknown>) {
  return { ...row, patientName: null, prescriberName: null };
}

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    let query = db.select().from(prescriptionsTable).orderBy(asc(prescriptionsTable.createdAt));
    if (params.data.patientId) {
      query = query.where(eq(prescriptionsTable.patientId, params.data.patientId)) as typeof query;
    }
    const data = await query;
    res.json(data.map((r) => formatRx(r as unknown as Record<string, unknown>)));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const rows = await db
      .insert(prescriptionsTable)
      .values({ ...parsed.data, prescriberId: 1 })
      .returning();
    res.status(201).json(formatRx(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const rows = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json(formatRx(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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
    const rows = await db
      .update(prescriptionsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(prescriptionsTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json(formatRx(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
