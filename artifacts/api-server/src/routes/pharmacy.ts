import { Router } from "express";
import { db, drugsTable } from "../lib/db";
import { eq, ilike, asc, lte } from "drizzle-orm";
import {
  ListDrugsQueryParams,
  CreateDrugBody,
  UpdateDrugParams,
  UpdateDrugBody,
} from "@workspace/api-zod";

const router = Router();

function formatDrug(row: Record<string, unknown>) {
  return { ...row, unitPrice: Number(row.unitPrice ?? 0) };
}

router.get("/drugs", async (req, res): Promise<void> => {
  const params = ListDrugsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    if (params.data.lowStock) {
      const allDrugs = await db.select().from(drugsTable);
      const lowStock = allDrugs.filter(
        (d) => Number(d.stockQuantity) <= Number(d.minStockLevel)
      );
      res.json(lowStock.map((d) => formatDrug(d as unknown as Record<string, unknown>)));
      return;
    }
    let query = db.select().from(drugsTable);
    if (params.data.search) {
      query = query.where(ilike(drugsTable.name, `%${params.data.search}%`)) as typeof query;
    } else {
      query = query.orderBy(asc(drugsTable.name)) as typeof query;
    }
    const data = await query;
    res.json(data.map((d) => formatDrug(d as unknown as Record<string, unknown>)));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/drugs", async (req, res): Promise<void> => {
  const parsed = CreateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db
      .insert(drugsTable)
      .values({ ...parsed.data, unitPrice: parsed.data.unitPrice?.toFixed(2) ?? "0.00" })
      .returning();
    res.status(201).json(formatDrug(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/drugs/:id", async (req, res): Promise<void> => {
  const params = UpdateDrugParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.unitPrice !== undefined) updates.unitPrice = (parsed.data.unitPrice as number).toFixed(2);
    const rows = await db
      .update(drugsTable)
      .set(updates)
      .where(eq(drugsTable.id, params.data.id))
      .returning();
    if (!rows[0]) { res.status(404).json({ error: "Drug not found" }); return; }
    res.json(formatDrug(rows[0] as unknown as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
