import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getToken } from "@/lib/auth";

export type NotifType = "critical_lab" | "new_patient" | "new_appointment" | "low_stock";

export interface Notification {
  id: string;
  type: NotifType;
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

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now();
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const token = getToken();
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const push = (n: Omit<Notification, "id" | "createdAt">) => {
    setNotifications(prev => [
      { ...n, id: makeId(), createdAt: new Date() },
      ...prev.slice(0, 49),
    ]);
  };

  useEffect(() => {
    if (!token) return;

    const chLab = supabase
      .channel("realtime:lab_orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lab_orders", filter: "is_critical=eq.true" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          push({
            type: "critical_lab",
            title: { en: "⚠️ Critical Lab Result", ar: "⚠️ نتيجة مختبر حرجة" },
            body: {
              en: `${row.test_name ?? "Lab test"} — critical value reported`,
              ar: `${row.test_name ?? "فحص مختبري"} — تم الإبلاغ عن قيمة حرجة`,
            },
            href: "/lab",
          });
        }
      )
      .subscribe();

    const chPatients = supabase
      .channel("realtime:patients")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patients" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          push({
            type: "new_patient",
            title: { en: "New Patient Registered", ar: "تسجيل مريض جديد" },
            body: {
              en: `${row.name_en ?? "A new patient"} (MRN: ${row.mrn ?? "—"}) has been registered`,
              ar: `تم تسجيل ${row.name_ar ?? row.name_en ?? "مريض جديد"} (MRN: ${row.mrn ?? "—"})`,
            },
            href: row.id ? `/patients/${row.id}` : "/patients",
          });
        }
      )
      .subscribe();

    const chAppts = supabase
      .channel("realtime:appointments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          push({
            type: "new_appointment",
            title: { en: "New Appointment Scheduled", ar: "موعد جديد" },
            body: {
              en: `Appointment booked for ${row.appointment_date ?? "today"}`,
              ar: `تم حجز موعد بتاريخ ${row.appointment_date ?? "اليوم"}`,
            },
            href: "/appointments",
          });
        }
      )
      .subscribe();

    const chPharmacy = supabase
      .channel("realtime:drugs")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drugs" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const qty = Number(row.stock_quantity ?? 0);
          const minLevel = Number(row.min_stock_level ?? 10);
          if (qty <= minLevel) {
            push({
              type: "low_stock",
              title: { en: "Low Drug Stock", ar: "مخزون دواء منخفض" },
              body: {
                en: `${row.name ?? "A drug"} stock is low (${qty} remaining)`,
                ar: `مخزون ${row.name_ar ?? row.name ?? "دواء"} منخفض (${qty} متبقي)`,
              },
              href: "/pharmacy",
            });
          }
        }
      )
      .subscribe();

    channelsRef.current = [chLab, chPatients, chAppts, chPharmacy];

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [token]);

  const markRead = (id: string) =>
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, readAt: new Date() } : n))
    );

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date() })));

  const dismiss = (id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  const unreadCount = notifications.filter(n => !n.readAt).length;

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
