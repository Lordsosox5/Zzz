import { Router } from "express";
import { db, patientsTable, clinicalNotesTable, prescriptionsTable, labOrdersTable, appointmentsTable, vaccinationsTable, growthRecordsTable } from "@workspace/db";
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
    const whereClause = search
      ? or(
          ilike(patientsTable.nameEn, `%${search}%`),
          ilike(patientsTable.mrn, `%${search}%`),
          ilike(patientsTable.nameAr, `%${search}%`),
        )
      : undefined;

    const [patients, countResult] = await Promise.all([
      db
        .select()
        .from(patientsTable)
        .where(whereClause)
        .orderBy(asc(patientsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.$count(patientsTable, whereClause),
    ]);

    res.json({ patients, total: countResult, page, limit });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const mrn = generateMRN();
  try {
    const [patient] = await db
      .insert(patientsTable)
      .values({ ...parsed.data, mrn })
      .returning();
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [patient] = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.id, params.data.id))
      .limit(1);
    if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
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
    const [patient] = await db
      .update(patientsTable)
      .set(parsed.data)
      .where(eq(patientsTable.id, params.data.id))
      .returning();
    if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
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
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id)).limit(1);
    if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

    const [notes, rxs, labs, appts, vaccs, growth] = await Promise.all([
      db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.patientId, id)).orderBy(desc(clinicalNotesTable.createdAt)).limit(5),
      db.select().from(prescriptionsTable).where(eq(prescriptionsTable.patientId, id)).limit(5),
      db.select().from(labOrdersTable).where(eq(labOrdersTable.patientId, id)).limit(5),
      db.select().from(appointmentsTable).where(eq(appointmentsTable.patientId, id)).orderBy(asc(appointmentsTable.scheduledAt)).limit(3),
      db.select().from(vaccinationsTable).where(eq(vaccinationsTable.patientId, id)).limit(10),
      db.select().from(growthRecordsTable).where(eq(growthRecordsTable.patientId, id)).orderBy(desc(growthRecordsTable.measurementDate)).limit(1),
    ]);

    res.json({
      patient,
      recentNotes: notes.map((n) => ({ ...n, authorName: null })),
      activePrescriptions: rxs.map((p) => ({ ...p, patientName: null, prescriberName: null })),
      pendingLabOrders: labs.map((l) => ({ ...l, patientName: null, orderedByName: null })),
      upcomingAppointments: appts.map((a) => ({ ...a, patientName: null, doctorName: null })),
      latestGrowth: growth[0] ?? null,
      vaccinations: vaccs,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
