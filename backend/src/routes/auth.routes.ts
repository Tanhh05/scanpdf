import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createOAuthState,
  findOrCreateOAuthUser,
  getOAuthConfig,
  getOAuthProfile,
  verifyOAuthState,
} from "../services/oauth.service.js";

const router = Router();
const credentialsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

function createToken(user: { id: string; email: string; role: "USER" | "ADMIN" }) {
  return jwt.sign(
    { email: user.email, role: user.role },
    env.JWT_SECRET,
    { subject: user.id, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

router.post("/register", asyncHandler(async (req, res) => {
  const input = credentialsSchema.extend({ fullName: z.string().min(2).max(100) }).parse(req.body);
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw new HttpError(409, "Email đã được sử dụng");
  }

  const freePlan = await prisma.plan.findUnique({ where: { name: "Free" } });
  if (!freePlan) throw new HttpError(503, "Hệ thống chưa khởi tạo gói dịch vụ");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash: await bcrypt.hash(input.password, 12),
      subscriptions: { create: { planId: freePlan.id } },
    },
    select: { id: true, email: true, fullName: true, role: true },
  });

  res.status(201).json({ token: createToken(user), user });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const input = credentialsSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng");
  }
  if (user.status !== "ACTIVE") throw new HttpError(403, "Tài khoản đã bị khóa");

  res.json({
    token: createToken(user),
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, fullName: true, role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") throw new HttpError(401, "Tài khoản không khả dụng");
  res.json(user);
}));

router.get("/:provider", (req, res) => {
  const provider = z.enum(["google", "github"]).parse(req.params.provider);
  const config = getOAuthConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: "code",
    scope: config.scope,
    state: createOAuthState(provider),
  });
  if (provider === "google") {
    params.set("access_type", "online");
    params.set("prompt", "select_account");
  }
  res.redirect(`${config.authorizationUrl}?${params}`);
});

router.get("/:provider/callback", asyncHandler(async (req, res) => {
  const provider = z.enum(["google", "github"]).parse(req.params.provider);
  const query = z.object({
    code: z.string().min(1),
    state: z.string().min(1),
  }).parse(req.query);
  verifyOAuthState(query.state, provider);
  const user = await findOrCreateOAuthUser(await getOAuthProfile(provider, query.code));
  if (user.status !== "ACTIVE") throw new HttpError(403, "Tài khoản đã bị khóa");
  res.redirect(`${env.FRONTEND_URL}/auth/callback#token=${encodeURIComponent(createToken(user))}`);
}));

router.post("/forgot-password", (_req, res) => {
  res.status(202).json({
    message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
  });
});

export default router;
