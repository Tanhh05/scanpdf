import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getDailyUsage, getUserPlan } from "../services/plan.service.js";
import { storage } from "../services/storage.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();
router.use(requireAuth);

router.get("/profile", asyncHandler(async (req, res) => {
  const [user, plan, usedToday] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    }),
    getUserPlan(req.user!.id),
    getDailyUsage(req.user!.id),
  ]);
  res.json({ user, plan, usedToday, remainingToday: Math.max(0, plan.dailyLimit - usedToday) });
}));

router.get("/conversions", asyncHandler(async (req, res) => {
  const conversions = await prisma.conversion.findMany({
    where: { userId: req.user!.id },
    include: { inputFile: true, outputFile: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const result = await Promise.all(conversions.map(async (item) => ({
    ...item,
    downloadUrl: item.outputFile ? await storage.getDownloadUrl(item.outputFile.storageKey) : null,
  })));
  res.json(result);
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
  res.json({
    ...conversion,
    downloadUrl: conversion.outputFile
      ? await storage.getDownloadUrl(conversion.outputFile.storageKey)
      : null,
  });
}));

export default router;
