import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getFreePlan } from "../services/plan.service.js";
import { sendEmailVerification, sendPasswordResetEmail } from "../services/mail.service.js";
import {
  createOAuthState,
  findOrCreateOAuthUser,
  getOAuthConfig,
  getOAuthProfile,
  verifyOAuthState,
} from "../services/oauth.service.js";
import { decryptTwoFactorSecret, verifyTwoFactorToken } from "../services/two-factor.service.js";

const router = Router();
const credentialsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  otp: z.string().regex(/^\d{6}$/).optional(),
});
const forgotPasswordSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});
const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

function createToken(user: { id: string; email: string; role: "USER" | "ADMIN" }) {
  return jwt.sign(
    { email: user.email, role: user.role },
    env.JWT_SECRET,
    { subject: user.id, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function requiresTwoFactorAtLogin(user: { role: "USER" | "ADMIN"; twoFactorEnabled: boolean }) {
  return user.role !== "ADMIN" && user.twoFactorEnabled;
}

async function createEmailVerification(user: { id: string; email: string }) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  let sent = false;
  try {
    sent = await sendEmailVerification(user.email, verifyUrl);
  } catch (error) {
    console.error("Email verification failed", error);
  }
  if (!sent && env.NODE_ENV !== "production") console.log(`Email verification URL for ${user.email}: ${verifyUrl}`);
  return verifyUrl;
}

router.post("/register", asyncHandler(async (req, res) => {
  const input = credentialsSchema.extend({ fullName: z.string().min(2).max(100) }).parse(req.body);
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw new HttpError(409, "Email đã được sử dụng");
  }

  const freePlan = await getFreePlan();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash: await bcrypt.hash(input.password, 12),
      subscriptions: { create: { planId: freePlan.id } },
    },
    select: { id: true, email: true, fullName: true, role: true },
  });
  const verifyUrl = await createEmailVerification(user);

  res.status(201).json({
    token: createToken(user),
    user,
    message: "Tài khoản đã được tạo. Vui lòng xác thực email.",
    verifyUrl: env.NODE_ENV === "production" || env.SMTP_HOST ? undefined : verifyUrl,
  });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const input = credentialsSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng");
  }
  if (user.status !== "ACTIVE") throw new HttpError(403, "Tài khoản đã bị khóa");
  // Admin 2FA is temporarily bypassed while the admin authentication flow is being revised.
  if (requiresTwoFactorAtLogin(user)) {
    if (!user.twoFactorSecret) throw new HttpError(500, "Cấu hình 2FA không hợp lệ");
    if (!input.otp) {
      res.status(401).json({ message: "Vui lòng nhập mã xác thực 2FA", requiresTwoFactor: true });
      return;
    }
    const valid = await verifyTwoFactorToken(decryptTwoFactorSecret(user.twoFactorSecret), input.otp);
    if (!valid) throw new HttpError(401, "Mã xác thực 2FA không đúng");
  }

  res.json({
    token: createToken(user),
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, fullName: true, role: true, status: true, emailVerifiedAt: true },
  });
  if (!user || user.status !== "ACTIVE") throw new HttpError(401, "Tài khoản không khả dụng");
  res.json(user);
}));

router.post("/verify-email", asyncHandler(async (req, res) => {
  const { token } = z.object({ token: z.string().min(20) }).parse(req.body);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, "Liên kết xác thực không hợp lệ hoặc đã hết hạn");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);
  res.json({ message: "Email đã được xác thực" });
}));

router.post("/resend-verification", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new HttpError(404, "Không tìm thấy tài khoản");
  if (user.emailVerifiedAt) return res.json({ message: "Email đã được xác thực" });
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const verifyUrl = await createEmailVerification(user);
  res.json({
    message: "Đã gửi lại email xác thực",
    verifyUrl: env.NODE_ENV === "production" || env.SMTP_HOST ? undefined : verifyUrl,
  });
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

router.post("/forgot-password", asyncHandler(async (req, res) => {
  const input = forgotPasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  let resetUrl: string | undefined;

  if (user?.passwordHash) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });
    resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    let sent = false;
    try {
      sent = await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error("Password reset email failed", error);
    }
    if (!sent && env.NODE_ENV !== "production") {
      console.log(`Password reset URL for ${user.email}: ${resetUrl}`);
    }
  }

  res.status(202).json({
    message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
    resetUrl: env.NODE_ENV === "production" ? undefined : resetUrl,
  });
}));

router.post("/reset-password", asyncHandler(async (req, res) => {
  const input = resetPasswordSchema.parse(req.body);
  const tokenHash = hashResetToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new HttpError(400, "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
  }
  if (resetToken.user.status !== "ACTIVE") throw new HttpError(403, "Tài khoản đã bị khóa");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await bcrypt.hash(input.password, 12) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null, id: { not: resetToken.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  res.json({ message: "Mật khẩu đã được cập nhật" });
}));

export default router;
