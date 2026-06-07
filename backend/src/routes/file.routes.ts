import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { storage } from "../services/storage.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();

router.get("/download", requireAuth, asyncHandler(async (req, res) => {
  const key = String(req.query.key ?? "");
  const file = await prisma.file.findFirst({
    where: req.user!.role === "ADMIN"
      ? { storageKey: key }
      : { storageKey: key, userId: req.user!.id },
  });
  if (!file) throw new HttpError(404, "Không tìm thấy file");
  const content = await storage.get(key);
  res.setHeader("Content-Type", file.fileType);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  res.send(content);
}));

export default router;
