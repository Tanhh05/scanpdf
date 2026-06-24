import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

const execFileAsync = promisify(execFile);
const MAX_DOCUMENT_CHARS = 32000;

type AiMode = "chat" | "summary" | "extract";
type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: { message?: string };
};
type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};
type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: { message?: string };
};

function requireProviderKey() {
  if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY) {
    throw new HttpError(503, "Chưa cấu hình GEMINI_API_KEY cho chức năng AI");
  }
  if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
    throw new HttpError(503, "Chưa cấu hình OPENAI_API_KEY cho chức năng AI");
  }
  if (env.AI_PROVIDER === "groq" && !env.GROQ_API_KEY) {
    throw new HttpError(503, "Chưa cấu hình GROQ_API_KEY cho chức năng AI");
  }
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
}

export async function extractPdfText(buffer: Buffer) {
  const dir = await mkdtemp(path.join(tmpdir(), "scanpdf-ai-"));
  const inputPath = path.join(dir, `${nanoid()}.pdf`);
  try {
    await writeFile(inputPath, buffer);
    let stdout = "";
    try {
      const result = await execFileAsync("pdftotext", ["-layout", inputPath, "-"], {
        maxBuffer: 12 * 1024 * 1024,
      });
      stdout = result.stdout;
    } catch (error) {
      const details = error as NodeJS.ErrnoException & { stderr?: string };
      if (details.code === "ENOENT") {
        throw new HttpError(503, "Máy chủ chưa cài Poppler/pdftotext. Local macOS chạy: brew install poppler");
      }
      const message = details.stderr?.trim() || details.message || "Không thể đọc nội dung PDF";
      throw new HttpError(422, `Không thể trích xuất văn bản từ PDF: ${message.slice(0, 300)}`);
    }
    const text = normalizeText(stdout);
    if (!text) {
      throw new HttpError(422, "Không đọc được văn bản trong PDF. Hãy thử OCR PDF trước rồi dùng AI.");
    }
    return text.slice(0, MAX_DOCUMENT_CHARS);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function buildPrompt(mode: AiMode, documentText: string, question?: string) {
  const base = `Nội dung PDF được trích xuất dưới đây. Chỉ dựa trên nội dung này, không bịa thêm thông tin.

--- NỘI DUNG PDF ---
${documentText}
--- HẾT NỘI DUNG PDF ---`;

  if (mode === "summary") {
    return `${base}

Hãy tóm tắt tài liệu bằng tiếng Việt theo cấu trúc:
1. Tóm tắt ngắn trong 3-5 câu.
2. Các ý chính dạng bullet.
3. Các con số/ngày tháng/điểm cần chú ý nếu có.`;
  }

  if (mode === "extract") {
    return `${base}

Hãy trích xuất thông tin quan trọng bằng tiếng Việt. Trả về dạng có tiêu đề rõ ràng:
- Loại tài liệu nếu suy luận được.
- Các bên/cá nhân/tổ chức liên quan.
- Ngày tháng, số tiền, mã số, điều khoản hoặc dữ kiện quan trọng.
- Các mục còn thiếu hoặc không tìm thấy.`;
  }

  return `${base}

Câu hỏi của người dùng: ${question ?? ""}

Hãy trả lời ngắn gọn, rõ ràng bằng tiếng Việt. Nếu tài liệu không có thông tin để trả lời, nói rõ là không tìm thấy trong tài liệu.`;
}

function limitDocumentTextForProvider(documentText: string) {
  if (env.AI_PROVIDER !== "groq" || documentText.length <= env.GROQ_MAX_DOCUMENT_CHARS) {
    return documentText;
  }

  return `${documentText.slice(0, env.GROQ_MAX_DOCUMENT_CHARS)}

[Ghi chú hệ thống: Nội dung PDF đã được rút gọn để phù hợp quota Groq free tier. Nếu câu hỏi cần phần bị cắt, hãy yêu cầu người dùng OCR/chia nhỏ tài liệu hoặc dùng provider có quota lớn hơn.]`;
}

export async function runPdfAi(mode: AiMode, documentText: string, question?: string) {
  requireProviderKey();
  const limitedDocumentText = limitDocumentTextForProvider(documentText);
  if (env.AI_PROVIDER === "gemini") {
    return runGeminiAi(mode, limitedDocumentText, question);
  }
  if (env.AI_PROVIDER === "groq") {
    return runGroqAi(mode, limitedDocumentText, question);
  }
  return runOpenAi(mode, limitedDocumentText, question);
}

async function runOpenAi(mode: AiMode, documentText: string, question?: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      instructions: "Bạn là trợ lý AI cho ScanPDF. Trả lời bằng tiếng Việt, chính xác, có cấu trúc, không suy đoán ngoài tài liệu.",
      input: buildPrompt(mode, documentText, question),
      max_output_tokens: mode === "chat" ? 900 : 1400,
    }),
  });

  const data = await response.json() as OpenAiResponse;
  if (!response.ok) {
    throw new HttpError(response.status >= 500 ? 502 : 400, data.error?.message ?? "OpenAI API trả về lỗi");
  }

  const outputText = data.output_text
    ?? data.output?.flatMap((item) => item.content ?? []).map((content) => content.text).filter(Boolean).join("\n");

  if (!outputText?.trim()) {
    throw new HttpError(502, "AI không trả về nội dung");
  }
  return outputText.trim();
}

async function runGeminiAi(mode: AiMode, documentText: string, question?: string) {
  const model = env.AI_MODEL ?? env.GEMINI_MODEL;
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
  url.searchParams.set("key", env.GEMINI_API_KEY!);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: "Bạn là trợ lý AI cho ScanPDF. Trả lời bằng tiếng Việt, chính xác, có cấu trúc, không suy đoán ngoài tài liệu." }],
      },
      contents: [{
        role: "user",
        parts: [{ text: buildPrompt(mode, documentText, question) }],
      }],
      generationConfig: {
        maxOutputTokens: mode === "chat" ? 900 : 1400,
        temperature: 0.2,
      },
    }),
  });

  const data = await response.json() as GeminiResponse;
  if (!response.ok) {
    throw new HttpError(response.status >= 500 ? 502 : 400, data.error?.message ?? "Gemini API trả về lỗi");
  }

  const outputText = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n");

  if (!outputText?.trim()) {
    throw new HttpError(502, "AI không trả về nội dung");
  }
  return outputText.trim();
}

async function runGroqAi(mode: AiMode, documentText: string, question?: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.AI_MODEL ?? env.GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "Bạn là trợ lý AI cho ScanPDF. Trả lời bằng tiếng Việt, chính xác, có cấu trúc, không suy đoán ngoài tài liệu.",
        },
        {
          role: "user",
          content: buildPrompt(mode, documentText, question),
        },
      ],
      max_tokens: mode === "chat" ? 450 : 650,
      temperature: 0.2,
    }),
  });

  const data = await response.json() as GroqResponse;
  if (!response.ok) {
    throw new HttpError(response.status >= 500 ? 502 : 400, data.error?.message ?? "Groq API trả về lỗi");
  }

  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText?.trim()) {
    throw new HttpError(502, "AI không trả về nội dung");
  }
  return outputText.trim();
}
