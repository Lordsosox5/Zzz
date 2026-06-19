import { Router } from "express";
import { db, invoicesTable } from "../lib/db";
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

function formatInvoice(row: Record<string, unknown>) {
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
    let query = db.select().from(invoicesTable).orderBy(asc(invoicesTable.createdAt));
    if (params.data.patientId) {
      query = query.where(eq(invoicesTable.patientId, params.data.patientId)) as typeof query;
    }
    const data = await query;
    res.json(data.map((r) => formatInvoice(r as unknown as Record<string, unknown>)));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const items = (parsed.data.items ?? []) as Array<{ total: number }>;
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const invoiceNumber = generateInvoiceNumber();
    const rows = await db
      .insert(invoicesTable)
      .values({
        ...parsed.data,
        invoiceNumber,
        totalAmount: totalAmount.toFixed(2),
        items: parsed.data.items ?? [],
      })
      .returning();
    res.status(201).json(formatInvoice(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const rows = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json(formatInvoice(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.paidAmount !== undefined) updates.paidAmount = parsed.data.paidAmount.toFixed(2);
    if (parsed.data.notes) updates.notes = parsed.data.notes;
    const rows = await db
      .update(invoicesTable)
      .set(updates)
      .where(eq(invoicesTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json(formatInvoice(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
