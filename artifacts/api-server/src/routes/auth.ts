import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "../lib/db";
import { LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
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
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
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
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId] = decoded.split(":");
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(userId, 10)))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    logger.error({ err }, "Error in /auth/me");
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
