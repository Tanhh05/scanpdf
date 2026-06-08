import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { storage } from "../services/storage.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();

function hashPublicToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getActiveShare(token: string) {
  const share = await prisma.fileShare.findUnique({
    where: { tokenHash: hashPublicToken(token) },
    include: { file: true },
  });
  if (!share || share.revokedAt || share.expiresAt <= new Date() || share.file.expiredAt <= new Date()) {
    throw new HttpError(404, "Liên kết chia sẻ không tồn tại hoặc đã hết hạn");
  }
  return share;
}

router.get("/share/:token", asyncHandler(async (req, res) => {
  const value = req.params.token;
  const token = Array.isArray(value) ? value[0] : value;
  if (!token) throw new HttpError(400, "Liên kết không hợp lệ");
  const share = await getActiveShare(token);
  res.json({
    originalName: share.file.originalName,
    fileSize: share.file.fileSize,
    expiresAt: share.expiresAt,
    passwordProtected: Boolean(share.passwordHash),
  });
}));

router.get("/share/:token/download", asyncHandler(async (req, res) => {
  const value = req.params.token;
  const token = Array.isArray(value) ? value[0] : value;
  if (!token) throw new HttpError(400, "Liên kết không hợp lệ");
  const share = await getActiveShare(token);
  if (share.passwordHash) {
    const password = String(req.query.password ?? "");
    if (!password || !(await bcrypt.compare(password, share.passwordHash))) {
      throw new HttpError(401, "Mật khẩu chia sẻ không đúng");
    }
  }
  const content = await storage.get(share.file.storageKey);
  res.setHeader("Content-Type", share.file.fileType);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(share.file.originalName)}`);
  res.send(content);
}));

router.get("/download", requireAuth, asyncHandler(async (req, res) => {
  const key = String(req.query.key ?? "");
  const file = await prisma.file.findFirst({
    where: req.user!.role === "ADMIN"
      ? { storageKey: key }
      : { storageKey: key, userId: req.user!.id },
  });
  if (!file) throw new HttpError(404, "Không tìm thấy file");
  if (file.expiredAt < new Date()) throw new HttpError(410, "File đã hết hạn");
  const content = await storage.get(key);
  res.setHeader("Content-Type", file.fileType);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  res.send(content);
}));

export default router;
