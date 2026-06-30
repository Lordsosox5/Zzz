import { useEffect, useState } from "react";
import { Users, Calendar, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Stats {
  totalPatients: number;
  admittedPatients: number;
  todayAppointments: number;
  criticalLabs: number;
}

interface RecentPatient {
  id: number;
  nameEn: string;
  status: string;
  admissionDate: string;
  bloodGroup?: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    admitted: "bg-green-100 text-green-700",
    outpatient: "bg-blue-100 text-blue-700",
    discharged: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

        const [patientsRes, admittedRes, apptRes, labsRes, recentRes] = await Promise.all([
          supabase.from("patients").select("id", { count: "exact", head: true }),
          supabase.from("patients").select("id", { count: "exact", head: true }).eq("status", "admitted"),
          supabase.from("appointments").select("id", { count: "exact", head: true })
            .gte("appointmentDate", today).lt("appointmentDate", tomorrow),
          supabase.from("lab_orders").select("id", { count: "exact", head: true }).eq("result", "critical"),
          supabase.from("patients").select("id,nameEn,status,admissionDate,bloodGroup")
            .order("id", { ascending: false }).limit(8),
        ]);

        setStats({
          totalPatients: patientsRes.count ?? 0,
          admittedPatients: admittedRes.count ?? 0,
          todayAppointments: apptRes.count ?? 0,
          criticalLabs: labsRes.count ?? 0,
        });
        setRecent(recentRes.data ?? []);
      } catch {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  const cards = [
    { label: "Total Patients", value: stats?.totalPatients ?? 0, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Admitted", value: stats?.admittedPatients ?? 0, icon: UserCheck, color: "bg-green-50 text-green-600" },
    { label: "Appointments Today", value: stats?.todayAppointments ?? 0, icon: Calendar, color: "bg-purple-50 text-purple-600" },
    { label: "Critical Labs", value: stats?.criticalLabs ?? 0, icon: AlertCircle, color: "bg-red-50 text-red-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Patients</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Name</th>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Blood Group</th>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Admission</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{p.nameEn}</td>
                <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-3 text-gray-600">{p.bloodGroup ?? "—"}</td>
                <td className="px-5 py-3 text-gray-500">
                  {p.admissionDate ? new Date(p.admissionDate).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs">No patients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
