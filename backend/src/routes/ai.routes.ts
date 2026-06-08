import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { requireAuth } from "../middleware/auth.js";
import { getUserPlan } from "../services/plan.service.js";
import { extractPdfText, runPdfAi } from "../services/ai.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 200 * 1024 * 1024 },
});

router.use(requireAuth);

async function parsePdf(req: Express.Request) {
  const file = req.file;
  if (!file) throw new HttpError(400, "Vui lòng chọn file PDF");
  if (path.extname(file.originalname).toLowerCase() !== ".pdf") {
    throw new HttpError(400, "Chức năng AI hiện chỉ hỗ trợ PDF");
  }

  const plan = await getUserPlan(req.user!.id);
  if (file.size > plan.maxFileSizeMb * 1024 * 1024) {
    throw new HttpError(413, `File vượt quá giới hạn ${plan.maxFileSizeMb}MB`);
  }

  return extractPdfText(file.buffer);
}

router.post("/summary", upload.single("file"), asyncHandler(async (req, res) => {
  const text = await parsePdf(req);
  const result = await runPdfAi("summary", text);
  res.json({ result });
}));

router.post("/extract", upload.single("file"), asyncHandler(async (req, res) => {
  const text = await parsePdf(req);
  const result = await runPdfAi("extract", text);
  res.json({ result });
}));

router.post("/chat", upload.single("file"), asyncHandler(async (req, res) => {
  const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
  if (!question) throw new HttpError(400, "Vui lòng nhập câu hỏi");
  const text = await parsePdf(req);
  const result = await runPdfAi("chat", text, question);
  res.json({ result });
}));

export default router;
