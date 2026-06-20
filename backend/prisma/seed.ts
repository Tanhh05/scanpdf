import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
config({ path: backendEnvPath });

const prisma = new PrismaClient();
const defaultAdminPassword = "Admin@123456";

const plans = [
  { name: "Free", price: 0, dailyLimit: 5, maxFileSizeMb: 10, storageDays: 1 },
  { name: "Pro", price: 10000, dailyLimit: 100, maxFileSizeMb: 100, storageDays: 7 },
  { name: "Business", price: 10000, dailyLimit: 1000, maxFileSizeMb: 200, storageDays: 30 },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const adminPassword = process.env.ADMIN_PASSWORD || defaultAdminPassword;
    const freePlan = await prisma.plan.findUniqueOrThrow({ where: { name: "Free" } });
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: "ADMIN",
        status: "ACTIVE",
        passwordHash: await bcrypt.hash(adminPassword, 12),
        emailVerifiedAt: new Date(),
      },
      create: {
        email: adminEmail,
        fullName: process.env.ADMIN_NAME?.trim() || "ScanPDF Admin",
        role: "ADMIN",
        status: "ACTIVE",
        passwordHash: await bcrypt.hash(adminPassword, 12),
        emailVerifiedAt: new Date(),
        subscriptions: {
          create: { planId: freePlan.id },
        },
      },
    });
    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId: admin.id, status: "ACTIVE" },
    });
    if (!activeSubscription) {
      await prisma.subscription.create({ data: { userId: admin.id, planId: freePlan.id } });
    }
    console.log(`Seeded admin user: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`Using default development admin password: ${defaultAdminPassword}`);
    }
  }
}

main()
  .finally(async () => prisma.$disconnect());
