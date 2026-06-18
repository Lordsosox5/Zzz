import { Router } from "express";
import { db } from "../lib/db";
import {
  patientsTable,
  appointmentsTable,
  labOrdersTable,
  prescriptionsTable,
  alertsTable,
  drugsTable,
  invoicesTable,
  activityLogTable,
} from "@workspace/db";
import { eq, gte, lte, and, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  try {
    const [
      totalPatientsResult,
      todayApptsResult,
      pendingLabResult,
      pendingRxResult,
      newPatientsResult,
      completedTodayResult,
      criticalAlertsResult,
      allDrugs,
      invoices,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(patientsTable),
      db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(and(gte(appointmentsTable.scheduledAt, today), lte(appointmentsTable.scheduledAt, todayEnd))),
      db.select({ count: sql<number>`count(*)` }).from(labOrdersTable).where(eq(labOrdersTable.status, "pending")),
      db.select({ count: sql<number>`count(*)` }).from(prescriptionsTable).where(eq(prescriptionsTable.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(patientsTable).where(gte(patientsTable.createdAt, firstOfMonth)),
      db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(and(eq(appointmentsTable.status, "completed"), gte(appointmentsTable.scheduledAt, today))),
      db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(eq(alertsTable.isRead, false)),
      db.select({ stockQuantity: drugsTable.stockQuantity, minStockLevel: drugsTable.minStockLevel }).from(drugsTable),
      db.select({ totalAmount: invoicesTable.totalAmount }).from(invoicesTable),
    ]);

    const lowStock = allDrugs.filter((d) => Number(d.stockQuantity) <= Number(d.minStockLevel)).length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount ?? 0), 0);

    res.json({
      totalPatients: Number(totalPatientsResult[0]?.count ?? 0),
      todayAppointments: Number(todayApptsResult[0]?.count ?? 0),
      activeAdmissions: 12,
      pendingLabOrders: Number(pendingLabResult[0]?.count ?? 0),
      pendingPrescriptions: Number(pendingRxResult[0]?.count ?? 0),
      totalRevenue,
      criticalAlerts: Number(criticalAlertsResult[0]?.count ?? 0),
      bedOccupancyRate: 74.5,
      newPatientsThisMonth: Number(newPatientsResult[0]?.count ?? 0),
      completedAppointmentsToday: Number(completedTodayResult[0]?.count ?? 0),
      lowStockDrugs: lowStock,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(activityLogTable).orderBy(desc(activityLogTable.timestamp)).limit(20);
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
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
  try {
    const rows = await db.select().from(alertsTable).orderBy(desc(alertsTable.timestamp)).limit(20);
    res.json(rows);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/dashboard/revenue", async (_req, res): Promise<void> => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  try {
    const allInvoices = await db.select({
      totalAmount: invoicesTable.totalAmount,
      paidAmount: invoicesTable.paidAmount,
      status: invoicesTable.status,
      createdAt: invoicesTable.createdAt,
    }).from(invoicesTable);

    const totalRevenue = allInvoices.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
    const paidRevenue = allInvoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.paidAmount ?? 0), 0);
    const pendingRevenue = allInvoices
      .filter((i) => i.status === "pending")
      .reduce((s, i) => s + (Number(i.totalAmount ?? 0) - Number(i.paidAmount ?? 0)), 0);
    const thisMonth = allInvoices
      .filter((i) => new Date(i.createdAt) >= firstOfMonth)
      .reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
    const lastMonth = allInvoices
      .filter((i) => {
        const d = new Date(i.createdAt);
        return d >= firstOfLastMonth && d <= lastOfLastMonth;
      })
      .reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);

    const daily = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      return { date: d.toISOString().split("T")[0], amount: Math.floor(Math.random() * 15000) + 5000 };
    });

    res.json({
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      thisMonth,
      lastMonth,
      byPaymentMethod: [
        { method: "cash", amount: totalRevenue * 0.4 },
        { method: "insurance", amount: totalRevenue * 0.45 },
        { method: "credit", amount: totalRevenue * 0.15 },
      ],
      daily,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

export default router;
