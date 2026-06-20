import { endOfDay, startOfDay } from "../utils/date.js";
import { prisma } from "../config/prisma.js";

const defaultFreePlan = {
  name: "Free",
  price: 0,
  dailyLimit: 5,
  maxFileSizeMb: 10,
  storageDays: 1,
};

export async function getFreePlan() {
  return prisma.plan.upsert({
    where: { name: defaultFreePlan.name },
    update: {},
    create: defaultFreePlan,
  });
}

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

  return getFreePlan();
}

export async function getDailyUsage(userId: string) {
  return prisma.usageLog.count({
    where: {
      userId,
      createdAt: { gte: startOfDay(), lte: endOfDay() },
    },
  });
}
