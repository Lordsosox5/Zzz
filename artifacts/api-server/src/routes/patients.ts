import { Router } from "express";
import { db, patientsTable, usersTable, clinicalNotesTable, prescriptionsTable, labOrdersTable, appointmentsTable, vaccinationsTable, growthRecordsTable } from "../lib/db";
import { eq, ilike, or, asc, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
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
    const rows = await db.select({ mrn: patientsTable.mrn }).from(patientsTable).orderBy(desc(patientsTable.id)).limit(1);
    const mrn = rows[0]?.mrn;
    if (mrn) {
      const num = parseInt(String(mrn).replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > mrnCounter) mrnCounter = num;
    }
  } catch { }
}

async function getCallerInfo(authHeader: string | undefined): Promise<{ id: number; role: string; unitId: number | null } | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const [userId] = Buffer.from(token, "base64").toString("utf-8").split(":");
    const rows = await db.select({ id: usersTable.id, role: usersTable.role, unitId: usersTable.unitId }).from(usersTable).where(eq(usersTable.id, parseInt(userId, 10))).limit(1);
    const raw = rows[0];
    if (!raw) return null;
    return { id: raw.id, role: raw.role, unitId: raw.unitId ?? null };
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

    let conditions: ReturnType<typeof eq>[] = [];
    if (isUnitRestricted && caller.unitId !== null) {
      conditions.push(eq(patientsTable.unitId, caller.unitId));
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(patientsTable)
      .where(
        conditions.length > 0 || search
          ? sql`${conditions.length > 0 ? sql`unit_id = ${caller!.unitId}` : sql`1=1`} ${search ? sql`AND (name_en ILIKE ${'%' + search + '%'} OR mrn ILIKE ${'%' + search + '%'})` : sql``}`
          : undefined
      );

    let query = db.select().from(patientsTable);
    if (isUnitRestricted && caller.unitId !== null) {
      if (search) {
        query = query.where(sql`unit_id = ${caller.unitId} AND (name_en ILIKE ${'%' + search + '%'} OR mrn ILIKE ${'%' + search + '%'})`) as typeof query;
      } else {
        query = query.where(eq(patientsTable.unitId, caller.unitId)) as typeof query;
      }
    } else if (search) {
      query = query.where(or(ilike(patientsTable.nameEn, `%${search}%`), ilike(patientsTable.mrn, `%${search}%`))) as typeof query;
    }

    const rows = await query.orderBy(asc(patientsTable.createdAt)).limit(limit).offset(offset);
    const total = Number(countResult[0]?.count ?? 0);
    res.json({ patients: rows, total, page, limit });
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
    const rows = await db.insert(patientsTable).values({ ...parsed.data, mrn, unitId: unitId ?? null }).returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(rows[0]);
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
    const rows = await db.update(patientsTable).set(parsed.data).where(eq(patientsTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/patients/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const caller = await getCallerInfo(req.headers.authorization);
    if (!caller || caller.role !== "super_admin") {
      res.status(403).json({ error: "Forbidden: super_admin only" });
      return;
    }
    await db.delete(patientsTable).where(eq(patientsTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/patients/:id/unit", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid patient id" }); return; }
  try {
    const rows = await db.select({ unitId: patientsTable.unitId }).from(patientsTable).where(eq(patientsTable.id, id)).limit(1);
    const unitId = rows[0]?.unitId ?? null;
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
    const patientRows = await db.select().from(patientsTable).where(eq(patientsTable.id, id)).limit(1);
    if (!patientRows[0]) { res.status(404).json({ error: "Patient not found" }); return; }

    const [notes, rxs, labs, appts, vaccs, growth] = await Promise.all([
      db.select().from(clinicalNotesTable).where(eq(clinicalNotesTable.patientId, id)).orderBy(desc(clinicalNotesTable.createdAt)).limit(5),
      db.select().from(prescriptionsTable).where(eq(prescriptionsTable.patientId, id)).limit(5),
      db.select().from(labOrdersTable).where(eq(labOrdersTable.patientId, id)).limit(5),
      db.select().from(appointmentsTable).where(eq(appointmentsTable.patientId, id)).orderBy(asc(appointmentsTable.scheduledAt)).limit(3),
      db.select().from(vaccinationsTable).where(eq(vaccinationsTable.patientId, id)).limit(10),
      db.select().from(growthRecordsTable).where(eq(growthRecordsTable.patientId, id)).orderBy(desc(growthRecordsTable.createdAt)).limit(1),
    ]);

    res.json({
      patient: patientRows[0],
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
