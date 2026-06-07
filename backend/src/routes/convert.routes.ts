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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 20, fileSize: 200 * 1024 * 1024 },
});

const tools: Record<string, { tool: ConversionTool; extensions: string[]; multiple?: boolean }> = {
  "word-to-pdf": { tool: "WORD_TO_PDF", extensions: [".doc", ".docx", ".odt"] },
  "pdf-to-word": { tool: "PDF_TO_WORD", extensions: [".pdf"] },
  "merge-pdf": { tool: "MERGE_PDF", extensions: [".pdf"], multiple: true },
  "compress-pdf": { tool: "COMPRESS_PDF", extensions: [".pdf"] },
  "jpg-to-pdf": { tool: "JPG_TO_PDF", extensions: [".jpg", ".jpeg", ".png"], multiple: true },
  "pdf-to-jpg": { tool: "PDF_TO_JPG", extensions: [".pdf"] },
  "ocr-pdf": { tool: "OCR_PDF", extensions: [".pdf"] },
};

router.post("/:tool", requireAuth, upload.fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 20 },
]), asyncHandler(async (req, res) => {
  const toolParam = req.params.tool;
  const toolName = Array.isArray(toolParam) ? toolParam[0] : toolParam;
  const config = toolName ? tools[toolName] : undefined;
  if (!config) throw new HttpError(404, "Công cụ chưa được hỗ trợ");
  const uploaded = req.files as Record<string, Express.Multer.File[]> | undefined;
  const files = [...(uploaded?.file ?? []), ...(uploaded?.files ?? [])];
  if (!files.length) throw new HttpError(400, "Vui lòng chọn file");
  if (!config.multiple && files.length !== 1) throw new HttpError(400, "Công cụ này chỉ nhận một file");
  if (config.tool === "MERGE_PDF" && files.length < 2) {
    throw new HttpError(400, "Ghép PDF cần ít nhất hai file");
  }

  const invalidFile = files.find((file) => !config.extensions.includes(path.extname(file.originalname).toLowerCase()));
  if (invalidFile) {
    throw new HttpError(400, `Định dạng file không hợp lệ. Hỗ trợ: ${config.extensions.join(", ")}`);
  }

  const plan = await getUserPlan(req.user!.id);
  const used = await getDailyUsage(req.user!.id);
  if (used >= plan.dailyLimit) throw new HttpError(429, "Bạn đã hết lượt chuyển đổi hôm nay");
  if (files.some((file) => file.size > plan.maxFileSizeMb * 1024 * 1024)) {
    throw new HttpError(413, `File vượt quá giới hạn ${plan.maxFileSizeMb}MB`);
  }

  const storedFiles = await Promise.all(files.map(async (file) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const storageKey = `input/${req.user!.id}/${nanoid()}${extension}`;
    await storage.put(storageKey, file.buffer, file.mimetype);
    return { file, storageKey };
  }));

  const conversion = await prisma.$transaction(async (tx) => {
    const inputFiles = [];
    for (const item of storedFiles) {
      inputFiles.push(await tx.file.create({
        data: {
          userId: req.user!.id,
          originalName: item.file.originalname,
          storageKey: item.storageKey,
          fileType: item.file.mimetype,
          fileSize: item.file.size,
          expiredAt: addDays(plan.storageDays),
        },
      }));
    }
    const created = await tx.conversion.create({
      data: {
        userId: req.user!.id,
        inputFileId: inputFiles[0]!.id,
        tool: config.tool,
      },
    });
    await tx.usageLog.create({ data: { userId: req.user!.id, tool: config.tool } });
    return { ...created, inputFileIds: inputFiles.map((file) => file.id) };
  });

  await conversionQueue.add(config.tool, {
    conversionId: conversion.id,
    inputFileIds: conversion.inputFileIds,
  }, {
    priority: plan.name === "Free" ? 10 : 1,
  });

  const { inputFileIds: _inputFileIds, ...response } = conversion;
  res.status(202).json(response);
}));

export default router;
