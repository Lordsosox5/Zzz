import { Router } from "express";
import { eq, ilike, lte } from "drizzle-orm";
import { db, drugsTable } from "@workspace/db";
import {
  ListDrugsQueryParams,
  CreateDrugBody,
  UpdateDrugParams,
  UpdateDrugBody,
} from "@workspace/api-zod";

const router = Router();

function mapDrug(d: typeof drugsTable.$inferSelect) {
  return {
    ...d,
    unitPrice: Number(d.unitPrice),
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/drugs", async (req, res): Promise<void> => {
  const params = ListDrugsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  let results;
  if (params.data.search) {
    results = await db.select().from(drugsTable).where(ilike(drugsTable.name, `%${params.data.search}%`));
  } else if (params.data.lowStock) {
    results = await db.select().from(drugsTable).where(lte(drugsTable.stockQuantity, drugsTable.minStockLevel));
  } else {
    results = await db.select().from(drugsTable).orderBy(drugsTable.name);
  }
  res.json(results.map(mapDrug));
});

router.post("/drugs", async (req, res): Promise<void> => {
  const parsed = CreateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [drug] = await db.insert(drugsTable).values({
    ...parsed.data,
    unitPrice: parsed.data.unitPrice?.toFixed(2) ?? "0.00",
  }).returning();
  res.status(201).json(mapDrug(drug));
});

router.patch("/drugs/:id", async (req, res): Promise<void> => {
  const params = UpdateDrugParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDrugBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.unitPrice !== undefined) updateData.unitPrice = parsed.data.unitPrice.toFixed(2);
  const [drug] = await db.update(drugsTable).set(updateData).where(eq(drugsTable.id, params.data.id)).returning();
  if (!drug) { res.status(404).json({ error: "Drug not found" }); return; }
  res.json(mapDrug(drug));
});

export default router;
