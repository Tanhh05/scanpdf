import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { cleanupExpiredFiles } from "../services/cleanup.service.js";
import { startOfDay } from "../utils/date.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.post("/cleanup/expired-files", asyncHandler(async (_req, res) => {
  res.json(await cleanupExpiredFiles());
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
