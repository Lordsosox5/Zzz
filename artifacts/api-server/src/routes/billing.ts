import { Router } from "express";
import { supabase, mapRow, mapRows, dbError, toSnake } from "../lib/supabase";
import {
  ListInvoicesQueryParams,
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
} from "@workspace/api-zod";

const router = Router();

let invoiceCounter = 100;
function generateInvoiceNumber(): string {
  return `INV-${new Date().getFullYear()}-${String(++invoiceCounter).padStart(5, "0")}`;
}

function formatInvoice(row: Record<string, unknown>) {
  const mapped = mapRow(row);
  return {
    ...mapped,
    patientName: null,
    totalAmount: Number(mapped.totalAmount),
    paidAmount: Number(mapped.paidAmount),
    discount: Number(mapped.discount ?? 0),
    items: Array.isArray(mapped.items) ? mapped.items : [],
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const params = ListInvoicesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let query = supabase.from("invoices").select().order("created_at");
  if (params.data.patientId) query = query.eq("patient_id", params.data.patientId);
  if (params.data.status) query = query.eq("status", params.data.status);
  const { data, error } = await query;
  if (dbError(error, res)) return;
  res.json((data ?? []).map(formatInvoice));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const items = parsed.data.items ?? [];
  const totalAmount = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
  const invoiceNumber = generateInvoiceNumber();
  const snaked = toSnake(parsed.data as Record<string, unknown>);
  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...snaked, invoice_number: invoiceNumber, total_amount: totalAmount.toFixed(2) })
    .select()
    .single();
  if (dbError(error, res)) return;
  res.status(201).json(formatInvoice(data));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { data, error } = await supabase
    .from("invoices")
    .select()
    .eq("id", params.data.id)
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(formatInvoice(data));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: Record<string, unknown> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.paidAmount !== undefined) updates.paid_amount = parsed.data.paidAmount.toFixed(2);
  if (parsed.data.notes) updates.notes = parsed.data.notes;
  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", params.data.id)
    .select()
    .maybeSingle();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(formatInvoice(data));
});

export default router;
