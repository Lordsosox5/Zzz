import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || user.password !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString("base64");
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      nameEn: user.nameEn,
      nameAr: user.nameAr ?? null,
      role: user.role,
      department: user.department ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
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
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(userId, 10)));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      nameEn: user.nameEn,
      nameAr: user.nameAr ?? null,
      role: user.role,
      department: user.department ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Error in /auth/me");
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
