import { Router } from "express";
import { supabase, mapRow, dbError } from "../lib/supabase";
import { LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

function formatUser(u: Record<string, unknown>) {
  return {
    id: u.id,
    username: u.username,
    nameEn: u.nameEn,
    nameAr: u.nameAr ?? null,
    role: u.role,
    department: u.department ?? null,
    unitId: u.unitId ?? null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { username, password } = parsed.data;
  try {
    const { data, error } = await supabase.from("users").select("*").eq("username", username).limit(1);
    if (dbError(error, res)) return;
    const raw = data?.[0];
    if (!raw || raw.password !== password) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const user = mapRow<Record<string, unknown>>(raw);
    const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString("base64");
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    logger.error({ err }, "DB error in /auth/login");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    const { data, error } = await supabase.from("users").select("*").eq("id", parseInt(userId, 10)).limit(1);
    if (dbError(error, res)) return;
    const raw = data?.[0];
    if (!raw) { res.status(401).json({ error: "User not found" }); return; }
    res.json(formatUser(mapRow<Record<string, unknown>>(raw)));
  } catch (err) {
    logger.error({ err }, "Error in /auth/me");
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
