import { Router } from "express";
import { db, drugsTable } from "@workspace/db";
import { eq, ilike, lte, asc, sql } from "drizzle-orm";
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
      const lowStock = allDrugs.filter((d) => d.stockQuantity <= d.minStockLevel);
      res.json(lowStock.map(formatDrug));
      return;
    }
    let query = db.select().from(drugsTable).$dynamic();
    if (params.data.search) {
      query = query.where(ilike(drugsTable.name, `%${params.data.search}%`));
    } else {
      query = query.orderBy(asc(drugsTable.name));
    }
    const data = await query;
    res.json(data.map(formatDrug));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/drugs", async (req, res): Promise<void> => {
  const parsed = CreateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [drug] = await db
      .insert(drugsTable)
      .values({ ...parsed.data as any, unitPrice: parsed.data.unitPrice?.toFixed(2) ?? "0.00" })
      .returning();
    res.status(201).json(formatDrug(drug));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
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
    const [drug] = await db.update(drugsTable).set(updates as any).where(eq(drugsTable.id, params.data.id)).returning();
    if (!drug) { res.status(404).json({ error: "Drug not found" }); return; }
    res.json(formatDrug(drug));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
