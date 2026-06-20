import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { getUserPlan } from "../services/plan.service.js";
import { HttpError } from "../utils/http-error.js";

type TokenPayload = {
  sub: string;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new HttpError(401, "Bạn cần đăng nhập");
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    if (!payload.sub) throw new Error("Missing token subject");
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new HttpError(401, "Tài khoản không khả dụng");
    }
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
  }
}

export async function requireAuthOrApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = String(req.headers["x-api-key"] ?? "");
  if (!apiKey) {
    await requireAuth(req, res, next);
    return;
  }
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: crypto.createHash("sha256").update(apiKey).digest("hex") },
    include: { user: true },
  });
  if (!record || record.revokedAt || record.user.status !== "ACTIVE") {
    throw new HttpError(401, "API key không hợp lệ hoặc đã bị thu hồi");
  }
  if (!record.user.emailVerifiedAt) throw new HttpError(403, "Tài khoản API chưa xác thực email");
  const plan = await getUserPlan(record.userId);
  if (plan.name !== "Business") throw new HttpError(403, "Public API chỉ dành cho gói Business");
  req.user = {
    id: record.user.id,
    email: record.user.email,
    role: record.user.role,
    apiKeyId: record.id,
  };
  void prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    throw new HttpError(403, "Bạn không có quyền truy cập");
  }
  next();
}
