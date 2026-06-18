import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, invoicesTable } from "../lib/db";
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
    const conditions = [];
    if (params.data.patientId) conditions.push(eq(invoicesTable.patientId, params.data.patientId));
    if (params.data.status) conditions.push(eq(invoicesTable.status, params.data.status));
    const query = db.select().from(invoicesTable).orderBy(asc(invoicesTable.createdAt));
    const data = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
    res.json(data.map(formatInvoice));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const items = (parsed.data.items ?? []) as Array<{ total: number }>;
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const invoiceNumber = generateInvoiceNumber();
    const [invoice] = await db
      .insert(invoicesTable)
      .values({ ...(parsed.data as any), invoiceNumber, totalAmount: totalAmount.toFixed(2) })
      .returning();
    res.status(201).json(formatInvoice(invoice));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json(formatInvoice(invoice));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
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
    const [invoice] = await db
      .update(invoicesTable)
      .set(updates)
      .where(eq(invoicesTable.id, params.data.id))
      .returning();
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json(formatInvoice(invoice));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
