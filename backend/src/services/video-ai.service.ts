import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { runBinary } from "../utils/process.js";

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

type DiarizedTranscriptionResponse = {
  text?: string;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
    speaker?: string;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type Highlight = {
  start: number;
  end: number;
  title: string;
};

type HighlightResponse = {
  clips?: Highlight[];
};

function requireOpenAiKey(feature: string) {
  if (!env.OPENAI_API_KEY) {
    throw new HttpError(503, `Chưa cấu hình OPENAI_API_KEY cho chức năng ${feature}`);
  }
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function secondsToSrtTime(totalSeconds: number) {
  const safeMs = Math.max(0, Math.round(totalSeconds * 1000));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const milliseconds = safeMs % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}

function serializeSrt(segments: TranscriptSegment[]) {
  return segments
    .map((segment, index) => `${index + 1}\n${secondsToSrtTime(segment.start)} --> ${secondsToSrtTime(segment.end)}\n${segment.text.trim()}\n`)
    .join("\n");
}

async function extractSpeechAudio(inputPath: string, outputPath: string) {
  await runBinary("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-b:a", "48k",
    outputPath,
  ], {
    timeout: 600_000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function runOpenAiText(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      instructions: "Bạn là trợ lý xử lý video cho ScanPDF. Trả lời ngắn gọn, chính xác, không thêm lời mở đầu dư thừa.",
      input: prompt,
      max_output_tokens: 1600,
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

export async function transcribeVideoWithSpeakers(inputPath: string) {
  requireOpenAiKey("AI video");
  const audioPath = `${inputPath}.speech.mp3`;
  await extractSpeechAudio(inputPath, audioPath);
  const audioBuffer = await readFile(audioPath);
  const form = new FormData();
  form.append("model", env.OPENAI_TRANSCRIBE_MODEL);
  form.append("response_format", "diarized_json");
  form.append("chunking_strategy", "auto");
  form.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), path.basename(audioPath));

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });
  const data = await response.json() as DiarizedTranscriptionResponse;
  if (!response.ok) {
    throw new HttpError(response.status >= 500 ? 502 : 400, data.error?.message ?? "OpenAI transcription trả về lỗi");
  }

  const segments = (data.segments ?? [])
    .map((segment) => ({
      start: typeof segment.start === "number" ? segment.start : 0,
      end: typeof segment.end === "number" ? segment.end : 0,
      text: normalizeText(segment.text ?? ""),
      speaker: segment.speaker,
    }))
    .filter((segment) => segment.text && segment.end > segment.start);

  if (!segments.length && data.text?.trim()) {
    return {
      transcript: data.text.trim(),
      segments: [{ start: 0, end: Math.max(1, data.text.trim().split(/\s+/).length / 2), text: data.text.trim() }],
    };
  }
  if (!segments.length) {
    throw new HttpError(502, "Không nhận được transcript từ video");
  }

  return {
    transcript: segments.map((segment) => segment.text).join(" ").trim(),
    segments,
  };
}

export async function translateTranscriptSegments(segments: TranscriptSegment[], targetLanguage: "vi" | "en") {
  requireOpenAiKey("dịch subtitle video");
  const payload = segments.map((segment, index) => ({
    i: index,
    start: segment.start,
    end: segment.end,
    text: segment.text,
  }));

  const translatedText = await runOpenAiText(
    `Translate the following subtitle segments to ${targetLanguage === "vi" ? "Vietnamese" : "English"}.\n`
    + "Keep the array length and ordering exactly the same. Return JSON only in the shape "
    + "{\"segments\":[{\"i\":0,\"text\":\"...\"}]}\n"
    + JSON.stringify({ segments: payload }),
  );

  let parsed: { segments?: Array<{ i?: number; text?: string }> };
  try {
    parsed = JSON.parse(translatedText);
  } catch {
    throw new HttpError(502, "AI trả về kết quả dịch subtitle không hợp lệ");
  }

  const translated = parsed.segments ?? [];
  if (translated.length !== segments.length) {
    throw new HttpError(502, "AI trả về thiếu segment subtitle");
  }

  return segments.map((segment, index) => ({
    ...segment,
    text: normalizeText(translated[index]?.text ?? segment.text),
  }));
}

function chunkTranscript(segments: TranscriptSegment[], maxChars = 12000) {
  const chunks: string[] = [];
  let current = "";
  for (const segment of segments) {
    const line = `[${segment.start.toFixed(1)}-${segment.end.toFixed(1)}] ${segment.text}`;
    if ((current + line).length > maxChars && current) {
      chunks.push(current.trim());
      current = `${line}\n`;
    } else {
      current += `${line}\n`;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function summarizeVideoTranscript(segments: TranscriptSegment[]) {
  requireOpenAiKey("tóm tắt video");
  const chunks = chunkTranscript(segments);
  const partials: string[] = [];
  for (const chunk of chunks) {
    partials.push(await runOpenAiText(
      "Đây là transcript video có mốc thời gian.\n"
      + "Hãy tóm tắt phần transcript này bằng tiếng Việt, giữ lại ý chính, mốc quan trọng, hành động hoặc phát biểu đáng chú ý.\n\n"
      + chunk,
    ));
  }

  return runOpenAiText(
    "Tổng hợp các bản tóm tắt video sau thành một kết quả cuối cùng bằng tiếng Việt.\n"
    + "Trả về theo cấu trúc:\n"
    + "1. Tóm tắt ngắn\n2. Các ý chính dạng bullet\n3. Mốc thời gian đáng chú ý\n\n"
    + partials.map((item, index) => `Phần ${index + 1}:\n${item}`).join("\n\n"),
  );
}

export async function selectVideoHighlights(segments: TranscriptSegment[]) {
  requireOpenAiKey("generate shorts");
  const prompt = [
    "Dưới đây là transcript video có timestamps.",
    "Hãy chọn tối đa 3 highlight tốt nhất để cắt thành short.",
    "Mỗi clip phải dài từ 15 đến 45 giây.",
    "Ưu tiên đoạn có nội dung hoàn chỉnh, có mở đầu-kết thúc đủ nghĩa, và đáng xem độc lập.",
    "Trả về JSON duy nhất với dạng {\"clips\":[{\"start\":12.3,\"end\":36.8,\"title\":\"...\"}]}",
    "Không trả lời thêm chữ nào ngoài JSON.",
    ...chunkTranscript(segments, 14000),
  ].join("\n\n");

  const result = await runOpenAiText(prompt);
  let parsed: HighlightResponse;
  try {
    parsed = JSON.parse(result);
  } catch {
    throw new HttpError(502, "AI không trả về JSON highlight hợp lệ");
  }
  const clips = (parsed.clips ?? [])
    .map((clip) => ({
      start: Number(clip.start),
      end: Number(clip.end),
      title: normalizeText(clip.title || "highlight"),
    }))
    .filter((clip) => Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.end > clip.start);

  if (!clips.length) {
    throw new HttpError(502, "AI không chọn được highlight phù hợp");
  }
  return clips.slice(0, 3);
}

export async function writeSummaryMarkdown(
  outputPath: string,
  title: string,
  summary: string,
  segments: TranscriptSegment[],
) {
  const transcript = segments
    .map((segment) => `- [${secondsToSrtTime(segment.start).replace(",", ".")} - ${secondsToSrtTime(segment.end).replace(",", ".")}] ${segment.text}`)
    .join("\n");
  const markdown = `# ${title}\n\n## Tóm tắt\n\n${summary}\n\n## Transcript\n\n${transcript}\n`;
  await writeFile(outputPath, markdown, "utf8");
}

export async function writeSrtFile(outputPath: string, segments: TranscriptSegment[]) {
  await writeFile(outputPath, serializeSrt(segments), "utf8");
}
