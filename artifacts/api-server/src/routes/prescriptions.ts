import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, prescriptionsTable } from "../lib/db";
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
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const conditions = [];
    if (params.data.patientId) conditions.push(eq(prescriptionsTable.patientId, params.data.patientId));
    if (params.data.status) conditions.push(eq(prescriptionsTable.status, params.data.status));
    const query = db.select().from(prescriptionsTable).orderBy(asc(prescriptionsTable.createdAt));
    const data = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
    res.json(data.map(formatRx));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [rx] = await db
      .insert(prescriptionsTable)
      .values({ ...(parsed.data as any), prescriberId: 1 })
      .returning();
    res.status(201).json(formatRx(rx));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [rx] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, params.data.id)).limit(1);
    if (!rx) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json(formatRx(rx));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.patch("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = UpdatePrescriptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [rx] = await db
      .update(prescriptionsTable)
      .set(parsed.data as any)
      .where(eq(prescriptionsTable.id, params.data.id))
      .returning();
    if (!rx) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json(formatRx(rx));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
