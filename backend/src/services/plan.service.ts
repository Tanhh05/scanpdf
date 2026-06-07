import { endOfDay, startOfDay } from "../utils/date.js";
import { prisma } from "../config/prisma.js";

export async function getUserPlan(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    include: { plan: true },
    orderBy: { startDate: "desc" },
  });
  if (subscription) return subscription.plan;

  const freePlan = await prisma.plan.findUnique({ where: { name: "Free" } });
  if (!freePlan) throw new Error("Chưa khởi tạo gói Free. Hãy chạy db:seed.");
  return freePlan;
}

export async function getDailyUsage(userId: string) {
  return prisma.usageLog.count({
    where: {
      userId,
      createdAt: { gte: startOfDay(), lte: endOfDay() },
    },
  });
}
