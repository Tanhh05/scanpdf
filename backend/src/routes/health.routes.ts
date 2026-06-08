import { Router } from "express";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { storage } from "../services/storage.service.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", async (_req, res) => {
  const checks = {
    database: false,
    redis: false,
    storage: true,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error("Database health check failed", error);
  }

  try {
    const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    checks.redis = true;
  } catch (error) {
    console.error("Redis health check failed", error);
  }

  try {
    await storage.healthCheck();
    checks.storage = true;
  } catch (error) {
    checks.storage = false;
    console.error("Storage health check failed", error);
  }

  const ok = Object.values(checks).every(Boolean);
  res.status(ok ? 200 : 503).json({
    status: ok ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
