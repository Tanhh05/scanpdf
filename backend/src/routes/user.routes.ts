import { Router } from "express";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getDailyUsage, getUserPlan } from "../services/plan.service.js";
import { storage } from "../services/storage.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import {
  createTwoFactorSecret,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateTwoFactorToken,
  verifyTwoFactorToken,
} from "../services/two-factor.service.js";

const router = Router();
router.use(requireAuth);

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100),
});

function hashPublicToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.get("/profile", asyncHandler(async (req, res) => {
  const [user, plan, usedToday] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        createdAt: true,
        passwordHash: true,
      },
    }),
    getUserPlan(req.user!.id),
    getDailyUsage(req.user!.id),
  ]);
  if (!user) throw new HttpError(404, "Không tìm thấy tài khoản");
  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json({
    user: { ...safeUser, hasPassword: Boolean(user.passwordHash) },
    plan,
    usedToday,
    remainingToday: Math.max(0, plan.dailyLimit - usedToday),
  });
}));

router.patch("/profile", asyncHandler(async (req, res) => {
  const input = updateProfileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { fullName: input.fullName },
    select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
  });
  res.json(user);
}));

router.patch("/profile/password", asyncHandler(async (req, res) => {
  const input = changePasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || user.status !== "ACTIVE") throw new HttpError(401, "Tài khoản không khả dụng");
  if (user.passwordHash) {
    if (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new HttpError(400, "Mật khẩu hiện tại không đúng");
    }
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(input.newPassword, 12) },
  });
  res.json({ message: "Mật khẩu đã được cập nhật" });
}));

router.post("/profile/2fa/setup", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new HttpError(404, "Không tìm thấy tài khoản");
  if (user.role === "ADMIN") throw new HttpError(403, "2FA cho tài khoản quản trị đang tạm thời bị tắt");
  if (!user.emailVerifiedAt) throw new HttpError(403, "Vui lòng xác thực email trước khi bật 2FA");
  const setup = createTwoFactorSecret(user.email);
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: encryptTwoFactorSecret(setup.secret), twoFactorEnabled: false },
  });
  res.json({
    ...setup,
    debugToken: env.NODE_ENV === "production" ? undefined : generateTwoFactorToken(setup.secret),
  });
}));

router.post("/profile/2fa/enable", asyncHandler(async (req, res) => {
  const { token } = z.object({ token: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (user?.role === "ADMIN") throw new HttpError(403, "2FA cho tài khoản quản trị đang tạm thời bị tắt");
  if (!user?.twoFactorSecret) throw new HttpError(400, "Vui lòng tạo cấu hình 2FA trước");
  const valid = await verifyTwoFactorToken(decryptTwoFactorSecret(user.twoFactorSecret), token);
  if (!valid) throw new HttpError(400, "Mã xác thực không đúng");
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  res.json({ message: "Đã bật xác thực hai lớp" });
}));

router.post("/profile/2fa/disable", asyncHandler(async (req, res) => {
  const { token } = z.object({ token: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (user?.role === "ADMIN") throw new HttpError(403, "2FA cho tài khoản quản trị đang tạm thời bị tắt");
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) throw new HttpError(400, "2FA chưa được bật");
  const valid = await verifyTwoFactorToken(decryptTwoFactorSecret(user.twoFactorSecret), token);
  if (!valid) throw new HttpError(400, "Mã xác thực không đúng");
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  res.json({ message: "Đã tắt xác thực hai lớp" });
}));

router.get("/api-keys", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
  }).parse(req.query);
  const where = { userId: req.user!.id };
  const [items, total] = await Promise.all([
    prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        prefix: true,
        lastFour: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.apiKey.count({ where }),
  ]);
  res.json({
    items,
    total,
    page: query.page,
    pages: Math.ceil(total / query.limit),
    limit: query.limit,
  });
}));

router.post("/api-keys", asyncHandler(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(50) }).parse(req.body);
  const [user, plan, activeKeyCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id } }),
    getUserPlan(req.user!.id),
    prisma.apiKey.count({ where: { userId: req.user!.id, revokedAt: null } }),
  ]);
  if (!user?.emailVerifiedAt) throw new HttpError(403, "Vui lòng xác thực email trước khi tạo API key");
  if (plan.name !== "Business") throw new HttpError(403, "API key chỉ dành cho gói Business");
  if (activeKeyCount >= 5) throw new HttpError(400, "Bạn chỉ có thể tạo tối đa 5 API key đang hoạt động");

  const secret = `sp_live_${crypto.randomBytes(24).toString("base64url")}`;
  const key = await prisma.apiKey.create({
    data: {
      userId: req.user!.id,
      name,
      keyHash: crypto.createHash("sha256").update(secret).digest("hex"),
      prefix: secret.slice(0, 12),
      lastFour: secret.slice(-4),
    },
    select: { id: true, name: true, prefix: true, lastFour: true, createdAt: true },
  });
  res.status(201).json({ ...key, key: secret });
}));

router.delete("/api-keys/:id", asyncHandler(async (req, res) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const result = await prisma.apiKey.updateMany({
    where: { id, userId: req.user!.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!result.count) throw new HttpError(404, "Không tìm thấy API key");
  res.status(204).send();
}));

router.get("/conversions", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
    search: z.string().trim().default(""),
    status: z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  }).parse(req.query);
  const where: Prisma.ConversionWhereInput = {
    userId: req.user!.id,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? {
      inputFile: { originalName: { contains: query.search, mode: "insensitive" } },
    } : {}),
  };
  const [conversions, total] = await Promise.all([
    prisma.conversion.findMany({
      where,
      include: { inputFile: true, outputFile: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.conversion.count({ where }),
  ]);
  const now = new Date();
  const result = conversions.map((item) => ({
    ...item,
    canDownload: Boolean(item.outputFile && item.outputFile.expiredAt > now),
    downloadUrl: null,
  }));
  res.json({ items: result, total, page: query.page, pages: Math.ceil(total / query.limit), limit: query.limit });
}));

router.get("/conversions/:id", asyncHandler(async (req, res) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const conversion = await prisma.conversion.findFirst({
    where: { id, userId: req.user!.id },
    include: { inputFile: true, outputFile: true },
  });
  if (!conversion) throw new HttpError(404, "Không tìm thấy lần chuyển đổi");
  const canDownload = Boolean(conversion.outputFile && conversion.outputFile.expiredAt > new Date());
  res.json({
    ...conversion,
    canDownload,
    downloadUrl: conversion.outputFile && canDownload
      ? await storage.getDownloadUrl(conversion.outputFile.storageKey)
      : null,
  });
}));

router.post("/conversions/:id/share", asyncHandler(async (req, res) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const input = z.object({
    expiresInHours: z.coerce.number().int().min(1).max(24 * 30).default(24),
    password: z.string().min(4).max(64).optional().or(z.literal("")),
  }).parse(req.body);
  const conversion = await prisma.conversion.findFirst({
    where: { id, userId: req.user!.id, status: "COMPLETED" },
    include: { outputFile: true },
  });
  if (!conversion?.outputFile) throw new HttpError(404, "Không tìm thấy file kết quả");
  if (conversion.outputFile.expiredAt <= new Date()) throw new HttpError(410, "File đã hết hạn");

  const token = crypto.randomBytes(32).toString("base64url");
  const requestedExpiry = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
  const expiresAt = requestedExpiry < conversion.outputFile.expiredAt
    ? requestedExpiry
    : conversion.outputFile.expiredAt;
  const share = await prisma.fileShare.create({
    data: {
      userId: req.user!.id,
      fileId: conversion.outputFile.id,
      tokenHash: hashPublicToken(token),
      passwordHash: input.password ? await bcrypt.hash(input.password, 12) : null,
      expiresAt,
    },
  });
  res.status(201).json({
    id: share.id,
    shareUrl: `${env.FRONTEND_URL}/share/${token}`,
    expiresAt,
    passwordProtected: Boolean(input.password),
  });
}));

router.get("/shares", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
  }).parse(req.query);
  const where = { userId: req.user!.id };
  const [shares, total] = await Promise.all([
    prisma.fileShare.findMany({
      where,
      include: { file: { select: { originalName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.fileShare.count({ where }),
  ]);
  const items = shares.map(({ passwordHash, tokenHash, ...share }) => ({
    ...share,
    passwordProtected: Boolean(passwordHash),
  }));
  res.json({
    items,
    total,
    page: query.page,
    pages: Math.ceil(total / query.limit),
    limit: query.limit,
  });
}));

router.get("/subscriptions", asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
  }).parse(req.query);
  const where = { userId: req.user!.id };
  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { plan: true },
      orderBy: { startDate: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.subscription.count({ where }),
  ]);
  res.json({
    items,
    total,
    page: query.page,
    pages: Math.ceil(total / query.limit),
    limit: query.limit,
  });
}));

router.delete("/shares/:id", asyncHandler(async (req, res) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const result = await prisma.fileShare.updateMany({
    where: { id, userId: req.user!.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!result.count) throw new HttpError(404, "Không tìm thấy liên kết chia sẻ");
  res.status(204).send();
}));

router.delete("/conversions/:id", asyncHandler(async (req, res) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const conversion = await prisma.conversion.findFirst({
    where: { id, userId: req.user!.id },
    include: { inputFile: true, outputFile: true },
  });
  if (!conversion) throw new HttpError(404, "Không tìm thấy lần chuyển đổi");

  const files = [conversion.inputFile, conversion.outputFile].filter((file) => file !== null);
  const removedStorageKeys = await prisma.$transaction(async (tx) => {
    const storageKeys: string[] = [];
    await tx.conversion.delete({ where: { id: conversion.id } });
    for (const file of files) {
      const references = await Promise.all([
        tx.conversion.count({ where: { inputFileId: file.id } }),
        tx.conversion.count({ where: { outputFileId: file.id } }),
      ]);
      if (references[0] + references[1] === 0) {
        await tx.file.delete({ where: { id: file.id } });
        storageKeys.push(file.storageKey);
      }
    }
    return storageKeys;
  });
  await Promise.all(removedStorageKeys.map((storageKey) => storage.remove(storageKey)));
  res.status(204).send();
}));

export default router;
