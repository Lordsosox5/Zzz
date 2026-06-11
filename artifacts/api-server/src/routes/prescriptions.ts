import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, prescriptionsTable, patientsTable, usersTable } from "@workspace/db";
import {
  ListPrescriptionsQueryParams,
  CreatePrescriptionBody,
  GetPrescriptionParams,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
} from "@workspace/api-zod";

const router = Router();

function mapRx(p: typeof prescriptionsTable.$inferSelect, patientName?: string | null, prescriberName?: string | null) {
  return { ...p, patientName: patientName ?? null, prescriberName: prescriberName ?? null, createdAt: p.createdAt.toISOString() };
}

router.get("/prescriptions", async (req, res): Promise<void> => {
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conditions = [];
  if (params.data.patientId) conditions.push(eq(prescriptionsTable.patientId, params.data.patientId));
  if (params.data.status) conditions.push(eq(prescriptionsTable.status, params.data.status));
  const results = conditions.length
    ? await db.select().from(prescriptionsTable).where(and(...conditions)).orderBy(prescriptionsTable.createdAt)
    : await db.select().from(prescriptionsTable).orderBy(prescriptionsTable.createdAt);
  res.json(results.map(p => mapRx(p)));
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const prescriberId = parsed.data.patientId; // use first staff as prescriber
  const [rx] = await db.insert(prescriptionsTable).values({ ...parsed.data, prescriberId: 1 }).returning();
  res.status(201).json(mapRx(rx));
});

router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const params = GetPrescriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [rx] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, params.data.id));
  if (!rx) {
    res.status(404).json({ error: "Prescription not found" });
    return;
  }
  res.json(mapRx(rx));
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
  const [rx] = await db.update(prescriptionsTable).set(parsed.data).where(eq(prescriptionsTable.id, params.data.id)).returning();
  if (!rx) {
    res.status(404).json({ error: "Prescription not found" });
    return;
  }
  res.json(mapRx(rx));
});

export default router;
