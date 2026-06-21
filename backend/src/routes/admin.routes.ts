import { Router } from "express";
import bcrypt from "bcryptjs";
import { Redis } from "ioredis";
import os from "node:os";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { conversionQueue } from "../config/queue.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  adminSettingsSchema,
  getAdminSettings,
  invalidateAdminSettingsCache,
} from "../services/admin-settings.service.js";
import { cleanupExpiredFiles } from "../services/cleanup.service.js";
import { storage } from "../services/storage.service.js";
import { startOfDay } from "../utils/date.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const adminProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.toLowerCase()),
});

const adminPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

type SystemCheck = {
  name: string;
  status: "ok" | "error";
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
};

async function runSystemCheck(
  name: string,
  operation: () => Promise<Record<string, unknown> | void>,
): Promise<SystemCheck> {
  const startedAt = Date.now();
  try {
    const details = await operation();
    return {
      name,
      status: "ok",
      latencyMs: Date.now() - startedAt,
      ...(details ? { details } : {}),
    };
  } catch (error) {
    return {
      name,
      status: "error",
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

router.post("/cleanup/expired-files", asyncHandler(async (_req, res) => {
  res.json(await cleanupExpiredFiles());
}));

router.get("/system", asyncHandler(async (_req, res) => {
  const checks = await Promise.all([
    runSystemCheck("database", async () => {
      await prisma.$queryRaw`SELECT 1`;
    }),
    runSystemCheck("redis", async () => {
      const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
      try {
        await redis.connect();
        await redis.ping();
      } finally {
        await redis.quit().catch(() => undefined);
      }
    }),
    runSystemCheck("storage", async () => {
      await storage.healthCheck();
      return { driver: env.STORAGE_DRIVER };
    }),
    runSystemCheck("queue", async () => {
      const counts = await conversionQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
      return { counts };
    }),
  ]);
  const memory = process.memoryUsage();
  const status = checks.every((check) => check.status === "ok") ? "ready" : "degraded";

  res.json({
    status,
    checks,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
      },
    },
    config: {
      nodeEnv: env.NODE_ENV,
      storageDriver: env.STORAGE_DRIVER,
      aiProvider: env.AI_PROVIDER,
      mailConfigured: Boolean(env.RESEND_API_KEY || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)),
      sentryConfigured: Boolean(env.SENTRY_DSN),
      cleanupIntervalMinutes: env.CLEANUP_INTERVAL_MINUTES,
    },
    timestamp: new Date().toISOString(),
  });
}));

router.get("/jobs", asyncHandler(async (req, res) => {
  const query = z.object({
    status: z.enum(["waiting", "active", "completed", "failed", "delayed", "paused"]).default("failed"),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }).parse(req.query);
  const [counts, jobs] = await Promise.all([
    conversionQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
    conversionQueue.getJobs([query.status], 0, query.limit - 1, false),
  ]);
  const items = await Promise.all(jobs.map(async (job) => ({
    id: String(job.id),
    name: job.name,
    status: await job.getState(),
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    data: {
      conversionId: typeof job.data?.conversionId === "string" ? job.data.conversionId : null,
      userId: typeof job.data?.userId === "string" ? job.data.userId : null,
      tool: typeof job.data?.tool === "string" ? job.data.tool : job.name,
    },
  })));

  res.json({
    counts,
    items,
    status: query.status,
    limit: query.limit,
    timestamp: new Date().toISOString(),
  });
}));

router.get("/files", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().default(""),
    status: z.enum(["active", "expired"]).optional(),
  }).parse(req.query);
  const now = new Date();
  const where = {
    ...(query.status === "active" ? { expiredAt: { gt: now } } : {}),
    ...(query.status === "expired" ? { expiredAt: { lte: now } } : {}),
    ...(query.search ? {
      OR: [
        { originalName: { contains: query.search, mode: "insensitive" as const } },
        { fileType: { contains: query.search, mode: "insensitive" as const } },
        { user: { email: { contains: query.search, mode: "insensitive" as const } } },
        { user: { fullName: { contains: query.search, mode: "insensitive" as const } } },
        { team: { name: { contains: query.search, mode: "insensitive" as const } } },
      ],
    } : {}),
  };
  const [items, total, aggregate] = await Promise.all([
    prisma.file.findMany({
      where,
      include: {
        user: { select: { email: true, fullName: true } },
        team: { select: { name: true } },
        _count: { select: { inputFor: true, outputFor: true, shares: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.file.count({ where }),
    prisma.file.aggregate({ where, _sum: { fileSize: true } }),
  ]);
  res.json({
    items,
    total,
    page: query.page,
    pages: Math.ceil(total / query.limit),
    totalSize: aggregate._sum.fileSize ?? 0,
  });
}));

router.delete("/files/:id", asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");

  const file = await prisma.file.findUnique({
    where: { id },
    select: { id: true, storageKey: true },
  });
  if (!file) throw new HttpError(404, "Không tìm thấy file");

  await prisma.$transaction(async (tx) => {
    await tx.conversion.deleteMany({
      where: {
        OR: [
          { inputFileId: id },
          { outputFileId: id },
        ],
      },
    });
    await tx.fileShare.deleteMany({ where: { fileId: id } });
    await tx.file.delete({ where: { id } });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "FILE_DELETED",
        targetType: "FILE",
        targetId: id,
      },
    });
  });
  await storage.remove(file.storageKey);
  res.status(204).send();
}));

router.get("/subscriptions", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().default(""),
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  }).parse(req.query);
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? {
      OR: [
        { user: { email: { contains: query.search, mode: "insensitive" as const } } },
        { user: { fullName: { contains: query.search, mode: "insensitive" as const } } },
        { plan: { name: { contains: query.search, mode: "insensitive" as const } } },
      ],
    } : {}),
  };
  const [items, total, statusGroups, paidActive] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
      orderBy: { startDate: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.subscription.count({ where }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE", plan: { name: { not: "Free" } } } }),
  ]);
  const summary = statusGroups.reduce<Record<string, number>>((result, item) => {
    result[item.status] = item._count._all;
    return result;
  }, {});
  res.json({
    items,
    total,
    page: query.page,
    pages: Math.ceil(total / query.limit),
    summary: {
      active: summary.ACTIVE ?? 0,
      expired: summary.EXPIRED ?? 0,
      cancelled: summary.CANCELLED ?? 0,
      paidActive,
    },
  });
}));

router.post("/subscriptions/sync-expired", asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.updateMany({
      where: {
        status: "ACTIVE",
        endDate: { lte: new Date() },
      },
      data: { status: "EXPIRED" },
    });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "SUBSCRIPTIONS_EXPIRED_SYNCED",
        targetType: "SUBSCRIPTION",
      },
    });
    return updated;
  });
  res.json({ updated: result.count });
}));

router.patch("/subscriptions/:id/status", asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const input = z.object({ status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]) }).parse(req.body);
  const subscription = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id },
      data: { status: input.status },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
    });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: `SUBSCRIPTION_${input.status}`,
        targetType: "SUBSCRIPTION",
        targetId: id,
      },
    });
    return updated;
  });
  res.json(subscription);
}));

router.patch("/subscriptions/:id/renew", asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const input = z.object({
    durationDays: z.coerce.number().int().min(1).max(365).default(30),
  }).parse(req.body);
  const current = await prisma.subscription.findUnique({ where: { id }, select: { endDate: true } });
  if (!current) throw new HttpError(404, "Không tìm thấy subscription");
  const base = current.endDate && current.endDate > new Date() ? current.endDate : new Date();
  const endDate = new Date(base.getTime() + input.durationDays * 86_400_000);
  const subscription = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id },
      data: { status: "ACTIVE", endDate },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
    });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "SUBSCRIPTION_RENEWED",
        targetType: "SUBSCRIPTION",
        targetId: id,
      },
    });
    return updated;
  });
  res.json(subscription);
}));

router.get("/monitoring", asyncHandler(async (_req, res) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = startOfDay(new Date(now.getTime() - 6 * 86_400_000));
  const [
    conversions24h,
    failed24h,
    completed24h,
    active24h,
    queueCounts,
    recentFailures,
    toolFailures,
    conversions7d,
  ] = await Promise.all([
    prisma.conversion.count({ where: { createdAt: { gte: last24h } } }),
    prisma.conversion.count({ where: { createdAt: { gte: last24h }, status: "FAILED" } }),
    prisma.conversion.count({ where: { createdAt: { gte: last24h }, status: "COMPLETED" } }),
    prisma.conversion.count({ where: { createdAt: { gte: last24h }, status: { in: ["QUEUED", "PROCESSING"] } } }),
    conversionQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
    prisma.conversion.findMany({
      where: { status: "FAILED" },
      include: {
        user: { select: { email: true, fullName: true } },
        inputFile: { select: { originalName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.conversion.groupBy({
      by: ["tool"],
      where: { createdAt: { gte: last24h }, status: "FAILED" },
      _count: { _all: true },
      orderBy: { _count: { tool: "desc" } },
      take: 5,
    }),
    prisma.conversion.findMany({
      where: { createdAt: { gte: last7d } },
      select: { createdAt: true, status: true },
    }),
  ]);

  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(last7d.getTime() + index * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    const dayItems = conversions7d.filter((item) => item.createdAt.toISOString().startsWith(key));
    return {
      date: key,
      total: dayItems.length,
      completed: dayItems.filter((item) => item.status === "COMPLETED").length,
      failed: dayItems.filter((item) => item.status === "FAILED").length,
    };
  });

  res.json({
    window: {
      last24h: {
        conversions: conversions24h,
        completed: completed24h,
        failed: failed24h,
        active: active24h,
        failureRate: conversions24h ? Math.round((failed24h / conversions24h) * 1000) / 10 : 0,
        successRate: conversions24h ? Math.round((completed24h / conversions24h) * 1000) / 10 : 0,
      },
    },
    queue: queueCounts,
    daily,
    toolFailures: toolFailures.map((item) => ({
      tool: item.tool,
      failed: item._count._all,
    })),
    recentFailures: recentFailures.map((item) => ({
      id: item.id,
      tool: item.tool,
      errorMessage: item.errorMessage,
      createdAt: item.createdAt,
      user: item.user,
      inputFile: item.inputFile,
    })),
    timestamp: now.toISOString(),
  });
}));

router.get("/profile", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      passwordHash: true,
    },
  });
  if (!user || user.status !== "ACTIVE") throw new HttpError(401, "Tài khoản quản trị không khả dụng");
  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json({ ...safeUser, hasPassword: Boolean(user.passwordHash) });
}));

router.patch("/profile", asyncHandler(async (req, res) => {
  const input = adminProfileSchema.parse(req.body);
  const existing = await prisma.user.findFirst({
    where: {
      email: input.email,
      id: { not: req.user!.id },
    },
    select: { id: true },
  });
  if (existing) throw new HttpError(409, "Email đã được sử dụng");

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: req.user!.id },
      data: {
        fullName: input.fullName,
        email: input.email,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "ADMIN_PROFILE_UPDATED",
        targetType: "ADMIN_PROFILE",
        targetId: req.user!.id,
      },
    });
    return updated;
  });
  res.json(user);
}));

router.patch("/profile/password", asyncHandler(async (req, res) => {
  const input = adminPasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, passwordHash: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") throw new HttpError(401, "Tài khoản quản trị không khả dụng");
  if (!user.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new HttpError(400, "Mật khẩu hiện tại không đúng");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(input.newPassword, 12) },
    }),
    prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "ADMIN_PASSWORD_CHANGED",
        targetType: "ADMIN_PROFILE",
        targetId: req.user!.id,
      },
    }),
  ]);
  res.json({ message: "Mật khẩu admin đã được cập nhật" });
}));

router.get("/settings", asyncHandler(async (_req, res) => {
  res.json(await getAdminSettings());
}));

router.patch("/settings", asyncHandler(async (req, res) => {
  const input = adminSettingsSchema.parse(req.body);
  const saved = await prisma.$transaction(async (tx) => {
    await Promise.all(Object.entries(input).map(([key, value]) =>
      tx.adminSetting.upsert({
        where: { key },
        update: { value, updatedBy: req.user!.id },
        create: { key, value, updatedBy: req.user!.id },
      }),
    ));
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "ADMIN_SETTINGS_UPDATED",
        targetType: "ADMIN_SETTINGS",
      },
    });
    return input;
  });
  invalidateAdminSettingsCache();
  res.json(saved);
}));

router.get("/dashboard", asyncHandler(async (_req, res) => {
  const today = startOfDay();
  const [totalUsers, newUsers, proUsers, totalConversions, successfulConversions, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.subscription.count({ where: { status: "ACTIVE", plan: { name: { not: "Free" } } } }),
    prisma.conversion.count(),
    prisma.conversion.count({ where: { status: "COMPLETED" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);
  res.json({
    totalUsers,
    newUsers,
    proUsers,
    totalConversions,
    successRate: totalConversions ? Math.round(successfulConversions / totalConversions * 100) : 0,
    totalRevenue: revenue._sum.amount ?? 0,
  });
}));

router.get("/users", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
    search: z.string().trim().default(""),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  }).parse(req.query);
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? {
      OR: [
        { email: { contains: query.search, mode: "insensitive" as const } },
        { fullName: { contains: query.search, mode: "insensitive" as const } },
      ],
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true },
          orderBy: { startDate: "desc" },
          take: 1,
        },
        _count: { select: { conversions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, page: query.page, pages: Math.ceil(total / query.limit) });
}));

router.patch("/users/:id/status", asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  if (id === req.user!.id) throw new HttpError(400, "Không thể khóa tài khoản đang đăng nhập");
  const { status } = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(req.body);
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, fullName: true, status: true },
    });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: `USER_${status}`,
        targetType: "USER",
        targetId: id,
      },
    });
    return updated;
  });
  res.json(user);
}));

router.patch("/users/:id/plan", asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const input = z.object({
    planId: z.uuid(),
    durationDays: z.coerce.number().int().min(1).max(365).default(30),
  }).parse(req.body);
  const [user, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true } }),
    prisma.plan.findUnique({ where: { id: input.planId } }),
  ]);
  if (!user) throw new HttpError(404, "Không tìm thấy người dùng");
  if (!plan) throw new HttpError(404, "Không tìm thấy gói dịch vụ");

  const subscription = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId: id, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    const created = await tx.subscription.create({
      data: {
        userId: id,
        planId: plan.id,
        endDate: plan.name === "Free"
          ? null
          : new Date(Date.now() + input.durationDays * 86_400_000),
      },
      include: { plan: true },
    });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "USER_PLAN_CHANGED",
        targetType: "USER",
        targetId: id,
      },
    });
    return created;
  });
  res.json(subscription);
}));

router.get("/plans", asyncHandler(async (_req, res) => {
  res.json(await prisma.plan.findMany({
    include: {
      features: true,
      _count: { select: { subscriptions: true, payments: true } },
    },
    orderBy: { price: "asc" },
  }));
}));

const planInputSchema = z.object({
  name: z.string().trim().min(2).max(50),
  price: z.coerce.number().int().min(0).max(100_000_000),
  dailyLimit: z.coerce.number().int().min(1).max(100_000),
  maxFileSizeMb: z.coerce.number().int().min(1).max(2000),
  storageDays: z.coerce.number().int().min(1).max(365),
});

router.post("/plans", asyncHandler(async (req, res) => {
  const input = planInputSchema.parse(req.body);
  const existingPlan = await prisma.plan.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingPlan) throw new HttpError(409, "Tên gói dịch vụ đã tồn tại");

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.plan.create({ data: input });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "PLAN_CREATED",
        targetType: "PLAN",
        targetId: created.id,
      },
    });
    return created;
  });
  res.status(201).json(plan);
}));

router.patch("/plans/:id", asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const input = planInputSchema.omit({ name: true }).parse(req.body);
  const plan = await prisma.$transaction(async (tx) => {
    const updated = await tx.plan.update({ where: { id }, data: input });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "PLAN_UPDATED",
        targetType: "PLAN",
        targetId: id,
      },
    });
    return updated;
  });
  res.json(plan);
}));

router.delete("/plans/:id", asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");

  const plan = await prisma.plan.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { subscriptions: true, payments: true } },
    },
  });
  if (!plan) throw new HttpError(404, "Không tìm thấy gói dịch vụ");
  if (plan.name.toLowerCase() === "free") {
    throw new HttpError(400, "Không thể xóa gói Free mặc định");
  }
  if (plan._count.subscriptions > 0 || plan._count.payments > 0) {
    throw new HttpError(409, "Không thể xóa gói đã có đăng ký hoặc thanh toán");
  }

  await prisma.$transaction(async (tx) => {
    await tx.plan.delete({ where: { id } });
    await tx.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: "PLAN_DELETED",
        targetType: "PLAN",
        targetId: id,
      },
    });
  });
  res.status(204).send();
}));

router.get("/logs", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
    action: z.string().trim().default(""),
  }).parse(req.query);
  const where = query.action
    ? { action: { contains: query.action, mode: "insensitive" as const } }
    : {};
  const [items, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      include: { admin: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.adminLog.count({ where }),
  ]);
  res.json({ items, total, page: query.page, pages: Math.ceil(total / query.limit) });
}));

router.get("/payments", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
    status: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED"]).optional(),
  }).parse(req.query);
  const where = query.status ? { status: query.status } : {};
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { user: { select: { email: true, fullName: true } }, plan: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.payment.count({ where }),
  ]);
  res.json({ items, total, page: query.page, pages: Math.ceil(total / query.limit) });
}));

router.get("/statistics", asyncHandler(async (_req, res) => {
  const from = startOfDay(new Date(Date.now() - 29 * 86400000));
  const [users, conversions, payments, toolGroups] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.conversion.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, status: true } }),
    prisma.payment.findMany({ where: { createdAt: { gte: from }, status: "PAID" }, select: { createdAt: true, amount: true } }),
    prisma.conversion.groupBy({ by: ["tool", "status"], _count: { _all: true } }),
  ]);

  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(from.getTime() + index * 86400000);
    const key = date.toISOString().slice(0, 10);
    const dayConversions = conversions.filter((item) => item.createdAt.toISOString().startsWith(key));
    return {
      statDate: key,
      newUsers: users.filter((item) => item.createdAt.toISOString().startsWith(key)).length,
      totalConversions: dayConversions.length,
      successConversions: dayConversions.filter((item) => item.status === "COMPLETED").length,
      failedConversions: dayConversions.filter((item) => item.status === "FAILED").length,
      totalRevenue: payments
        .filter((item) => item.createdAt.toISOString().startsWith(key))
        .reduce((sum, item) => sum + item.amount, 0),
    };
  });
  const tools = Object.values(toolGroups.reduce<Record<string, {
    tool: string;
    totalUsage: number;
    successCount: number;
    failedCount: number;
  }>>((result, item) => {
    const entry = result[item.tool] ?? {
      tool: item.tool,
      totalUsage: 0,
      successCount: 0,
      failedCount: 0,
    };
    entry.totalUsage += item._count._all;
    if (item.status === "COMPLETED") entry.successCount += item._count._all;
    if (item.status === "FAILED") entry.failedCount += item._count._all;
    result[item.tool] = entry;
    return result;
  }, {}));
  res.json({ daily, tools });
}));

export default router;
