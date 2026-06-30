import { useEffect, useState } from "react";
import { Search, Plus, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Patient {
  id: number;
  nameEn: string;
  nameAr?: string;
  status: string;
  bloodGroup?: string;
  admissionDate?: string;
  guardianName?: string;
  guardianPhone?: string;
  nationality?: string;
  allergies?: string;
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

const EMPTY_FORM = {
  nameEn: "", nameAr: "", bloodGroup: "", guardianName: "",
  guardianPhone: "", nationality: "", allergies: "", status: "admitted",
};

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("patients")
      .select("id,nameEn,nameAr,status,bloodGroup,admissionDate,guardianName,guardianPhone,nationality,allergies")
      .order("id", { ascending: false });
    setPatients(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p =>
    p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
    (p.guardianName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    const payload: Record<string, string> = { nameEn: form.nameEn, status: form.status };
    if (form.nameAr) payload.nameAr = form.nameAr;
    if (form.bloodGroup) payload.bloodGroup = form.bloodGroup;
    if (form.guardianName) payload.guardianName = form.guardianName;
    if (form.guardianPhone) payload.guardianPhone = form.guardianPhone;
    if (form.nationality) payload.nationality = form.nationality;
    if (form.allergies) payload.allergies = form.allergies;
    payload.admissionDate = new Date().toISOString();

    const { error } = await supabase.from("patients").insert(payload);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Patient
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or guardian…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Blood</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Guardian</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admitted</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Allergies</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{p.nameEn}</p>
                    {p.nameAr && <p className="text-xs text-gray-400 mt-0.5" dir="rtl">{p.nameAr}</p>}
                    {p.nationality && <p className="text-xs text-gray-400">{p.nationality}</p>}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">{p.bloodGroup ?? "—"}</td>
                  <td className="px-5 py-3">
                    <p className="text-gray-700">{p.guardianName ?? "—"}</p>
                    {p.guardianPhone && <p className="text-xs text-gray-400">{p.guardianPhone}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {p.admissionDate ? new Date(p.admissionDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs max-w-[140px] truncate">
                    {p.allergies ?? "None"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-xs">
                    {search ? "No patients match your search." : "No patients yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Add New Patient</h2>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col">
              <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name (EN) *</label>
                    <input required value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))}
                      placeholder="e.g. Ahmed Ali" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name (AR)</label>
                    <input dir="rtl" value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Blood Group</label>
                    <select value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Select —</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="admitted">Admitted</option>
                      <option value="outpatient">Outpatient</option>
                      <option value="discharged">Discharged</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Guardian Name</label>
                    <input value={form.guardianName} onChange={e => setForm(p => ({ ...p, guardianName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Guardian Phone</label>
                    <input value={form.guardianPhone} onChange={e => setForm(p => ({ ...p, guardianPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
                  <input value={form.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))}
                    placeholder="e.g. Saudi" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Known Allergies</label>
                  <input value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))}
                    placeholder="e.g. Penicillin, Sulfa" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setSaveError(""); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? "Saving…" : "Add Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
