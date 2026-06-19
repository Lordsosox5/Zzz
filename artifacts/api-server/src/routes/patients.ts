import { Router } from "express";
import { db, patientsTable, clinicalNotesTable, prescriptionsTable, labOrdersTable, appointmentsTable, vaccinationsTable, growthRecordsTable } from "../lib/db";
import { eq, ilike, or, desc, asc } from "drizzle-orm";
import {
  ListPatientsQueryParams,
  CreatePatientBody,
  GetPatientParams,
  UpdatePatientParams,
  UpdatePatientBody,
  GetPatientSummaryParams,
} from "@workspace/api-zod";

const router = Router();

let mrnCounter = 1000;
function generateMRN(): string {
  return `AMH-${String(++mrnCounter).padStart(5, "0")}`;
}

router.get("/patients", async (req, res): Promise<void> => {
  const params = ListPatientsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { search, page = 1, limit = 20 } = params.data;
  const offset = (page - 1) * limit;

  try {
    let query = db.select().from(patientsTable);
    if (search) {
      query = query.where(
        or(
          ilike(patientsTable.nameEn, `%${search}%`),
          ilike(patientsTable.mrn, `%${search}%`),
        )
      ) as typeof query;
    }
    const allRows = await query.orderBy(asc(patientsTable.createdAt));
    const total = allRows.length;
    const patients = allRows.slice(offset, offset + limit);
    res.json({ patients, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const mrn = generateMRN();
    const rows = await db
      .insert(patientsTable)
      .values({ ...parsed.data, mrn })
      .returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const rows = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/patients/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const rows = await db
      .update(patientsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(patientsTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/patients/:id/summary", async (req, res): Promise<void> => {
  const params = GetPatientSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const id = params.data.id;
  try {
    const patientRows = await db.select().from(patientsTable).where(eq(patientsTable.id, id)).limit(1);
    if (!patientRows[0]) { res.status(404).json({ error: "Patient not found" }); return; }

    const [notes, rxs, labs, appts, vaccs, growth] = await Promise.all([
      db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.patientId, id)).orderBy(desc(clinicalNotesTable.createdAt)).limit(5),
      db.select().from(prescriptionsTable).where(eq(prescriptionsTable.patientId, id)).limit(5),
      db.select().from(labOrdersTable).where(eq(labOrdersTable.patientId, id)).limit(5),
      db.select().from(appointmentsTable).where(eq(appointmentsTable.patientId, id)).orderBy(asc(appointmentsTable.scheduledAt)).limit(3),
      db.select().from(vaccinationsTable).where(eq(vaccinationsTable.patientId, id)).limit(10),
      db.select().from(growthRecordsTable).where(eq(growthRecordsTable.patientId, id)).orderBy(desc(growthRecordsTable.measurementDate)).limit(1),
    ]);

    res.json({
      patient: patientRows[0],
      recentNotes: notes.map((n) => ({ ...n, authorName: null })),
      activePrescriptions: rxs.map((p) => ({ ...p, patientName: null, prescriberName: null })),
      pendingLabOrders: labs.map((l) => ({ ...l, patientName: null, orderedByName: null })),
      upcomingAppointments: appts.map((a) => ({ ...a, patientName: null, doctorName: null })),
      latestGrowth: growth[0] ?? null,
      vaccinations: vaccs,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
