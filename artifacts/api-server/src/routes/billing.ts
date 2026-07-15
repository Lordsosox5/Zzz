import { Router } from "express";
import { supabase, mapRow, mapRows, toSnake } from "../lib/supabase";
import {
  ListInvoicesQueryParams,
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
} from "@workspace/api-zod";

const router = Router();

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { data } = await supabase.from("invoices").select("invoice_number");
  let max = 100;
  for (const row of data ?? []) {
    const raw = String(row.invoice_number ?? "");
    const num = parseInt(raw.replace(/\D/g, "").slice(-5), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return `INV-${year}-${String(max + 1).padStart(5, "0")}`;
}

function normalizeItem(item: Record<string, unknown>) {
  return {
    description: (item.description ?? item.name ?? "") as string,
    quantity: Number(item.quantity ?? item.qty ?? 1),
    unitPrice: Number(item.unitPrice ?? item.price ?? 0),
    total: Number(item.total ?? 0),
  };
}

function formatInvoice(row: Record<string, unknown>, patientName?: string | null) {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    ...row,
    patientName: patientName !== undefined ? patientName : ((row.patientName as string | null) ?? null),
    totalAmount: Number(row.totalAmount ?? 0),
    paidAmount: Number(row.paidAmount ?? 0),
    discount: Number(row.discount ?? 0),
    items: rawItems.map((item) => normalizeItem(item as Record<string, unknown>)),
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const params = ListInvoicesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = supabase.from("invoices").select("*");
    if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
    if (params.data.status) query = query.eq("status", params.data.status);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    const rows = mapRows(data ?? []);
    const missingNameIds = [...new Set(rows.filter(r => !r.patientName && r.patientId).map(r => r.patientId as number))];
    let patientNameMap: Record<number, string> = {};
    if (missingNameIds.length > 0) {
      const { data: pts } = await supabase.from("patients").select("id, name_en").in("id", missingNameIds);
      for (const p of pts ?? []) patientNameMap[p.id] = p.name_en;
    }
    res.json(rows.map(row => formatInvoice(row, (row.patientName as string | null) ?? patientNameMap[row.patientId as number] ?? null)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const items = parsed.data.items ?? [];
    const totalAmount = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0).toFixed(2);
    const invoiceNumber = await generateInvoiceNumber();
    const { data: patientRow } = await supabase.from("patients").select("name_en").eq("id", parsed.data.patientId).single();
    const patientName: string | null = patientRow?.name_en ?? null;
    const insertData = { ...toSnake(parsed.data as Record<string, unknown>), invoice_number: invoiceNumber, total_amount: totalAmount };
    const { data, error } = await supabase.from("invoices").insert(insertData).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(formatInvoice(mapRow(data), patientName));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const { data, error } = await supabase.from("invoices").select("*").eq("id", params.data.id).limit(1);
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data?.[0]) { res.status(404).json({ error: "Invoice not found" }); return; }
    const row = mapRow(data[0]);
    let patientName = (row.patientName as string | null) ?? null;
    if (!patientName && row.patientId) {
      const { data: pt } = await supabase.from("patients").select("name_en").eq("id", row.patientId).single();
      patientName = pt?.name_en ?? null;
    }
    res.json(formatInvoice(row, patientName));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.paidAmount !== undefined) updates.paid_amount = parsed.data.paidAmount.toFixed(2);
    if (parsed.data.notes) updates.notes = parsed.data.notes;
    const { data, error } = await supabase.from("invoices").update(updates).eq("id", params.data.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    if (!data) { res.status(404).json({ error: "Invoice not found" }); return; }
    const row = mapRow(data);
    let patientName: string | null = null;
    if (row.patientId) {
      const { data: pt } = await supabase.from("patients").select("name_en").eq("id", row.patientId).single();
      patientName = pt?.name_en ?? null;
    }
    res.json(formatInvoice(row, patientName));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
