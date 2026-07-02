import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getToken, getUser } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifType =
  | "critical_lab"
  | "new_patient"
  | "new_appointment"
  | "low_stock"
  | "pending_lab"
  | "pending_rx"
  | "pending_invoice"
  | "overdue_invoice"
  | "system_alert";

export interface Notification {
  id: string;
  type: NotifType;
  severity: "critical" | "warning" | "info";
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  href?: string;
  readAt?: Date;
  createdAt: Date;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// ─── Role → which notification types to surface ───────────────────────────────

const ROLE_NOTIF_TYPES: Record<string, NotifType[]> = {
  super_admin:          ["critical_lab", "new_patient", "new_appointment", "low_stock", "pending_lab", "pending_rx", "pending_invoice", "overdue_invoice", "system_alert"],
  pediatric_consultant: ["critical_lab", "new_patient", "new_appointment", "pending_lab", "system_alert"],
  pediatric_specialist: ["critical_lab", "new_patient", "pending_lab", "system_alert"],
  emergency_physician:  ["critical_lab", "new_patient", "new_appointment", "pending_lab", "system_alert"],
  house_officer:        ["critical_lab", "new_patient", "pending_lab", "system_alert"],
  medical_officer:      ["critical_lab", "new_patient", "pending_lab", "system_alert"],
  registrar:            ["critical_lab", "new_patient", "pending_lab", "system_alert"],
  nurse:                ["new_patient", "new_appointment", "system_alert"],
  pharmacist:           ["low_stock", "pending_rx", "system_alert"],
  lab_technician:       ["critical_lab", "pending_lab", "system_alert"],
  billing_officer:      ["pending_invoice", "overdue_invoice", "system_alert"],
  administrative:       ["new_appointment", "system_alert"],
  accounts_manager:     ["system_alert"],
  data_analyser:        ["system_alert"],
};

function getAllowedTypes(role: string): NotifType[] {
  return ROLE_NOTIF_TYPES[role] ?? ["system_alert"];
}

// ─── Stable ID helpers ────────────────────────────────────────────────────────

function stableId(prefix: string, key: string | number): string {
  return `${prefix}::${key}`;
}

// ─── REST fetcher (no query client — plain fetch) ─────────────────────────────

async function apiFetch(path: string, token: string): Promise<any> {
  const base = (import.meta as any).env?.VITE_API_BASE_URL || "";
  const res = await fetch(`${base}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Build notifications from polled data ─────────────────────────────────────

function buildNotifications(
  role: string,
  {
    alerts,
    drugs,
    labOrders,
    prescriptions,
    invoices,
    patients,
    appointments,
  }: {
    alerts: any[];
    drugs: any[];
    labOrders: any[];
    prescriptions: any[];
    invoices: any[];
    patients: any[];
    appointments: any[];
  }
): Notification[] {
  const allowed = getAllowedTypes(role);
  const has = (type: NotifType) => allowed.includes(type);
  const notifs: Notification[] = [];

  // ── system_alert: seeded DB alerts (all roles see their own relevant ones) ──
  if (has("system_alert") || has("critical_lab") || has("new_patient")) {
    for (const a of alerts.slice(0, 10)) {
      const type: NotifType =
        a.severity === "critical" ? "critical_lab" : "system_alert";
      if (!has(type)) continue;
      notifs.push({
        id: stableId("alert", a.id),
        type,
        severity: a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "info",
        title: {
          en: a.severity === "critical" ? "⚠️ Critical Alert" : "Hospital Alert",
          ar: a.severity === "critical" ? "⚠️ تنبيه حرج" : "تنبيه المستشفى",
        },
        body: {
          en: a.message ?? "System alert",
          ar: a.messageAr ?? a.message ?? "تنبيه النظام",
        },
        href: a.severity === "critical" ? "/lab" : "/dashboard",
        createdAt: new Date(a.timestamp ?? Date.now()),
      });
    }
  }

  // ── low_stock: drugs below minimum ──
  if (has("low_stock")) {
    const lowDrugs = drugs.filter(
      d => Number(d.stockQuantity) <= Number(d.minStockLevel ?? d.minimumStock ?? 10)
    );
    if (lowDrugs.length > 0) {
      notifs.push({
        id: stableId("low_stock", lowDrugs.map(d => d.id).sort().join("-")),
        type: "low_stock",
        severity: lowDrugs.some(d => Number(d.stockQuantity) === 0) ? "critical" : "warning",
        title: {
          en: `Low Stock: ${lowDrugs.length} drug${lowDrugs.length > 1 ? "s" : ""}`,
          ar: `مخزون منخفض: ${lowDrugs.length} دواء`,
        },
        body: {
          en: lowDrugs.slice(0, 3).map(d => d.name).join(", ") + (lowDrugs.length > 3 ? ` +${lowDrugs.length - 3} more` : ""),
          ar: lowDrugs.slice(0, 3).map(d => d.nameAr ?? d.name).join("، ") + (lowDrugs.length > 3 ? ` و${lowDrugs.length - 3} آخرين` : ""),
        },
        href: "/pharmacy",
        createdAt: new Date(),
      });
    }
  }

  // ── pending_lab: lab orders awaiting processing ──
  if (has("pending_lab")) {
    const pending = labOrders.filter(o => o.status === "pending");
    if (pending.length > 0) {
      notifs.push({
        id: stableId("pending_lab", pending.length),
        type: "pending_lab",
        severity: pending.length > 5 ? "warning" : "info",
        title: {
          en: `${pending.length} Pending Lab Order${pending.length > 1 ? "s" : ""}`,
          ar: `${pending.length} طلب مختبر معلق`,
        },
        body: {
          en: "Lab orders awaiting collection or processing",
          ar: "طلبات مختبر في انتظار الجمع أو المعالجة",
        },
        href: "/lab",
        createdAt: new Date(),
      });
    }
    const critical = labOrders.filter(o => o.isCritical || o.is_critical);
    if (critical.length > 0 && has("critical_lab")) {
      critical.slice(0, 3).forEach(o => {
        notifs.push({
          id: stableId("crit_lab", o.id),
          type: "critical_lab",
          severity: "critical",
          title: { en: "⚠️ Critical Lab Result", ar: "⚠️ نتيجة مختبر حرجة" },
          body: {
            en: `${o.testName ?? o.test_name ?? "Lab test"} — critical value for ${o.patientName ?? "patient"}`,
            ar: `${o.testName ?? o.test_name ?? "فحص مختبري"} — قيمة حرجة للمريض ${o.patientName ?? ""}`,
          },
          href: "/lab",
          createdAt: new Date(o.updatedAt ?? o.updated_at ?? Date.now()),
        });
      });
    }
  }

  // ── pending_rx: prescriptions awaiting dispensing ──
  if (has("pending_rx")) {
    const pending = prescriptions.filter(r => r.status === "active" || r.status === "pending");
    if (pending.length > 0) {
      notifs.push({
        id: stableId("pending_rx", pending.length),
        type: "pending_rx",
        severity: "info",
        title: {
          en: `${pending.length} Prescription${pending.length > 1 ? "s" : ""} to Dispense`,
          ar: `${pending.length} وصفة في انتظار الصرف`,
        },
        body: {
          en: "Prescriptions are waiting to be dispensed at the pharmacy",
          ar: "وصفات طبية تنتظر الصرف في الصيدلية",
        },
        href: "/prescriptions",
        createdAt: new Date(),
      });
    }
  }

  // ── pending_invoice / overdue_invoice ──
  if (has("pending_invoice") || has("overdue_invoice")) {
    const pending = invoices.filter(i => i.status === "pending");
    const partial = invoices.filter(i => i.status === "partial");
    if (pending.length > 0 && has("pending_invoice")) {
      notifs.push({
        id: stableId("pending_inv", pending.length),
        type: "pending_invoice",
        severity: "warning",
        title: {
          en: `${pending.length} Unpaid Invoice${pending.length > 1 ? "s" : ""}`,
          ar: `${pending.length} فاتورة غير مدفوعة`,
        },
        body: {
          en: `Total outstanding: $${pending.reduce((s: number, i: any) => s + Number(i.totalAmount ?? 0), 0).toLocaleString()}`,
          ar: `إجمالي المتبقي: $${pending.reduce((s: number, i: any) => s + Number(i.totalAmount ?? 0), 0).toLocaleString()}`,
        },
        href: "/billing",
        createdAt: new Date(),
      });
    }
    if (partial.length > 0 && has("overdue_invoice")) {
      notifs.push({
        id: stableId("partial_inv", partial.length),
        type: "overdue_invoice",
        severity: "info",
        title: {
          en: `${partial.length} Partial Payment${partial.length > 1 ? "s" : ""} Pending`,
          ar: `${partial.length} دفعة جزئية معلقة`,
        },
        body: {
          en: "Some invoices have partial payments and need follow-up",
          ar: "بعض الفواتير تحتوي على دفعات جزئية وتحتاج متابعة",
        },
        href: "/billing",
        createdAt: new Date(),
      });
    }
  }

  // ── new_patient: recently registered patients ──
  if (has("new_patient")) {
    const recent = patients.filter(p => {
      const created = new Date(p.createdAt ?? p.created_at ?? 0);
      return Date.now() - created.getTime() < 24 * 60 * 60 * 1000; // last 24h
    });
    if (recent.length > 0) {
      recent.slice(0, 2).forEach(p => {
        notifs.push({
          id: stableId("new_patient", p.id),
          type: "new_patient",
          severity: "info",
          title: { en: "New Patient Registered", ar: "مريض جديد مسجّل" },
          body: {
            en: `${p.nameEn ?? "Patient"} (MRN: ${p.mrn ?? "—"}) has been admitted`,
            ar: `تم تسجيل ${p.nameAr ?? p.nameEn ?? "مريض"} (MRN: ${p.mrn ?? "—"})`,
          },
          href: p.id ? `/patients/${p.id}` : "/patients",
          createdAt: new Date(p.createdAt ?? p.created_at ?? Date.now()),
        });
      });
    }
  }

  // ── new_appointment: today's appointments ──
  if (has("new_appointment")) {
    const upcoming = appointments.filter(a => a.status === "scheduled");
    if (upcoming.length > 0) {
      notifs.push({
        id: stableId("upcoming_appts", upcoming.length),
        type: "new_appointment",
        severity: "info",
        title: {
          en: `${upcoming.length} Appointment${upcoming.length > 1 ? "s" : ""} Today`,
          ar: `${upcoming.length} موعد اليوم`,
        },
        body: {
          en: upcoming.length > 1
            ? `${upcoming.length} patients scheduled — first at ${new Date(upcoming[0].scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : `${upcoming[0].patientName ?? "Patient"} at ${new Date(upcoming[0].scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          ar: upcoming.length > 1
            ? `${upcoming.length} مرضى مجدولون — أول موعد في ${new Date(upcoming[0].scheduledAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`
            : `${upcoming[0].patientName ?? "مريض"} في ${new Date(upcoming[0].scheduledAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`,
        },
        href: "/appointments",
        createdAt: new Date(),
      });
    }
  }

  // Sort: critical first, then by date desc; deduplicate by id
  const seen = new Set<string>();
  return notifs
    .filter(n => { const ok = !seen.has(n.id); seen.add(n.id); return ok; })
    .sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const DISMISSED_KEY = "ehr_notif_dismissed";
const READ_KEY = "ehr_notif_read";
const POLL_INTERVAL = 45_000; // 45 seconds

function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}
function saveSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...set].slice(-200))); } catch {}
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [allNotifs, setAllNotifs] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadSet(READ_KEY));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadSet(DISMISSED_KEY));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) return;

    const role: string = user.role ?? "super_admin";
    const allowed = getAllowedTypes(role);

    // Decide which endpoints to call based on role
    const needsDrugs  = allowed.includes("low_stock") || role === "super_admin";
    const needsLab    = allowed.includes("pending_lab") || allowed.includes("critical_lab");
    const needsRx     = allowed.includes("pending_rx");
    const needsInv    = allowed.includes("pending_invoice") || allowed.includes("overdue_invoice");
    const needsPts    = allowed.includes("new_patient");
    const needsAppts  = allowed.includes("new_appointment");

    const [
      alerts,
      drugs,
      labOrders,
      prescriptions,
      invoices,
      patientsResp,
      appointments,
    ] = await Promise.all([
      apiFetch("/dashboard/alerts", token).then(r => Array.isArray(r) ? r : []),
      needsDrugs  ? apiFetch("/drugs", token).then(r => Array.isArray(r) ? r : []) : Promise.resolve([]),
      needsLab    ? apiFetch("/lab-orders", token).then(r => Array.isArray(r) ? r : []) : Promise.resolve([]),
      needsRx     ? apiFetch("/prescriptions?status=active", token).then(r => Array.isArray(r) ? r : []) : Promise.resolve([]),
      needsInv    ? apiFetch("/invoices", token).then(r => Array.isArray(r) ? r : []) : Promise.resolve([]),
      needsPts    ? apiFetch("/patients?limit=20", token).then(r => { const data = r; return Array.isArray(data) ? data : (data?.patients ?? []); }) : Promise.resolve([]),
      needsAppts  ? apiFetch("/appointments/today", token).then(r => Array.isArray(r) ? r : []) : Promise.resolve([]),
    ]);

    const built = buildNotifications(role, {
      alerts, drugs, labOrders, prescriptions, invoices,
      patients: patientsResp, appointments,
    });

    setAllNotifs(built);
  }, []);

  // Initial + interval polling
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [poll]);

  const notifications = allNotifs
    .filter(n => !dismissedIds.has(n.id))
    .map(n => ({ ...n, readAt: readIds.has(n.id) ? new Date(0) : undefined }));

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const markRead = useCallback((id: string) => {
    setReadIds(prev => { const next = new Set(prev).add(id); saveSet(READ_KEY, next); return next; });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      allNotifs.forEach(n => next.add(n.id));
      saveSet(READ_KEY, next);
      return next;
    });
  }, [allNotifs]);

  const dismiss = useCallback((id: string) => {
    setDismissedIds(prev => { const next = new Set(prev).add(id); saveSet(DISMISSED_KEY, next); return next; });
    setReadIds(prev => { const next = new Set(prev).add(id); saveSet(READ_KEY, next); return next; });
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, dismiss }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
