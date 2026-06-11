import { Router } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, patientsTable, clinicalNotesTable, prescriptionsTable, labOrdersTable, appointmentsTable, vaccinationsTable, growthRecordsTable, usersTable, diagnosesTable } from "@workspace/db";
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

  let query = db.select().from(patientsTable);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(patientsTable);

  const results = await db
    .select()
    .from(patientsTable)
    .where(
      search
        ? or(
            ilike(patientsTable.nameEn, `%${search}%`),
            ilike(patientsTable.mrn, `%${search}%`),
            ilike(patientsTable.nameAr ?? patientsTable.nameEn, `%${search}%`)
          )
        : undefined
    )
    .limit(limit)
    .offset(offset)
    .orderBy(patientsTable.createdAt);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(patientsTable)
    .where(
      search
        ? or(
            ilike(patientsTable.nameEn, `%${search}%`),
            ilike(patientsTable.mrn, `%${search}%`)
          )
        : undefined
    );

  res.json({
    patients: results.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
    total: Number(countResult?.count ?? 0),
    page,
    limit,
  });
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const mrn = generateMRN();
  const [patient] = await db.insert(patientsTable).values({ ...parsed.data, mrn }).returning();
  res.status(201).json({ ...patient, createdAt: patient.createdAt.toISOString() });
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.id));
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json({ ...patient, createdAt: patient.createdAt.toISOString() });
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
  const [patient] = await db
    .update(patientsTable)
    .set(parsed.data)
    .where(eq(patientsTable.id, params.data.id))
    .returning();
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json({ ...patient, createdAt: patient.createdAt.toISOString() });
});

router.get("/patients/:id/summary", async (req, res): Promise<void> => {
  const params = GetPatientSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const id = params.data.id;
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  const [recentNotes, activePrescriptions, pendingLabOrders, upcomingAppointments, vaccinations, growthRecords] = await Promise.all([
    db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.patientId, id)).limit(5).orderBy(clinicalNotesTable.createdAt),
    db.select().from(prescriptionsTable).where(eq(prescriptionsTable.patientId, id)).limit(5),
    db.select().from(labOrdersTable).where(eq(labOrdersTable.patientId, id)).limit(5),
    db.select().from(appointmentsTable).where(eq(appointmentsTable.patientId, id)).limit(3),
    db.select().from(vaccinationsTable).where(eq(vaccinationsTable.patientId, id)).limit(10),
    db.select().from(growthRecordsTable).where(eq(growthRecordsTable.patientId, id)).limit(1).orderBy(growthRecordsTable.createdAt),
  ]);

  const mapNote = (n: typeof clinicalNotesTable.$inferSelect) => ({
    ...n,
    authorName: null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  });

  res.json({
    patient: { ...patient, createdAt: patient.createdAt.toISOString() },
    recentNotes: recentNotes.map(mapNote),
    activePrescriptions: activePrescriptions.map(p => ({ ...p, patientName: null, prescriberName: null, createdAt: p.createdAt.toISOString() })),
    pendingLabOrders: pendingLabOrders.map(l => ({ ...l, patientName: null, orderedByName: null, isCritical: l.isCritical, collectedAt: l.collectedAt?.toISOString() ?? null, resultedAt: l.resultedAt?.toISOString() ?? null, createdAt: l.createdAt.toISOString() })),
    upcomingAppointments: upcomingAppointments.map(a => ({ ...a, patientName: null, doctorName: null, scheduledAt: a.scheduledAt.toISOString(), createdAt: a.createdAt.toISOString() })),
    latestGrowth: growthRecords[0] ? { ...growthRecords[0], weight: growthRecords[0].weight ? Number(growthRecords[0].weight) : null, height: growthRecords[0].height ? Number(growthRecords[0].height) : null, headCircumference: growthRecords[0].headCircumference ? Number(growthRecords[0].headCircumference) : null, bmi: growthRecords[0].bmi ? Number(growthRecords[0].bmi) : null, weightPercentile: growthRecords[0].weightPercentile ? Number(growthRecords[0].weightPercentile) : null, heightPercentile: growthRecords[0].heightPercentile ? Number(growthRecords[0].heightPercentile) : null, bmiPercentile: growthRecords[0].bmiPercentile ? Number(growthRecords[0].bmiPercentile) : null, createdAt: growthRecords[0].createdAt.toISOString() } : null,
    vaccinations: vaccinations.map(v => ({ ...v, createdAt: v.createdAt.toISOString() })),
  });
});

export default router;
