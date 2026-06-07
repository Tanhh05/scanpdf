import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import path from "node:path";
import type { ConversionTool } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { conversionQueue } from "../config/queue.js";
import { requireAuth } from "../middleware/auth.js";
import { getDailyUsage, getUserPlan } from "../services/plan.service.js";
import { storage } from "../services/storage.service.js";
import { addDays } from "../utils/date.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const tools: Record<string, { tool: ConversionTool; extensions: string[] }> = {
  "word-to-pdf": { tool: "WORD_TO_PDF", extensions: [".doc", ".docx", ".odt"] },
  "pdf-to-word": { tool: "PDF_TO_WORD", extensions: [".pdf"] },
};

router.post("/:tool", requireAuth, upload.single("file"), asyncHandler(async (req, res) => {
  const toolParam = req.params.tool;
  const toolName = Array.isArray(toolParam) ? toolParam[0] : toolParam;
  const config = toolName ? tools[toolName] : undefined;
  if (!config) throw new HttpError(404, "Công cụ chưa được hỗ trợ");
  if (!req.file) throw new HttpError(400, "Vui lòng chọn file");

  const extension = path.extname(req.file.originalname).toLowerCase();
  if (!config.extensions.includes(extension)) {
    throw new HttpError(400, `Định dạng file không hợp lệ. Hỗ trợ: ${config.extensions.join(", ")}`);
  }

  const plan = await getUserPlan(req.user!.id);
  const used = await getDailyUsage(req.user!.id);
  if (used >= plan.dailyLimit) throw new HttpError(429, "Bạn đã hết lượt chuyển đổi hôm nay");
  if (req.file.size > plan.maxFileSizeMb * 1024 * 1024) {
    throw new HttpError(413, `File vượt quá giới hạn ${plan.maxFileSizeMb}MB`);
  }

  const storageKey = `input/${req.user!.id}/${nanoid()}${extension}`;
  await storage.put(storageKey, req.file.buffer, req.file.mimetype);

  const conversion = await prisma.$transaction(async (tx) => {
    const inputFile = await tx.file.create({
      data: {
        userId: req.user!.id,
        originalName: req.file!.originalname,
        storageKey,
        fileType: req.file!.mimetype,
        fileSize: req.file!.size,
        expiredAt: addDays(plan.storageDays),
      },
    });
    const created = await tx.conversion.create({
      data: {
        userId: req.user!.id,
        inputFileId: inputFile.id,
        tool: config.tool,
      },
    });
    await tx.usageLog.create({ data: { userId: req.user!.id, tool: config.tool } });
    return created;
  });

  await conversionQueue.add(config.tool, { conversionId: conversion.id }, {
    priority: plan.name === "Free" ? 10 : 1,
  });

  res.status(202).json(conversion);
}));

export default router;
