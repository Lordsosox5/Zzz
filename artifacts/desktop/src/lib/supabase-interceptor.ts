/**
 * Supabase API Interceptor — Tauri Desktop Build
 *
 * Replaces the Express API server for the desktop app.
 * Patches window.fetch so every /api/* call is handled locally
 * by calling Supabase directly. Zero changes required in any page component.
 *
 * Activated only when import.meta.env.VITE_TAURI === 'true'.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ─── snake_case ↔ camelCase ──────────────────────────────────────────────────

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toSnakeKey(s: string): string {
  return s.replace(/[A-Z]/g, (c: string) => "_" + c.toLowerCase());
}

type Row = Record<string, unknown>;

function mapRow(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v]));
}

function mapRows(rows: Row[]): Row[] {
  return rows.map(mapRow);
}

function toSnake(obj: Row): Row {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [toSnakeKey(k), v]));
}

// ─── Response helpers ────────────────────────────────────────────────────────

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fail(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── In-memory auth state ────────────────────────────────────────────────────

let _currentUser: Row | null = null;

function makeToken(userId: number, username: string): string {
  return btoa(`${userId}:${username}:${Date.now()}`);
}

// ─── Auto-increment helpers ──────────────────────────────────────────────────

async function nextMRN(): Promise<string> {
  const { data } = await supabase
    .from("patients")
    .select("mrn")
    .order("id", { ascending: false })
    .limit(1);
  const last = (data?.[0]?.mrn as string | undefined) ?? "MRN-0000";
  const num = parseInt(last.replace("MRN-", ""), 10) + 1;
  return `MRN-${String(num).padStart(4, "0")}`;
}

async function nextInvoiceNumber(): Promise<string> {
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .order("id", { ascending: false })
    .limit(1);
  const last = (data?.[0]?.invoice_number as string | undefined) ?? "INV-000";
  const num = parseInt(last.replace("INV-", ""), 10) + 1;
  return `INV-${String(num).padStart(3, "0")}`;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function handleLogin(body: Row): Promise<Response> {
  const { username, password } = body as { username: string; password: string };
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .single();
  if (error || !data) return fail("Invalid credentials", 401);
  const user = mapRow(data as Row);
  _currentUser = user;
  const token = makeToken(data.id as number, data.username as string);
  return ok({ token, user });
}

async function handleGetMe(): Promise<Response> {
  if (!_currentUser) return fail("Unauthorized", 401);
  return ok(_currentUser);
}

// ─── Patients ────────────────────────────────────────────────────────────────

async function handleGetPatients(params: URLSearchParams): Promise<Response> {
  const search = params.get("search");
  const status = params.get("status");
  const limit = parseInt(params.get("limit") ?? "50", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);

  let query = supabase.from("patients").select("*", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (search)
    query = query.or(
      `name_en.ilike.%${search}%,name_ar.ilike.%${search}%,mrn.ilike.%${search}%`,
    );
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return fail(error.message);
  return ok({ patients: mapRows((data ?? []) as Row[]), total: count ?? 0 });
}

async function handleGetPatient(id: string): Promise<Response> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return fail(error.message, 404);
  return ok(mapRow(data as Row));
}

async function handleCreatePatient(body: Row): Promise<Response> {
  const mrn = await nextMRN();
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...toSnake(body), mrn })
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdatePatient(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("patients")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Patient summary & sub-routes ────────────────────────────────────────────

async function handleGetPatientSummary(id: string): Promise<Response> {
  const [
    { data: pt },
    { data: notes },
    { data: rx },
    { data: labs },
    { data: growth },
  ] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).single(),
    supabase
      .from("clinical_notes")
      .select("*")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", id)
      .eq("status", "active")
      .limit(5),
    supabase
      .from("lab_orders")
      .select("*")
      .eq("patient_id", id)
      .eq("is_critical", true)
      .limit(3),
    supabase
      .from("growth_records")
      .select("*")
      .eq("patient_id", id)
      .order("measurement_date", { ascending: false })
      .limit(1),
  ]);

  let unitNameEn: string | null = null;
  let unitNameAr: string | null = null;
  const unitId = (pt as Row | null)?.unit_id;
  if (unitId) {
    const { data: unit } = await supabase
      .from("units")
      .select("name_en,name_ar")
      .eq("id", unitId)
      .single();
    unitNameEn = (unit as Row | null)?.name_en as string | null;
    unitNameAr = (unit as Row | null)?.name_ar as string | null;
  }

  return ok({
    patient: pt ? mapRow(pt as Row) : null,
    recentNotes: mapRows((notes ?? []) as Row[]),
    activePrescriptions: mapRows((rx ?? []) as Row[]),
    criticalLabs: mapRows((labs ?? []) as Row[]),
    latestGrowth: growth?.[0] ? mapRow(growth[0] as Row) : null,
    unitNameEn,
    unitNameAr,
  });
}

async function handleGetPatientUnit(id: string): Promise<Response> {
  const { data: pt } = await supabase
    .from("patients")
    .select("unit_id")
    .eq("id", id)
    .single();
  if (!(pt as Row | null)?.unit_id)
    return ok({ unitId: null, unitNameEn: null, unitNameAr: null });
  const { data: unit } = await supabase
    .from("units")
    .select("*")
    .eq("id", (pt as Row).unit_id)
    .single();
  return ok(unit ? mapRow(unit as Row) : { unitId: null });
}

// ─── Admission assessments ───────────────────────────────────────────────────

async function handleGetAssessments(patientId: string): Promise<Response> {
  const { data, error } = await supabase
    .from("admission_assessments")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleGetOneAssessment(patientId: string): Promise<Response> {
  const { data, error } = await supabase
    .from("admission_assessments")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return fail(error.message, 404);
  return ok(mapRow(data as Row));
}

async function handleCreateAssessment(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("admission_assessments")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateAssessment(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("admission_assessments")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Appointments ────────────────────────────────────────────────────────────

async function handleGetAppointments(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("appointments")
    .select("*")
    .order("appointment_date", { ascending: false });
  const date = params.get("date");
  if (date) query = query.eq("appointment_date", date);
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const status = params.get("status");
  if (status) query = query.eq("status", status);
  const limit = params.get("limit");
  if (limit) query = query.limit(parseInt(limit, 10));
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateAppointment(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("appointments")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateAppointment(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("appointments")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Lab orders ──────────────────────────────────────────────────────────────

async function handleGetLabOrders(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("lab_orders")
    .select("*")
    .order("order_date", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const status = params.get("status");
  if (status) query = query.eq("status", status);
  const limit = params.get("limit");
  if (limit) query = query.limit(parseInt(limit, 10));
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateLabOrder(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("lab_orders")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateLabOrder(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("lab_orders")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

async function handleGetPrescriptions(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("prescriptions")
    .select("*")
    .order("prescription_date", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const status = params.get("status");
  if (status) query = query.eq("status", status);
  const limit = params.get("limit");
  if (limit) query = query.limit(parseInt(limit, 10));
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreatePrescription(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("prescriptions")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdatePrescription(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("prescriptions")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Drugs / Pharmacy ────────────────────────────────────────────────────────

async function handleGetDrugs(params: URLSearchParams): Promise<Response> {
  let query = supabase.from("drugs").select("*").order("name");
  const search = params.get("search");
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  if (error) return fail(error.message);
  const rows = mapRows((data ?? []) as Row[]);
  if (params.get("lowStock") === "true")
    return ok(rows.filter((r) => Number(r.stock ?? 0) < Number(r.minStock ?? 10)));
  return ok(rows);
}

async function handleCreateDrug(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("drugs")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateDrug(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("drugs")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Invoices / Billing ──────────────────────────────────────────────────────

async function handleGetInvoices(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("invoices")
    .select("*")
    .order("invoice_date", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const status = params.get("status");
  if (status) query = query.eq("status", status);
  const limit = params.get("limit");
  if (limit) query = query.limit(parseInt(limit, 10));
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateInvoice(body: Row): Promise<Response> {
  const invoiceNumber = await nextInvoiceNumber();
  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...toSnake(body), invoice_number: invoiceNumber })
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateInvoice(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("invoices")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Vaccinations ────────────────────────────────────────────────────────────

async function handleGetVaccinations(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("vaccinations")
    .select("*")
    .order("administered_date", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateVaccination(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("vaccinations")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

// ─── Growth records ──────────────────────────────────────────────────────────

async function handleGetGrowthRecords(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("growth_records")
    .select("*")
    .order("measurement_date", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) return fail(error.message);

  const rows = mapRows((data ?? []) as Row[]);
  const ids = [...new Set(rows.map((r) => r.patientId as number).filter(Boolean))];
  const ptMap: Record<number, { name: string; dob: string; gender: string }> = {};
  if (ids.length > 0) {
    const { data: pd } = await supabase
      .from("patients")
      .select("id,name_en,date_of_birth,gender")
      .in("id", ids);
    for (const p of pd ?? [])
      ptMap[p.id] = { name: p.name_en, dob: p.date_of_birth, gender: p.gender };
  }
  return ok(
    rows.map((r) => {
      const pt = ptMap[r.patientId as number];
      return {
        ...r,
        patientName: pt?.name ?? null,
        patientDob: pt?.dob ?? null,
        patientGender: pt?.gender ?? null,
      };
    }),
  );
}

async function handleCreateGrowthRecord(body: Row): Promise<Response> {
  const { data: pt } = await supabase
    .from("patients")
    .select("date_of_birth,gender")
    .eq("id", body.patientId)
    .single();

  const weight = body.weight ? Number(body.weight) : null;
  const height = body.height ? Number(body.height) : null;
  const muac = body.muac ? Number(body.muac) : null;
  let bmi: number | null = null;
  if (weight && height) {
    const hm = height / 100;
    bmi = Math.round((weight / (hm * hm)) * 100) / 100;
  }

  const insertData: Row = {
    ...toSnake(body),
    ...(bmi !== null ? { bmi: bmi.toString() } : {}),
    ...(muac !== null ? { muac: muac.toString() } : {}),
  };

  const { data, error } = await supabase
    .from("growth_records")
    .insert(insertData)
    .select()
    .single();
  if (error) return fail(error.message);

  const row = mapRow(data as Row);
  return ok({ ...row, muac, bmi, patientDob: (pt as Row | null)?.date_of_birth ?? null, patientGender: (pt as Row | null)?.gender ?? null }, 201);
}

// ─── Radiology ───────────────────────────────────────────────────────────────

async function handleGetRadiologyOrders(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("radiology_orders")
    .select("*")
    .order("order_date", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const status = params.get("status");
  if (status) query = query.eq("status", status);
  const limit = params.get("limit");
  if (limit) query = query.limit(parseInt(limit, 10));
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateRadiologyOrder(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("radiology_orders")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateRadiologyOrder(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("radiology_orders")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Clinical notes ──────────────────────────────────────────────────────────

async function handleGetClinicalNotes(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("clinical_notes")
    .select("*")
    .order("created_at", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const type = params.get("type");
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateClinicalNote(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("clinical_notes")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateClinicalNote(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("clinical_notes")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Diagnoses ───────────────────────────────────────────────────────────────

async function handleGetDiagnoses(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("diagnoses")
    .select("*")
    .order("created_at", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateDiagnosis(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("diagnoses")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

// ─── Staff ───────────────────────────────────────────────────────────────────

async function handleGetStaff(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("users")
    .select("id,username,name_en,name_ar,role,department,unit_id,email,phone,avatar_url,created_at")
    .order("name_en");
  const role = params.get("role");
  if (role) query = query.eq("role", role);
  const department = params.get("department");
  if (department) query = query.eq("department", department);
  const search = params.get("search");
  if (search)
    query = query.or(`name_en.ilike.%${search}%,name_ar.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateStaff(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("users")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

async function handleUpdateStaff(id: string, body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("users")
    .update(toSnake(body))
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row));
}

// ─── Units ───────────────────────────────────────────────────────────────────

async function handleGetUnits(): Promise<Response> {
  const { data, error } = await supabase.from("units").select("*").order("name_en");
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

// ─── Discharge summaries ─────────────────────────────────────────────────────

async function handleGetDischargeSummaries(params: URLSearchParams): Promise<Response> {
  let query = supabase
    .from("discharge_summaries")
    .select("*")
    .order("created_at", { ascending: false });
  const patientId = params.get("patientId");
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(mapRows((data ?? []) as Row[]));
}

async function handleCreateDischargeSummary(body: Row): Promise<Response> {
  const { data, error } = await supabase
    .from("discharge_summaries")
    .insert(toSnake(body))
    .select()
    .single();
  if (error) return fail(error.message);
  return ok(mapRow(data as Row), 201);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

async function handleDashboardStats(): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const [
    { count: totalPatients },
    { count: activeAdmissions },
    { count: pendingLabs },
    { count: pendingRx },
    { data: invoices },
    { count: criticalAlerts },
    { data: todayAppts },
    { data: beds },
  ] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("status", "admitted"),
    supabase
      .from("lab_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("prescriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("invoices").select("amount"),
    supabase
      .from("lab_orders")
      .select("*", { count: "exact", head: true })
      .eq("is_critical", true)
      .eq("status", "resulted"),
    supabase.from("appointments").select("*").eq("appointment_date", today),
    supabase
      .from("units")
      .select("id,name_en,bed_capacity,occupied_beds"),
  ]);

  const totalRevenue = (invoices ?? []).reduce(
    (s: number, r: Row) => s + Number(r.amount || 0),
    0,
  );
  const bedOccupancy = (beds ?? []).map((u: Row) => ({
    unitId: u.id,
    unitName: u.name_en,
    total: Number(u.bed_capacity ?? 0),
    occupied: Number(u.occupied_beds ?? 0),
  }));

  return ok({
    totalPatients: totalPatients ?? 0,
    activeAdmissions: activeAdmissions ?? 0,
    todayAppointments: (todayAppts ?? []).length,
    pendingLabOrders: pendingLabs ?? 0,
    pendingPrescriptions: pendingRx ?? 0,
    totalRevenue,
    criticalAlerts: criticalAlerts ?? 0,
    bedOccupancy,
  });
}

async function handleDashboardActivity(): Promise<Response> {
  const { data } = await supabase
    .from("patients")
    .select("id,name_en,created_at,status")
    .order("created_at", { ascending: false })
    .limit(5);
  return ok(
    (data ?? []).map((p: Row) => ({
      type: "patient_registered",
      patientId: p.id,
      patientName: p.name_en,
      timestamp: p.created_at,
    })),
  );
}

async function handleDashboardAlerts(): Promise<Response> {
  const [{ data: critLabs }, { data: allDrugs }] = await Promise.all([
    supabase
      .from("lab_orders")
      .select("id,test_name,patient_id")
      .eq("is_critical", true)
      .eq("status", "resulted")
      .limit(5),
    supabase.from("drugs").select("id,name,stock,min_stock"),
  ]);
  const lowStock = (allDrugs ?? []).filter(
    (d: Row) => Number(d.stock ?? 0) < Number(d.min_stock ?? 10),
  );
  return ok([
    ...(critLabs ?? []).map((l: Row) => ({
      type: "critical_lab",
      message: `Critical result: ${l.test_name}`,
      id: l.id,
    })),
    ...lowStock.slice(0, 5).map((d: Row) => ({
      type: "low_stock",
      message: `Low stock: ${d.name}`,
      id: d.id,
    })),
  ]);
}

async function handleDashboardRevenue(): Promise<Response> {
  const { data } = await supabase
    .from("invoices")
    .select("amount,paid_amount,status,payment_method,invoice_date");
  const rows = (data ?? []) as Row[];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalRevenue = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const paidRevenue = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.paid_amount || r.amount || 0), 0);
  const pendingRevenue = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const thisMonthRevenue = rows
    .filter((r) => String(r.invoice_date ?? "").startsWith(thisMonth))
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const byMethod: Record<string, number> = {};
  for (const r of rows) {
    const m = (r.payment_method as string) ?? "unknown";
    byMethod[m] = (byMethod[m] ?? 0) + Number(r.amount || 0);
  }
  return ok({
    totalRevenue,
    paidRevenue,
    pendingRevenue,
    thisMonth: thisMonthRevenue,
    lastMonth: 0,
    byPaymentMethod: Object.entries(byMethod).map(([method, amount]) => ({
      method,
      amount,
    })),
  });
}

// ─── Main router ─────────────────────────────────────────────────────────────

async function route(req: Request): Promise<Response> {
  const u = new URL(req.url, "http://x");
  const path = u.pathname.replace(/\/$/, "");
  const method = req.method.toUpperCase();
  const params = u.searchParams;
  let body: Row = {};
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = (await req.clone().json()) as Row;
    } catch {
      /* no body */
    }
  }

  // Auth
  if (path === "/api/auth/login" && method === "POST") return handleLogin(body);
  if (path === "/api/auth/me" && method === "GET") return handleGetMe();
  if (path === "/api/health") return ok({ status: "ok" });

  // Dashboard
  if (path === "/api/dashboard/stats") return handleDashboardStats();
  if (path === "/api/dashboard/recent-activity") return handleDashboardActivity();
  if (path === "/api/dashboard/alerts") return handleDashboardAlerts();
  if (path === "/api/dashboard/revenue") return handleDashboardRevenue();

  // Units
  if (path === "/api/units" && method === "GET") return handleGetUnits();

  // Patient sub-routes (order matters — must match before /patients/:id)
  const ptSummary = path.match(/^\/api\/patients\/(\d+)\/summary$/);
  if (ptSummary && method === "GET") return handleGetPatientSummary(ptSummary[1]);

  const ptUnit = path.match(/^\/api\/patients\/(\d+)\/unit$/);
  if (ptUnit && method === "GET") return handleGetPatientUnit(ptUnit[1]);

  const ptAssessments = path.match(/^\/api\/patients\/(\d+)\/assessments$/);
  if (ptAssessments && method === "GET") return handleGetAssessments(ptAssessments[1]);

  const ptAssessment = path.match(/^\/api\/patients\/(\d+)\/assessment$/);
  if (ptAssessment && method === "GET") return handleGetOneAssessment(ptAssessment[1]);

  // Patients CRUD
  if (path === "/api/patients" && method === "GET") return handleGetPatients(params);
  if (path === "/api/patients" && method === "POST") return handleCreatePatient(body);
  const ptMatch = path.match(/^\/api\/patients\/(\d+)$/);
  if (ptMatch && method === "GET") return handleGetPatient(ptMatch[1]);
  if (ptMatch && method === "PATCH") return handleUpdatePatient(ptMatch[1], body);

  // Admission assessments
  if (path === "/api/admission-assessments" && method === "POST")
    return handleCreateAssessment(body);
  const assessMatch = path.match(/^\/api\/admission-assessments\/(\d+)$/);
  if (assessMatch && method === "PATCH") return handleUpdateAssessment(assessMatch[1], body);

  // Appointments
  if (path === "/api/appointments" && method === "GET") return handleGetAppointments(params);
  if (path === "/api/appointments" && method === "POST") return handleCreateAppointment(body);
  const apptMatch = path.match(/^\/api\/appointments\/(\d+)$/);
  if (apptMatch && method === "PATCH") return handleUpdateAppointment(apptMatch[1], body);

  // Lab orders
  if (path === "/api/lab-orders" && method === "GET") return handleGetLabOrders(params);
  if (path === "/api/lab-orders" && method === "POST") return handleCreateLabOrder(body);
  const labMatch = path.match(/^\/api\/lab-orders\/(\d+)$/);
  if (labMatch && method === "PATCH") return handleUpdateLabOrder(labMatch[1], body);

  // Prescriptions
  if (path === "/api/prescriptions" && method === "GET") return handleGetPrescriptions(params);
  if (path === "/api/prescriptions" && method === "POST") return handleCreatePrescription(body);
  const rxMatch = path.match(/^\/api\/prescriptions\/(\d+)$/);
  if (rxMatch && method === "PATCH") return handleUpdatePrescription(rxMatch[1], body);

  // Drugs
  if (path === "/api/drugs" && method === "GET") return handleGetDrugs(params);
  if (path === "/api/drugs" && method === "POST") return handleCreateDrug(body);
  const drugMatch = path.match(/^\/api\/drugs\/(\d+)$/);
  if (drugMatch && method === "PATCH") return handleUpdateDrug(drugMatch[1], body);

  // Invoices
  if (path === "/api/invoices" && method === "GET") return handleGetInvoices(params);
  if (path === "/api/invoices" && method === "POST") return handleCreateInvoice(body);
  const invMatch = path.match(/^\/api\/invoices\/(\d+)$/);
  if (invMatch && method === "PATCH") return handleUpdateInvoice(invMatch[1], body);

  // Vaccinations
  if (path === "/api/vaccinations" && method === "GET") return handleGetVaccinations(params);
  if (path === "/api/vaccinations" && method === "POST") return handleCreateVaccination(body);

  // Growth records
  if (path === "/api/growth-records" && method === "GET") return handleGetGrowthRecords(params);
  if (path === "/api/growth-records" && method === "POST") return handleCreateGrowthRecord(body);

  // Radiology
  if (path === "/api/radiology-orders" && method === "GET") return handleGetRadiologyOrders(params);
  if (path === "/api/radiology-orders" && method === "POST") return handleCreateRadiologyOrder(body);
  const radioMatch = path.match(/^\/api\/radiology-orders\/(\d+)$/);
  if (radioMatch && method === "PATCH") return handleUpdateRadiologyOrder(radioMatch[1], body);

  // Clinical notes
  if (path === "/api/clinical-notes" && method === "GET") return handleGetClinicalNotes(params);
  if (path === "/api/clinical-notes" && method === "POST") return handleCreateClinicalNote(body);
  const noteMatch = path.match(/^\/api\/clinical-notes\/(\d+)$/);
  if (noteMatch && method === "PATCH") return handleUpdateClinicalNote(noteMatch[1], body);

  // Diagnoses
  if (path === "/api/diagnoses" && method === "GET") return handleGetDiagnoses(params);
  if (path === "/api/diagnoses" && method === "POST") return handleCreateDiagnosis(body);

  // Staff
  if (path === "/api/staff" && method === "GET") return handleGetStaff(params);
  if (path === "/api/staff" && method === "POST") return handleCreateStaff(body);
  const staffMatch = path.match(/^\/api\/staff\/(\d+)$/);
  if (staffMatch && method === "PATCH") return handleUpdateStaff(staffMatch[1], body);

  // Discharge summaries
  if (path === "/api/discharge-summaries" && method === "GET")
    return handleGetDischargeSummaries(params);
  if (path === "/api/discharge-summaries" && method === "POST")
    return handleCreateDischargeSummary(body);

  return fail(`Not found: ${method} ${path}`, 404);
}

// ─── Activation ──────────────────────────────────────────────────────────────

export function activateSupabaseInterceptor(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    if (url.startsWith("/api/")) {
      try {
        return await route(new Request(url, init));
      } catch (e) {
        return fail(String(e));
      }
    }

    return originalFetch(input, init);
  };

  console.info("[Almuzini EHR] Tauri mode: API calls routed directly to Supabase");
}
