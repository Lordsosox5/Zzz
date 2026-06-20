import { Router } from "express";
import { supabase, mapRows } from "../lib/supabase";

const router = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      { count: totalPatients },
      { count: todayAppointments },
      { count: pendingLab },
      { count: pendingRx },
      { count: newPatients },
      { count: completedToday },
      { count: criticalAlerts },
      { data: allDrugs },
      { data: allInvoices },
    ] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true })
        .gte("scheduled_at", today.toISOString()).lte("scheduled_at", todayEnd.toISOString()),
      supabase.from("lab_orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("prescriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("patients").select("*", { count: "exact", head: true }).gte("created_at", firstOfMonth.toISOString()),
      supabase.from("appointments").select("*", { count: "exact", head: true })
        .eq("status", "completed").gte("scheduled_at", today.toISOString()),
      supabase.from("alerts").select("*", { count: "exact", head: true }).eq("is_read", false),
      supabase.from("drugs").select("stock_quantity, min_stock_level"),
      supabase.from("invoices").select("total_amount"),
    ]);

    const lowStock = (allDrugs ?? []).filter((d: any) => Number(d.stock_quantity) <= Number(d.min_stock_level)).length;
    const totalRevenue = (allInvoices ?? []).reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);

    res.json({
      totalPatients: totalPatients ?? 0,
      todayAppointments: todayAppointments ?? 0,
      activeAdmissions: 12,
      pendingLabOrders: pendingLab ?? 0,
      pendingPrescriptions: pendingRx ?? 0,
      totalRevenue,
      criticalAlerts: criticalAlerts ?? 0,
      bedOccupancyRate: 74.5,
      newPatientsThisMonth: newPatients ?? 0,
      completedAppointmentsToday: completedToday ?? 0,
      lowStockDrugs: lowStock,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  try {
    const { data, error } = await supabase.from("activity_log").select("*").order("timestamp", { ascending: false }).limit(20);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(mapRows(data ?? []));
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
    const { data, error } = await supabase.from("alerts").select("*").order("timestamp", { ascending: false }).limit(20);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(mapRows(data ?? []));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/dashboard/revenue", async (_req, res): Promise<void> => {
  try {
    const { data: invs } = await supabase.from("invoices").select("total_amount, paid_amount, status, created_at");
    const rows = invs ?? [];
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const totalRevenue = rows.reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
    const paidRevenue = rows.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.paid_amount ?? 0), 0);
    const pendingRevenue = rows.filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + (Number(i.total_amount ?? 0) - Number(i.paid_amount ?? 0)), 0);
    const thisMonth = rows.filter((i: any) => new Date(i.created_at) >= firstOfMonth).reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
    const lastMonth = rows.filter((i: any) => { const d = new Date(i.created_at); return d >= firstOfLastMonth && d <= lastOfLastMonth; }).reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);

    const daily = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - idx));
      return { date: d.toISOString().split("T")[0], amount: Math.floor(Math.random() * 15000) + 5000 };
    });

    res.json({
      totalRevenue, paidRevenue, pendingRevenue, thisMonth, lastMonth,
      byPaymentMethod: [
        { method: "cash", amount: totalRevenue * 0.4 },
        { method: "insurance", amount: totalRevenue * 0.45 },
        { method: "credit", amount: totalRevenue * 0.15 },
      ],
      daily,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
