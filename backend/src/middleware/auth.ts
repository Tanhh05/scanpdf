import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

type TokenPayload = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new HttpError(401, "Bạn cần đăng nhập");
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    throw new HttpError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    throw new HttpError(403, "Bạn không có quyền truy cập");
  }
  next();
}
