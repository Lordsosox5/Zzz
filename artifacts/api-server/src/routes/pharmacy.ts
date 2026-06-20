import { Router } from "express";
import { db, drugsTable } from "../lib/db";
import {
  ListDrugsQueryParams,
  CreateDrugBody,
  UpdateDrugParams,
  UpdateDrugBody,
} from "@workspace/api-zod";
import { eq, ilike, SQL } from "drizzle-orm";
import type { Drug } from "@workspace/db";

const router = Router();

function formatDrug(row: Drug) {
  return { ...row, unitPrice: Number(row.unitPrice ?? 0) };
}

router.get("/drugs", async (req, res): Promise<void> => {
  const params = ListDrugsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    if (params.data.lowStock) {
      const all = await db.select().from(drugsTable);
      res.json(all.filter(d => Number(d.stockQuantity) <= Number(d.minStockLevel)).map(formatDrug));
      return;
    }
    const rows = params.data.search
      ? await db.select().from(drugsTable).where(ilike(drugsTable.name, `%${params.data.search}%`))
      : await db.select().from(drugsTable);
    res.json(rows.map(formatDrug));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/drugs", async (req, res): Promise<void> => {
  const parsed = CreateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const rows = await db.insert(drugsTable).values({
      ...parsed.data,
      unitPrice: parsed.data.unitPrice?.toFixed(2) ?? "0.00",
    } as any).returning();
    res.status(201).json(formatDrug(rows[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/drugs/:id", async (req, res): Promise<void> => {
  const params = UpdateDrugParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.unitPrice !== undefined) updates.unitPrice = parsed.data.unitPrice.toFixed(2);
    const rows = await db.update(drugsTable).set(updates as any).where(eq(drugsTable.id, params.data.id)).returning();
    if (!rows[0]) { res.status(404).json({ error: "Drug not found" }); return; }
    res.json(formatDrug(rows[0]));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
