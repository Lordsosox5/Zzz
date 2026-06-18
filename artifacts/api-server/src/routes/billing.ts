import { Router } from "express";
import { db } from "../lib/db";
import { invoicesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
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

function formatInvoice(row: typeof invoicesTable.$inferSelect) {
  return {
    ...row,
    patientName: null,
    totalAmount: Number(row.totalAmount),
    paidAmount: Number(row.paidAmount),
    discount: Number(row.discount ?? 0),
    items: Array.isArray(row.items) ? row.items : [],
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const params = ListInvoicesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    let query = db.select().from(invoicesTable).$dynamic();
    if (params.data.patientId) query = query.where(eq(invoicesTable.patientId, params.data.patientId));
    if (params.data.status) query = query.where(eq(invoicesTable.status, params.data.status));
    const rows = await query.orderBy(asc(invoicesTable.createdAt));
    res.json(rows.map(formatInvoice));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const items = parsed.data.items ?? [];
  const totalAmount = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
  const invoiceNumber = generateInvoiceNumber();
  try {
    const [row] = await db.insert(invoicesTable).values({
      ...parsed.data,
      invoiceNumber,
      totalAmount: totalAmount.toFixed(2),
      items: items as unknown[],
    }).returning();
    res.status(201).json(formatInvoice(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
    if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json(formatInvoice(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: Record<string, unknown> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.paidAmount !== undefined) updates.paidAmount = parsed.data.paidAmount.toFixed(2);
  if (parsed.data.notes) updates.notes = parsed.data.notes;
  try {
    const [row] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json(formatInvoice(row));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

export default router;
