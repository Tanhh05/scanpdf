import { env } from "../config/env.js";
import { cleanupExpiredFiles } from "./cleanup.service.js";

export function startCleanupScheduler() {
  if (env.CLEANUP_INTERVAL_MINUTES === 0) return () => undefined;

  const runCleanup = async () => {
    try {
      const result = await cleanupExpiredFiles(env.CLEANUP_BATCH_SIZE);
      if (result.scanned > 0) {
        console.log(`Expired file cleanup: ${result.removedFromStorage}/${result.scanned} storage objects removed`);
      }
    } catch (error) {
      console.error("Expired file cleanup failed", error);
    }
  };

  const timer = setInterval(runCleanup, env.CLEANUP_INTERVAL_MINUTES * 60_000);
  timer.unref();
  void runCleanup();

  return () => clearInterval(timer);
}
