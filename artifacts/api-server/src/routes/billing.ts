import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, invoicesTable, patientsTable } from "@workspace/db";
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

function mapInvoice(inv: typeof invoicesTable.$inferSelect, patientName?: string | null) {
  const items = Array.isArray(inv.items) ? inv.items : [];
  return {
    ...inv,
    patientName: patientName ?? null,
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    discount: Number(inv.discount),
    items,
    createdAt: inv.createdAt.toISOString(),
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const params = ListInvoicesQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const conditions = [];
  if (params.data.patientId) conditions.push(eq(invoicesTable.patientId, params.data.patientId));
  if (params.data.status) conditions.push(eq(invoicesTable.status, params.data.status));
  const results = conditions.length
    ? await db.select().from(invoicesTable).where(and(...conditions)).orderBy(invoicesTable.createdAt)
    : await db.select().from(invoicesTable).orderBy(invoicesTable.createdAt);
  res.json(results.map(inv => mapInvoice(inv)));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const items = parsed.data.items ?? [];
  const totalAmount = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
  const invoiceNumber = generateInvoiceNumber();
  const [inv] = await db.insert(invoicesTable).values({
    ...parsed.data,
    invoiceNumber,
    totalAmount: totalAmount.toFixed(2),
    items: items as never,
  }).returning();
  res.status(201).json(mapInvoice(inv));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(mapInvoice(inv));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.status) updateData.status = parsed.data.status;
  if (parsed.data.paidAmount !== undefined) updateData.paidAmount = parsed.data.paidAmount.toFixed(2);
  if (parsed.data.notes) updateData.notes = parsed.data.notes;
  const [inv] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(mapInvoice(inv));
});

export default router;
