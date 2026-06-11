import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { initMonitoring } from "./config/monitoring.js";
import { errorHandler } from "./middleware/error-handler.js";
import { apiRateLimit, authRateLimit, publicApiRateLimit } from "./middleware/rate-limit.js";
import { requestLogger } from "./middleware/request-logger.js";
import adminRoutes from "./routes/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import authRoutes from "./routes/auth.routes.js";
import convertRoutes from "./routes/convert.routes.js";
import downloadRoutes from "./routes/download.routes.js";
import fileRoutes from "./routes/file.routes.js";
import healthRoutes from "./routes/health.routes.js";
import planRoutes from "./routes/plan.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import teamRoutes from "./routes/team.routes.js";
import userRoutes from "./routes/user.routes.js";

export const app = express();
initMonitoring();

app.use(helmet());
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  ...env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
]);
app.use(cors({
  origin(origin, callback) {
    if (
      !origin
      || allowedOrigins.has(origin)
      || (env.NODE_ENV !== "production" && origin.startsWith("chrome-extension://"))
    ) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin không được phép"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);
app.use("/api", apiRateLimit);

app.use("/health", healthRoutes);
app.use("/api/auth", authRateLimit, authRoutes);
app.use("/api/convert", convertRoutes);
app.use("/api/v1/convert", publicApiRateLimit, convertRoutes);
app.use("/api/downloaders", publicApiRateLimit, downloadRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", userRoutes);
app.use(errorHandler);
