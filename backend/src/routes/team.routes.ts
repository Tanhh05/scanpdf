import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getDailyUsage, getUserPlan } from "../services/plan.service.js";
import { sendTeamInviteEmail } from "../services/mail.service.js";
import { startOfDay } from "../utils/date.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();
router.use(requireAuth);

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requireTeamRole(userId: string, teamId: string, allowed: Array<"OWNER" | "ADMIN" | "MEMBER">) {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { team: true },
  });
  if (!member || !allowed.includes(member.role)) throw new HttpError(403, "Bạn không có quyền trong team này");
  return member;
}

router.get("/", asyncHandler(async (req, res) => {
  const teams = await prisma.team.findMany({
    where: { members: { some: { userId: req.user!.id } } },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
      },
      invites: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(teams);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(80) }).parse(req.body);
  const plan = await getUserPlan(req.user!.id);
  if (plan.name !== "Business") throw new HttpError(403, "Team workspace chỉ dành cho gói Business");
  const team = await prisma.team.create({
    data: {
      name,
      ownerId: req.user!.id,
      members: { create: { userId: req.user!.id, role: "OWNER" } },
    },
    include: { members: true },
  });
  res.status(201).json(team);
}));

router.get("/:id/usage", asyncHandler(async (req, res) => {
  const teamId = String(req.params.id ?? "");
  await requireTeamRole(req.user!.id, teamId, ["OWNER", "ADMIN", "MEMBER"]);
  const [ownerPlan, usedToday, totalConversions] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: true,
      },
    }).then(async (team) => {
      if (!team) throw new HttpError(404, "Không tìm thấy team");
      return getUserPlan(team.ownerId);
    }),
    prisma.usageLog.count({ where: { teamId, createdAt: { gte: startOfDay() } } }),
    prisma.conversion.count({ where: { teamId } }),
  ]);
  res.json({
    plan: ownerPlan,
    usedToday,
    remainingToday: Math.max(0, ownerPlan.dailyLimit - usedToday),
    totalConversions,
  });
}));

router.post("/:id/invites", asyncHandler(async (req, res) => {
  const teamId = String(req.params.id ?? "");
  const input = z.object({
    email: z.email().transform((value) => value.toLowerCase()),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  }).parse(req.body);
  const member = await requireTeamRole(req.user!.id, teamId, ["OWNER", "ADMIN"]);
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser && await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: existingUser.id } } })) {
    throw new HttpError(409, "Người dùng đã ở trong team");
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      email: input.email,
      role: input.role,
      tokenHash: hashToken(token),
      invitedById: req.user!.id,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    },
  });
  const inviteUrl = `${env.FRONTEND_URL}/dashboard/teams/accept?token=${encodeURIComponent(token)}`;
  const sent = await sendTeamInviteEmail(input.email, member.team.name, inviteUrl);
  res.status(201).json({
    ...invite,
    inviteUrl: env.NODE_ENV === "production" || sent ? undefined : inviteUrl,
  });
}));

router.post("/invites/accept", asyncHandler(async (req, res) => {
  const { token } = z.object({ token: z.string().min(20) }).parse(req.body);
  const invite = await prisma.teamInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { team: true },
  });
  if (!invite || invite.status !== "PENDING" || invite.revokedAt || invite.expiresAt < new Date()) {
    throw new HttpError(400, "Lời mời không hợp lệ hoặc đã hết hạn");
  }
  if (invite.email !== req.user!.email.toLowerCase()) {
    throw new HttpError(403, "Email tài khoản không khớp với lời mời");
  }
  const membership = await prisma.$transaction(async (tx) => {
    const member = await tx.teamMember.upsert({
      where: { teamId_userId: { teamId: invite.teamId, userId: req.user!.id } },
      update: { role: invite.role },
      create: { teamId: invite.teamId, userId: req.user!.id, role: invite.role },
      include: { team: true },
    });
    await tx.teamInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return member;
  });
  res.json(membership);
}));

router.patch("/:teamId/members/:userId", asyncHandler(async (req, res) => {
  const teamId = String(req.params.teamId ?? "");
  const userId = String(req.params.userId ?? "");
  const { role } = z.object({ role: z.enum(["ADMIN", "MEMBER"]) }).parse(req.body);
  await requireTeamRole(req.user!.id, teamId, ["OWNER"]);
  const updated = await prisma.teamMember.update({
    where: { teamId_userId: { teamId, userId } },
    data: { role },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  res.json(updated);
}));

router.delete("/:teamId/members/:userId", asyncHandler(async (req, res) => {
  const teamId = String(req.params.teamId ?? "");
  const userId = String(req.params.userId ?? "");
  await requireTeamRole(req.user!.id, teamId, ["OWNER", "ADMIN"]);
  const target = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!target) throw new HttpError(404, "Không tìm thấy thành viên");
  if (target.role === "OWNER") throw new HttpError(400, "Không thể xóa owner khỏi team");
  await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  res.status(204).send();
}));

router.delete("/:teamId/invites/:inviteId", asyncHandler(async (req, res) => {
  const teamId = String(req.params.teamId ?? "");
  const inviteId = String(req.params.inviteId ?? "");
  await requireTeamRole(req.user!.id, teamId, ["OWNER", "ADMIN"]);
  const result = await prisma.teamInvite.updateMany({
    where: { id: inviteId, teamId, status: "PENDING" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  if (!result.count) throw new HttpError(404, "Không tìm thấy lời mời");
  res.status(204).send();
}));

export default router;
