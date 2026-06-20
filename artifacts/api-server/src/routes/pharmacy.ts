import { Router } from "express";
import { db, drugsTable } from "../lib/db";
import { eq, ilike } from "drizzle-orm";
import {
  ListDrugsQueryParams,
  CreateDrugBody,
  UpdateDrugParams,
  UpdateDrugBody,
} from "@workspace/api-zod";

const router = Router();

function formatDrug(row: typeof drugsTable.$inferSelect) {
  return { ...row, unitPrice: Number(row.unitPrice ?? 0) };
}

router.get("/drugs", async (req, res): Promise<void> => {
  const params = ListDrugsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    if (params.data.lowStock) {
      const allDrugs = await db.select().from(drugsTable);
      res.json(allDrugs.filter(d => Number(d.stockQuantity) <= Number(d.minStockLevel)).map(formatDrug));
      return;
    }
    let query = db.select().from(drugsTable).$dynamic();
    if (params.data.search) query = query.where(ilike(drugsTable.name, `%${params.data.search}%`));
    res.json((await query).map(formatDrug));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/drugs", async (req, res): Promise<void> => {
  const parsed = CreateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [data] = await db.insert(drugsTable).values({
      ...parsed.data,
      unitPrice: parsed.data.unitPrice?.toFixed(2) ?? "0.00",
    }).returning();
    res.status(201).json(formatDrug(data));
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
    const [data] = await db.update(drugsTable).set(updates).where(eq(drugsTable.id, params.data.id)).returning();
    if (!data) { res.status(404).json({ error: "Drug not found" }); return; }
    res.json(formatDrug(data));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
