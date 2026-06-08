import { prisma } from "../config/prisma.js";
import { storage } from "./storage.service.js";

export async function cleanupExpiredFiles(limit = 200) {
  const files = await prisma.file.findMany({
    where: { expiredAt: { lt: new Date() } },
    orderBy: { expiredAt: "asc" },
    take: limit,
  });

  let removedFromStorage = 0;
  for (const file of files) {
    await storage.remove(file.storageKey);
    removedFromStorage += 1;
  }

  return { scanned: files.length, removedFromStorage, removedFromDatabase: 0 };
}
