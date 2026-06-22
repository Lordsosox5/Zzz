import { Router } from "express";
import { db, invoicesTable, patientsTable } from "../lib/db";
import { eq, inArray } from "drizzle-orm";
import {
  ListInvoicesQueryParams,
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
} from "@workspace/api-zod";

const router = Router();

let invoiceCounter = 100;

export async function initInvoiceCounter(): Promise<void> {
  try {
    const rows = await db.select({ invoiceNumber: invoicesTable.invoiceNumber }).from(invoicesTable).orderBy(invoicesTable.id).limit(1);
    const raw = rows[0]?.invoiceNumber;
    if (raw) {
      const num = parseInt(String(raw).replace(/\D/g, "").slice(-5), 10);
      if (!isNaN(num) && num > invoiceCounter) invoiceCounter = num;
    }
  } catch { }
}

function generateInvoiceNumber(): string {
  return `INV-${new Date().getFullYear()}-${String(++invoiceCounter).padStart(5, "0")}`;
}

function normalizeItem(item: Record<string, unknown>) {
  return {
    description: (item.description ?? item.name ?? "") as string,
    quantity: Number(item.quantity ?? item.qty ?? 1),
    unitPrice: Number(item.unitPrice ?? item.price ?? 0),
    total: Number(item.total ?? 0),
  };
}

function formatInvoice(row: typeof invoicesTable.$inferSelect, patientName?: string | null) {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    ...row,
    patientName: patientName !== undefined ? patientName : null,
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
    const conditions: ReturnType<typeof eq>[] = [];
    if (params.data.patientId) conditions.push(eq(invoicesTable.patientId, params.data.patientId));
    if (params.data.status) conditions.push(eq(invoicesTable.status, params.data.status));
    const rows = conditions.length > 0
      ? await db.select().from(invoicesTable).where(conditions.reduce((a, b) => a && b as any))
      : await db.select().from(invoicesTable);

    const patientIds = [...new Set(rows.map(r => r.patientId).filter(Boolean))];
    let patientNameMap: Record<number, string> = {};
    if (patientIds.length > 0) {
      const pts = await db.select({ id: patientsTable.id, nameEn: patientsTable.nameEn }).from(patientsTable).where(inArray(patientsTable.id, patientIds));
      for (const p of pts) patientNameMap[p.id] = p.nameEn;
    }
    res.json(rows.map(row => formatInvoice(row, patientNameMap[row.patientId] ?? null)));
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
    const invoiceNumber = generateInvoiceNumber();
    const ptRows = await db.select({ nameEn: patientsTable.nameEn }).from(patientsTable).where(eq(patientsTable.id, parsed.data.patientId)).limit(1);
    const patientName: string | null = ptRows[0]?.nameEn ?? null;
    const rows = await db.insert(invoicesTable).values({
      ...parsed.data,
      invoiceNumber,
      totalAmount,
      items: parsed.data.items as any,
    }).returning();
    res.status(201).json(formatInvoice(rows[0], patientName));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Invoice not found" }); return; }
    const row = rows[0];
    const ptRows = await db.select({ nameEn: patientsTable.nameEn }).from(patientsTable).where(eq(patientsTable.id, row.patientId)).limit(1);
    const patientName = ptRows[0]?.nameEn ?? null;
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
    if (parsed.data.paidAmount !== undefined) updates.paidAmount = parsed.data.paidAmount.toFixed(2);
    if (parsed.data.notes) updates.notes = parsed.data.notes;
    const rows = await db.update(invoicesTable).set(updates as any).where(eq(invoicesTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Invoice not found" }); return; }
    const row = rows[0];
    const ptRows = await db.select({ nameEn: patientsTable.nameEn }).from(patientsTable).where(eq(patientsTable.id, row.patientId)).limit(1);
    const patientName = ptRows[0]?.nameEn ?? null;
    res.json(formatInvoice(row, patientName));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
