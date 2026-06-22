import { Router } from "express";
import { db, labOrdersTable, radiologyOrdersTable, patientsTable, usersTable } from "../lib/db";
import { eq, inArray } from "drizzle-orm";
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

function userIdFromReq(req: import("express").Request): number | null {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    if (!token) return null;
    const [id] = Buffer.from(token, "base64").toString("utf8").split(":");
    const n = parseInt(id, 10);
    return isNaN(n) ? null : n;
  } catch { return null; }
}

async function getCallerUnitId(authHeader: string | undefined): Promise<number | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const [userId] = Buffer.from(token, "base64").toString("utf-8").split(":");
    const rows = await db.select({ unitId: usersTable.unitId }).from(usersTable).where(eq(usersTable.id, parseInt(userId, 10))).limit(1);
    return rows[0]?.unitId ?? null;
  } catch { return null; }
}

async function unitPatientIds(unitId: number): Promise<number[]> {
  const rows = await db.select({ id: patientsTable.id }).from(patientsTable).where(eq(patientsTable.unitId, unitId));
  return rows.map(r => r.id);
}

async function fetchUserNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const rows = await db.select({ id: usersTable.id, nameEn: usersTable.nameEn }).from(usersTable).where(inArray(usersTable.id, ids));
  const map: Record<number, string> = {};
  for (const u of rows) map[u.id] = u.nameEn;
  return map;
}

async function fetchPatientNames(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const rows = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, ids));
  const map: Record<number, string> = {};
  for (const p of rows) map[p.id] = p.nameEn;
  return map;
}

router.get("/lab-orders", async (req, res): Promise<void> => {
  const params = ListLabOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const callerUnitId = await getCallerUnitId(req.headers.authorization);
    let allowedPatientIds: number[] | null = null;
    if (callerUnitId !== null) {
      allowedPatientIds = await unitPatientIds(callerUnitId);
      if (allowedPatientIds.length === 0) { res.json([]); return; }
    }

    let rows: typeof labOrdersTable.$inferSelect[];
    if (params.data.patientId) {
      const pid = params.data.patientId;
      if (allowedPatientIds !== null && !allowedPatientIds.includes(pid)) { res.json([]); return; }
      rows = params.data.status
        ? await db.select().from(labOrdersTable).where(eq(labOrdersTable.patientId, pid))
        : await db.select().from(labOrdersTable).where(eq(labOrdersTable.patientId, pid));
    } else if (allowedPatientIds !== null) {
      rows = await db.select().from(labOrdersTable).where(inArray(labOrdersTable.patientId, allowedPatientIds));
    } else {
      rows = await db.select().from(labOrdersTable);
    }
    if (params.data.status) rows = rows.filter(r => r.status === params.data.status);

    const patientIds = [...new Set(rows.map(o => o.patientId).filter(Boolean))];
    const userIds = [...new Set(rows.map(o => o.orderedById).filter(Boolean))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds), fetchUserNames(userIds)]);
    res.json(rows.map(o => ({ ...o, patientName: patientMap[o.patientId] ?? null, orderedByName: userMap[o.orderedById] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/lab-orders", async (req, res): Promise<void> => {
  const parsed = CreateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const rows = await db.insert(labOrdersTable).values({ ...parsed.data, orderedById } as any).returning();
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...rows[0], patientName: null, orderedByName: userMap[orderedById] ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = GetLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(labOrdersTable).where(eq(labOrdersTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json({ ...rows[0], patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/lab-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateLabOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLabOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.update(labOrdersTable).set(parsed.data as any).where(eq(labOrdersTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Lab order not found" }); return; }
    res.json({ ...rows[0], patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/radiology-orders", async (req, res): Promise<void> => {
  const params = ListRadiologyOrdersQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const callerUnitId = await getCallerUnitId(req.headers.authorization);
    let allowedPatientIds: number[] | null = null;
    if (callerUnitId !== null) {
      allowedPatientIds = await unitPatientIds(callerUnitId);
      if (allowedPatientIds.length === 0) { res.json([]); return; }
    }

    let rows: typeof radiologyOrdersTable.$inferSelect[];
    if (params.data.patientId) {
      const pid = params.data.patientId;
      if (allowedPatientIds !== null && !allowedPatientIds.includes(pid)) { res.json([]); return; }
      rows = await db.select().from(radiologyOrdersTable).where(eq(radiologyOrdersTable.patientId, pid));
    } else if (allowedPatientIds !== null) {
      rows = await db.select().from(radiologyOrdersTable).where(inArray(radiologyOrdersTable.patientId, allowedPatientIds));
    } else {
      rows = await db.select().from(radiologyOrdersTable);
    }
    if (params.data.status) rows = rows.filter(r => r.status === params.data.status);

    const patientIds = [...new Set(rows.map(o => o.patientId).filter(Boolean))];
    const userIds = [...new Set(rows.map(o => o.orderedById).filter(Boolean))];
    const [patientMap, userMap] = await Promise.all([fetchPatientNames(patientIds), fetchUserNames(userIds)]);
    res.json(rows.map(o => ({ ...o, patientName: patientMap[o.patientId] ?? null, orderedByName: userMap[o.orderedById] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/radiology-orders", async (req, res): Promise<void> => {
  const parsed = CreateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const orderedById = userIdFromReq(req) ?? 1;
    const rows = await db.insert(radiologyOrdersTable).values({ ...parsed.data, orderedById } as any).returning();
    const userMap = await fetchUserNames([orderedById]);
    res.status(201).json({ ...rows[0], patientName: null, orderedByName: userMap[orderedById] ?? null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/radiology-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateRadiologyOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRadiologyOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.update(radiologyOrdersTable).set(parsed.data as any).where(eq(radiologyOrdersTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Radiology order not found" }); return; }
    res.json({ ...rows[0], patientName: null, orderedByName: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
