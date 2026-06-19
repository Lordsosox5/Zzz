import { Router } from "express";
import { supabase, mapRow } from "../lib/supabase";
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
    email: u.email ?? null,
    phone: u.phone ?? null,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  const { data: user, error } = await supabase
    .from("users")
    .select()
    .eq("username", username)
    .maybeSingle();
  if (error) {
    logger.error({ error }, "DB error in /auth/login");
    res.status(500).json({ error: error.message });
    return;
  }
  if (!user || user.password !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString("base64");
  res.json({ token, user: formatUser(mapRow(user)) });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    const { data: user, error } = await supabase
      .from("users")
      .select()
      .eq("id", parseInt(userId, 10))
      .maybeSingle();
    if (error || !user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(mapRow(user)));
  } catch (err) {
    logger.error({ err }, "Error in /auth/me");
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
