import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { conversionQueue } from "./config/queue.js";
import { startCleanupScheduler } from "./services/cleanup-scheduler.js";

const server = app.listen(env.PORT, () => {
  console.log(`ScanPDF API listening on http://localhost:${env.PORT}`);
});
const stopCleanupScheduler = startCleanupScheduler();

async function shutdown() {
  stopCleanupScheduler();
  server.close();
  await conversionQueue.close();
  await prisma.$disconnect();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
