import { Router } from "express";
import { db, patientsTable, usersTable, clinicalNotesTable, prescriptionsTable, labOrdersTable, appointmentsTable, vaccinationsTable, growthRecordsTable } from "../lib/db";
import { eq, or, ilike, desc, asc } from "drizzle-orm";
import {
  ListPatientsQueryParams,
  CreatePatientBody,
  GetPatientParams,
  UpdatePatientParams,
  UpdatePatientBody,
  GetPatientSummaryParams,
} from "@workspace/api-zod";
import { units } from "./units";

const router = Router();

const UNIT_RESTRICTED_ROLES = ["house_officer", "medical_officer"];

let mrnCounter = 1000;
function generateMRN(): string {
  return `AMH-${String(++mrnCounter).padStart(5, "0")}`;
}

export async function initMrnCounter(): Promise<void> {
  try {
    const [latest] = await db.select({ mrn: patientsTable.mrn }).from(patientsTable).orderBy(desc(patientsTable.mrn)).limit(1);
    if (latest?.mrn) {
      const num = parseInt(latest.mrn.replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > mrnCounter) mrnCounter = num;
    }
  } catch {
    // Non-fatal
  }
}

async function getCallerInfo(authHeader: string | undefined): Promise<{ id: number; role: string; unitId: number | null } | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    const [user] = await db.select({ id: usersTable.id, role: usersTable.role, unitId: usersTable.unitId }).from(usersTable).where(eq(usersTable.id, parseInt(userId, 10))).limit(1);
    if (!user) return null;
    return { id: user.id, role: user.role, unitId: user.unitId ?? null };
  } catch {
    return null;
  }
}

router.get("/patients", async (req, res): Promise<void> => {
  const params = ListPatientsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { search, page = 1, limit = 20 } = params.data;
    const offset = (page - 1) * limit;
    const caller = await getCallerInfo(req.headers.authorization);
    const isUnitRestricted = caller && UNIT_RESTRICTED_ROLES.includes(caller.role);

    if (isUnitRestricted && caller.unitId === null) {
      res.json({ patients: [], total: 0, page, limit });
      return;
    }

    let baseQuery = db.select().from(patientsTable).$dynamic();
    let countQuery = db.select().from(patientsTable).$dynamic();

    if (isUnitRestricted && caller.unitId !== null) {
      baseQuery = baseQuery.where(eq(patientsTable.unitId, caller.unitId));
      countQuery = countQuery.where(eq(patientsTable.unitId, caller.unitId));
    }

    if (search) {
      const searchCondition = or(
        ilike(patientsTable.nameEn, `%${search}%`),
        ilike(patientsTable.mrn, `%${search}%`),
      );
      baseQuery = baseQuery.where(searchCondition!);
      countQuery = countQuery.where(searchCondition!);
    }

    const allRows = await countQuery;
    const total = allRows.length;
    const data = await baseQuery.orderBy(asc(patientsTable.createdAt)).limit(limit).offset(offset);
    res.json({ patients: data, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/patients", async (req, res): Promise<void> => {
  const unitId = req.body.unitId ? Number(req.body.unitId) : undefined;
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const mrn = generateMRN();
    const [data] = await db.insert(patientsTable).values({ ...parsed.data, mrn, unitId: unitId ?? null }).returning();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [data] = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.id)).limit(1);
    if (!data) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/patients/:id", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [data] = await db.update(patientsTable).set(parsed.data).where(eq(patientsTable.id, params.data.id)).returning();
    if (!data) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const [patient] = await db.select({ unitId: patientsTable.unitId }).from(patientsTable).where(eq(patientsTable.id, id)).limit(1);
    const unitId = patient?.unitId ?? null;
    if (!unitId) { res.json({ unitId: null, unitNameEn: null, unitNameAr: null }); return; }
    const unit = units.find(u => u.id === unitId);
    res.json({ unitId, unitNameEn: unit?.nameEn ?? null, unitNameAr: unit?.nameAr ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  const { unitId } = req.body as { unitId: number | null };
  try {
    if (unitId === null || unitId === undefined) {
      await db.update(patientsTable).set({ unitId: null }).where(eq(patientsTable.id, id));
      res.json({ unitId: null, unitNameEn: null, unitNameAr: null });
      return;
    }
    const unit = units.find(u => u.id === unitId);
    if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }
    await db.update(patientsTable).set({ unitId }).where(eq(patientsTable.id, id));
    res.json({ unitId, unitNameEn: unit.nameEn, unitNameAr: unit.nameAr ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/summary", async (req, res): Promise<void> => {
  const params = GetPatientSummaryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
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
      recentNotes: notes.map(n => ({ ...n, authorName: null })),
      activePrescriptions: rxs.map(p => ({ ...p, patientName: null, prescriberName: null })),
      pendingLabOrders: labs.map(l => ({ ...l, patientName: null, orderedByName: null })),
      upcomingAppointments: appts.map(a => ({ ...a, patientName: null, doctorName: null })),
      latestGrowth: growth[0] ?? null,
      vaccinations: vaccs,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
