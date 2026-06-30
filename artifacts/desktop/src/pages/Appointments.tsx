import { useEffect, useState } from "react";
import { Calendar, Clock, Plus, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Appointment {
  id: number;
  appointmentDate: string;
  type: string;
  status: string;
  notes?: string;
  patients?: { nameEn: string };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-600",
    "no-show": "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

  async function load() {
    setLoading(true);
    const next = new Date(dateFilter);
    next.setDate(next.getDate() + 1);
    const { data } = await supabase
      .from("appointments")
      .select("id,appointmentDate,type,status,notes,patients(nameEn)")
      .gte("appointmentDate", dateFilter)
      .lt("appointmentDate", next.toISOString().slice(0, 10))
      .order("appointmentDate", { ascending: true });
    setAppointments((data as unknown as Appointment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [dateFilter]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{appointments.length} appointment{appointments.length !== 1 ? "s" : ""} on selected date</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Calendar className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No appointments for this date.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.map(a => (
              <div key={a.id} className="px-5 py-4 hover:bg-blue-50/30 transition-colors flex items-center gap-4">
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {a.patients?.nameEn ?? "Unknown Patient"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(a.appointmentDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {a.type && ` · ${a.type}`}
                  </p>
                  {a.notes && <p className="text-xs text-gray-400 mt-1 truncate">{a.notes}</p>}
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
