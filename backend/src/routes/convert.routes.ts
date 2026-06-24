import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import path from "node:path";
import type { ConversionTool } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { conversionQueue } from "../config/queue.js";
import { requireAuthOrApiKey } from "../middleware/auth.js";
import { getDailyUsage, getUserPlan } from "../services/plan.service.js";
import { storage } from "../services/storage.service.js";
import { addDays } from "../utils/date.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeUploadedFilename } from "../utils/filename.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 20, fileSize: 200 * 1024 * 1024 },
});

const rotateSchema = z.object({ angle: z.coerce.number().refine((value) => [90, 180, 270].includes(value)).default(90) });
const deletePagesSchema = z.object({ pages: z.string().trim().min(1).max(200) });
const watermarkSchema = z.object({ text: z.string().trim().min(1).max(80).default("ScanPDF") });
const reorderPagesSchema = z.object({ pages: z.string().trim().min(1).max(500) });
const pageNumbersSchema = z.object({
  position: z.enum(["bottom-center", "bottom-right", "top-right"]).default("bottom-center"),
});
const passwordSchema = z.object({ password: z.string().min(4).max(64) });
const signatureSchema = z.object({
  signer: z.string().trim().min(2).max(80),
  position: z.enum(["bottom-left", "bottom-right"]).default("bottom-right"),
});
const removeWatermarkImageSchema = z.object({
  mode: z.enum(["auto", "logo", "text", "watermark"]).default("auto"),
  details: z.string().trim().max(240).optional().default(""),
});
const removeWatermarkVideoSchema = z.object({
  preset: z.enum(["tiktok-dual-corner", "top-left", "top-right", "bottom-left", "bottom-right", "bottom-center"]).default("tiktok-dual-corner"),
  watermarkWidthPercent: z.coerce.number().min(5).max(40).default(18),
  watermarkHeightPercent: z.coerce.number().min(5).max(30).default(12),
  subtitleStripPercent: z.coerce.number().min(0).max(30).default(0),
});
const trimVideoSchema = z.object({
  startSeconds: z.coerce.number().min(0),
  endSeconds: z.coerce.number().positive(),
}).refine((value) => value.endSeconds > value.startSeconds, {
  message: "endSeconds phải lớn hơn startSeconds",
  path: ["endSeconds"],
});
const autoSubtitleVideoSchema = z.object({
  translateTo: z.enum(["none", "vi", "en"]).default("none"),
});

const tools: Record<string, {
  tool: ConversionTool;
  extensions: string[];
  multiple?: boolean;
  parseOptions?: (body: unknown) => Record<string, unknown>;
}> = {
  "word-to-pdf": { tool: "WORD_TO_PDF" as ConversionTool, extensions: [".doc", ".docx", ".odt"] },
  "pdf-to-word": { tool: "PDF_TO_WORD" as ConversionTool, extensions: [".pdf"] },
  "merge-pdf": { tool: "MERGE_PDF" as ConversionTool, extensions: [".pdf"], multiple: true },
  "compress-pdf": { tool: "COMPRESS_PDF" as ConversionTool, extensions: [".pdf"] },
  "jpg-to-pdf": { tool: "JPG_TO_PDF" as ConversionTool, extensions: [".jpg", ".jpeg", ".png"], multiple: true },
  "pdf-to-jpg": { tool: "PDF_TO_JPG" as ConversionTool, extensions: [".pdf"] },
  "ocr-pdf": { tool: "OCR_PDF" as ConversionTool, extensions: [".pdf"] },
  "split-pdf": { tool: "SPLIT_PDF" as ConversionTool, extensions: [".pdf"] },
  "rotate-pdf": { tool: "ROTATE_PDF" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => rotateSchema.parse(body) },
  "delete-pdf-pages": { tool: "DELETE_PDF_PAGES" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => deletePagesSchema.parse(body) },
  "watermark-pdf": { tool: "WATERMARK_PDF" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => watermarkSchema.parse(body) },
  "reorder-pdf": { tool: "REORDER_PDF" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => reorderPagesSchema.parse(body) },
  "add-page-numbers": { tool: "ADD_PAGE_NUMBERS" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => pageNumbersSchema.parse(body) },
  "protect-pdf": { tool: "PROTECT_PDF" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => passwordSchema.parse(body) },
  "unlock-pdf": { tool: "UNLOCK_PDF" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => passwordSchema.parse(body) },
  "sign-pdf": { tool: "SIGN_PDF" as ConversionTool, extensions: [".pdf"], parseOptions: (body) => signatureSchema.parse(body) },
  "remove-watermark-image": {
    tool: "REMOVE_WATERMARK_IMAGE" as ConversionTool,
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
    parseOptions: (body) => removeWatermarkImageSchema.parse(body),
  },
  "remove-watermark-video": {
    tool: "REMOVE_WATERMARK_VIDEO" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
    parseOptions: (body) => removeWatermarkVideoSchema.parse(body),
  },
  "video-compress": {
    tool: "VIDEO_COMPRESS" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
  },
  "video-convert": {
    tool: "VIDEO_CONVERT" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
  },
  "video-to-gif": {
    tool: "VIDEO_TO_GIF" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
  },
  "extract-audio": {
    tool: "EXTRACT_AUDIO" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
  },
  "video-merge": {
    tool: "VIDEO_MERGE" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
    multiple: true,
  },
  "video-trim": {
    tool: "VIDEO_TRIM" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
    parseOptions: (body) => trimVideoSchema.parse(body),
  },
  "auto-subtitle-video": {
    tool: "AUTO_SUBTITLE_VIDEO" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
    parseOptions: (body) => autoSubtitleVideoSchema.parse(body),
  },
  "video-summary": {
    tool: "VIDEO_SUMMARY" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
  },
  "generate-shorts": {
    tool: "GENERATE_SHORTS" as ConversionTool,
    extensions: [".mp4", ".mov", ".mkv", ".avi", ".webm"],
  },
};

const batchTools = new Set(["word-to-pdf", "compress-pdf", "pdf-to-jpg"]);

async function getBillingContext(userId: string, body: unknown) {
  const parsed = z.object({ teamId: z.uuid().optional() }).passthrough().parse(body ?? {});
  if (!parsed.teamId) {
    const plan = await getUserPlan(userId);
    const used = await getDailyUsage(userId);
    return { plan, used, teamId: null, priorityPlanName: plan.name };
  }

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: parsed.teamId, userId } },
    include: { team: true },
  });
  if (!member) throw new HttpError(403, "Bạn không thuộc team này");
  const plan = await getUserPlan(member.team.ownerId);
  if (plan.name !== "Business") throw new HttpError(403, "Team conversion yêu cầu owner dùng gói Business");
  const used = await prisma.usageLog.count({
    where: { teamId: parsed.teamId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });
  return { plan, used, teamId: parsed.teamId, priorityPlanName: plan.name };
}

router.post("/batch/:tool", requireAuthOrApiKey, upload.array("files", 20), asyncHandler(async (req, res) => {
  const value = req.params.tool;
  const toolName = Array.isArray(value) ? value[0] : value;
  const config = toolName ? tools[toolName] : undefined;
  if (!config || !toolName || !batchTools.has(toolName)) {
    throw new HttpError(404, "Công cụ batch chưa được hỗ trợ");
  }
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw new HttpError(400, "Vui lòng chọn file");
  const normalizedFiles = files.map((file) => ({
    file,
    originalName: normalizeUploadedFilename(file.originalname),
  }));
  const invalidFile = normalizedFiles.find((item) => !config.extensions.includes(path.extname(item.originalName).toLowerCase()));
  if (invalidFile) throw new HttpError(400, `Định dạng file không hợp lệ: ${invalidFile.originalName}`);

  const { plan, used, teamId, priorityPlanName } = await getBillingContext(req.user!.id, req.body);
  if (used + files.length > plan.dailyLimit) {
    throw new HttpError(429, `Bạn chỉ còn ${Math.max(0, plan.dailyLimit - used)} lượt chuyển đổi hôm nay`);
  }
  if (normalizedFiles.some((item) => item.file.size > plan.maxFileSizeMb * 1024 * 1024)) {
    throw new HttpError(413, `Có file vượt quá giới hạn ${plan.maxFileSizeMb}MB`);
  }

  const storedFiles = await Promise.all(normalizedFiles.map(async (item) => {
    const extension = path.extname(item.originalName).toLowerCase();
    const storageKey = `input/${req.user!.id}/${nanoid()}${extension}`;
    await storage.put(storageKey, item.file.buffer, item.file.mimetype);
    return { ...item, storageKey };
  }));
  const conversions = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const item of storedFiles) {
      const inputFile = await tx.file.create({
        data: {
          userId: req.user!.id,
          teamId,
          originalName: item.originalName,
          storageKey: item.storageKey,
          fileType: item.file.mimetype,
          fileSize: item.file.size,
          expiredAt: addDays(plan.storageDays),
        },
      });
      const conversion = await tx.conversion.create({
        data: { userId: req.user!.id, teamId, inputFileId: inputFile.id, tool: config.tool },
      });
      await tx.usageLog.create({ data: { userId: req.user!.id, teamId, tool: config.tool } });
      created.push({ ...conversion, inputFileIds: [inputFile.id] });
    }
    return created;
  });
  await Promise.all(conversions.map((conversion) => conversionQueue.add(config.tool, {
    conversionId: conversion.id,
    inputFileIds: conversion.inputFileIds,
    options: {},
  }, { priority: priorityPlanName === "Free" ? 10 : 1 })));
  res.status(202).json(conversions.map(({ inputFileIds: _inputFileIds, ...conversion }) => conversion));
}));

router.post("/:tool", requireAuthOrApiKey, upload.fields([
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
  if (config.tool === "VIDEO_MERGE" && files.length < 2) {
    throw new HttpError(400, "Ghép video cần ít nhất hai file");
  }

  const normalizedFiles = files.map((file) => ({
    file,
    originalName: normalizeUploadedFilename(file.originalname),
  }));
  const invalidFile = normalizedFiles.find((item) => !config.extensions.includes(path.extname(item.originalName).toLowerCase()));
  if (invalidFile) {
    throw new HttpError(400, `Định dạng file không hợp lệ. Hỗ trợ: ${config.extensions.join(", ")}`);
  }
  const options = config.parseOptions?.(req.body) ?? {};

  const { plan, used, teamId, priorityPlanName } = await getBillingContext(req.user!.id, req.body);
  if (used >= plan.dailyLimit) throw new HttpError(429, "Bạn đã hết lượt chuyển đổi hôm nay");
  if (normalizedFiles.some((item) => item.file.size > plan.maxFileSizeMb * 1024 * 1024)) {
    throw new HttpError(413, `File vượt quá giới hạn ${plan.maxFileSizeMb}MB`);
  }

  const storedFiles = await Promise.all(normalizedFiles.map(async (item) => {
    const extension = path.extname(item.originalName).toLowerCase();
    const storageKey = `input/${req.user!.id}/${nanoid()}${extension}`;
    await storage.put(storageKey, item.file.buffer, item.file.mimetype);
    return { ...item, storageKey };
  }));

  const conversion = await prisma.$transaction(async (tx) => {
    const inputFiles = [];
    for (const item of storedFiles) {
      inputFiles.push(await tx.file.create({
        data: {
          userId: req.user!.id,
          teamId,
          originalName: item.originalName,
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
        teamId,
        inputFileId: inputFiles[0]!.id,
        tool: config.tool,
      },
    });
    await tx.usageLog.create({ data: { userId: req.user!.id, teamId, tool: config.tool } });
    return { ...created, inputFileIds: inputFiles.map((file) => file.id) };
  });

  await conversionQueue.add(config.tool, {
    conversionId: conversion.id,
    inputFileIds: conversion.inputFileIds,
    options,
  }, {
    priority: priorityPlanName === "Free" ? 10 : 1,
  });

  const { inputFileIds: _inputFileIds, ...response } = conversion;
  res.status(202).json(response);
}));

export default router;
