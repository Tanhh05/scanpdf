import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
}

main()
  .finally(async () => prisma.$disconnect());
