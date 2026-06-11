import { Router } from "express";
import { sql, eq, gte, lte, and } from "drizzle-orm";
import { db, patientsTable, appointmentsTable, labOrdersTable, prescriptionsTable, drugsTable, invoicesTable, activityLogTable, alertsTable } from "@workspace/db";

const router = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    [{ count: totalPatients }],
    [{ count: todayAppointments }],
    [{ count: pendingLab }],
    [{ count: pendingRx }],
    [{ count: newPatients }],
    [{ count: completedToday }],
    [{ count: lowStock }],
    [{ total: totalRevenue }],
    [{ count: criticalAlerts }],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(patientsTable),
    db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(and(gte(appointmentsTable.scheduledAt, today), lte(appointmentsTable.scheduledAt, todayEnd))),
    db.select({ count: sql<number>`count(*)` }).from(labOrdersTable).where(eq(labOrdersTable.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(prescriptionsTable).where(eq(prescriptionsTable.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(patientsTable).where(gte(patientsTable.createdAt, firstOfMonth)),
    db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(and(eq(appointmentsTable.status, "completed"), gte(appointmentsTable.scheduledAt, today))),
    db.select({ count: sql<number>`count(*)` }).from(drugsTable).where(sql`stock_quantity <= min_stock_level`),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(invoicesTable),
    db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(eq(alertsTable.isRead, false)),
  ]);

  res.json({
    totalPatients: Number(totalPatients),
    todayAppointments: Number(todayAppointments),
    activeAdmissions: 12,
    pendingLabOrders: Number(pendingLab),
    pendingPrescriptions: Number(pendingRx),
    totalRevenue: Number(totalRevenue),
    criticalAlerts: Number(criticalAlerts),
    bedOccupancyRate: 74.5,
    newPatientsThisMonth: Number(newPatients),
    completedAppointmentsToday: Number(completedToday),
    lowStockDrugs: Number(lowStock),
  });
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const activities = await db.select().from(activityLogTable).orderBy(sql`timestamp desc`).limit(20);
  res.json(activities.map(a => ({
    ...a,
    timestamp: a.timestamp.toISOString(),
  })));
});

router.get("/dashboard/bed-occupancy", async (_req, res): Promise<void> => {
  res.json({
    total: 120,
    occupied: 89,
    available: 31,
    occupancyRate: 74.2,
    wards: [
      { name: "General Pediatrics", nameAr: "طب الأطفال العام", total: 40, occupied: 32 },
      { name: "PICU", nameAr: "وحدة العناية المركزة للأطفال", total: 15, occupied: 13 },
      { name: "NICU", nameAr: "وحدة العناية المركزة لحديثي الولادة", total: 20, occupied: 17 },
      { name: "Emergency", nameAr: "الطوارئ", total: 25, occupied: 18 },
      { name: "Surgical", nameAr: "الجراحة", total: 20, occupied: 9 },
    ],
  });
});

router.get("/dashboard/alerts", async (_req, res): Promise<void> => {
  const alerts = await db.select().from(alertsTable).orderBy(sql`timestamp desc`).limit(20);
  res.json(alerts.map(a => ({ ...a, timestamp: a.timestamp.toISOString() })));
});

router.get("/dashboard/revenue", async (_req, res): Promise<void> => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    [{ total: totalRevenue }],
    [{ paid: paidRevenue }],
    [{ pending: pendingRevenue }],
    [{ thisMonth }],
    [{ lastMonth }],
  ] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(invoicesTable),
    db.select({ paid: sql<number>`coalesce(sum(paid_amount), 0)` }).from(invoicesTable).where(eq(invoicesTable.status, "paid")),
    db.select({ pending: sql<number>`coalesce(sum(total_amount - paid_amount), 0)` }).from(invoicesTable).where(eq(invoicesTable.status, "pending")),
    db.select({ thisMonth: sql<number>`coalesce(sum(total_amount), 0)` }).from(invoicesTable).where(gte(invoicesTable.createdAt, firstOfMonth)),
    db.select({ lastMonth: sql<number>`coalesce(sum(total_amount), 0)` }).from(invoicesTable).where(and(gte(invoicesTable.createdAt, firstOfLastMonth), lte(invoicesTable.createdAt, lastOfLastMonth))),
  ]);

  // Generate daily revenue for last 7 days
  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split("T")[0],
      amount: Math.floor(Math.random() * 15000) + 5000,
    };
  });

  res.json({
    totalRevenue: Number(totalRevenue),
    paidRevenue: Number(paidRevenue),
    pendingRevenue: Number(pendingRevenue),
    thisMonth: Number(thisMonth),
    lastMonth: Number(lastMonth),
    byPaymentMethod: [
      { method: "cash", amount: Number(totalRevenue) * 0.4 },
      { method: "insurance", amount: Number(totalRevenue) * 0.45 },
      { method: "credit", amount: Number(totalRevenue) * 0.15 },
    ],
    daily,
  });
});

export default router;
