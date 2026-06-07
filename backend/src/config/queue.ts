import { Queue } from "bullmq";
import { env } from "./env.js";

export const redisConnection = { url: env.REDIS_URL };
export const conversionQueue = new Queue("document-conversions", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});
