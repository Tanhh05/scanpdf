import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau." },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau 15 phút." },
});

export const publicApiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => String(req.headers["x-api-key"] ?? ipKeyGenerator(req.ip ?? "")),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Public API vượt quá 60 yêu cầu/phút." },
});
