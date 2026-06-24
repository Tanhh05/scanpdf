import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { runBinary } from "../utils/process.js";

type ImageMode = "auto" | "logo" | "text" | "watermark";
type VideoPreset =
  | "tiktok-dual-corner"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

type VideoOptions = {
  preset?: unknown;
  watermarkWidthPercent?: unknown;
  watermarkHeightPercent?: unknown;
  subtitleStripPercent?: unknown;
};

type Region = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ProbeResult = {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
  }>;
};

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

const imageWatermarkScript = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../scripts/remove-watermark-image.py",
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildImagePrompt(mode: ImageMode, details?: unknown) {
  const detailText = typeof details === "string" ? details.trim() : "";
  const focus = (() => {
    switch (mode) {
      case "logo": return "logo hoặc nhãn thương hiệu bị chèn lên ảnh";
      case "text": return "chữ đè, caption cứng hoặc dòng chữ watermark";
      case "watermark": return "watermark trong suốt hoặc lớp phủ bản quyền";
      default: return "watermark, logo hoặc chữ đè lên ảnh";
    }
  })();

  return [
    "Remove the visible overlay cleanly from the image.",
    `Focus on removing ${focus}.`,
    "Reconstruct the covered background naturally.",
    "Preserve the original subject, framing, lighting, colors, and texture.",
    "Do not crop the image, do not add new objects, and do not restyle the photo.",
    detailText ? `Extra guidance: ${detailText}.` : "",
  ].filter(Boolean).join(" ");
}

function getContentTypeFromExt(filename: string) {
  switch (path.extname(filename).toLowerCase()) {
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    default: return "image/jpeg";
  }
}

function isQuotaOrBillingError(message: string) {
  return /billing|quota|rate limit|hard limit|insufficient/i.test(message);
}

async function probeMediaSize(inputPath: string, mediaType: "image" | "video") {
  const args = mediaType === "video"
    ? [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_type",
        "-of", "json",
        inputPath,
      ]
    : [
        "-v", "error",
        "-show_entries", "stream=width,height,codec_type",
        "-of", "json",
        inputPath,
      ];
  const { stdout } = await runBinary("ffprobe", args, { timeout: 120_000 });
  const data = JSON.parse(stdout) as ProbeResult;
  const stream = data.streams?.find((item) => item.width && item.height);
  if (!stream?.width || !stream.height) {
    throw new Error(mediaType === "video" ? "Không đọc được kích thước video" : "Không đọc được kích thước ảnh");
  }
  return { width: stream.width, height: stream.height };
}

function resolveImageRegions(width: number, height: number, options: Record<string, unknown> = {}) {
  const mode = (typeof options.mode === "string" ? options.mode : "auto") as ImageMode;
  const margin = Math.max(8, Math.round(Math.min(width, height) * 0.018));
  const cornerWidth = clamp(Math.round(width * 0.2), 52, width);
  const cornerHeight = clamp(Math.round(height * 0.11), 36, height);
  const regions: Region[] = [];

  const addRegion = (region: Region) => {
    const key = `${region.x}:${region.y}:${region.width}:${region.height}`;
    if (!regions.some((item) => `${item.x}:${item.y}:${item.width}:${item.height}` === key)) {
      regions.push(region);
    }
  };

  if (mode === "auto" || mode === "logo") {
    addRegion({ x: margin, y: margin, width: cornerWidth, height: cornerHeight });
    addRegion({
      x: clamp(width - cornerWidth - margin, 0, width),
      y: clamp(height - cornerHeight - margin, 0, height),
      width: cornerWidth,
      height: cornerHeight,
    });
  }

  if (mode === "auto" || mode === "text" || mode === "watermark") {
    const stripHeight = clamp(Math.round(height * 0.07), 36, 96);
    addRegion({
      x: margin,
      y: clamp(Math.round(height * 0.51), 0, Math.max(0, height - stripHeight)),
      width: clamp(width - margin * 2, 48, width),
      height: stripHeight,
    });
  }

  return regions;
}

async function removeImageWatermarkLocal(
  inputPath: string,
  outputDir: string,
  baseName: string,
  options: Record<string, unknown> = {},
) {
  const outputPath = path.join(outputDir, `${baseName}-watermark-removed.png`);

  try {
    await runBinary("python3", [imageWatermarkScript, inputPath, outputPath], {
      timeout: 180_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    return {
      path: outputPath,
      name: `${baseName}-watermark-removed.png`,
      contentType: "image/png",
    };
  } catch (error) {
    console.warn("OpenCV watermark removal failed, falling back to ffmpeg delogo", error);
  }

  const { width, height } = await probeMediaSize(inputPath, "image");
  const filter = resolveImageRegions(width, height, options)
    .map((region) => `delogo=x=${region.x}:y=${region.y}:w=${region.width}:h=${region.height}:show=0`)
    .join(",");
  if (!filter) throw new Error("Chưa có vùng watermark ảnh để xử lý");

  await runBinary("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vf", filter,
    "-frames:v", "1",
    outputPath,
  ], {
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
  });

  return {
    path: outputPath,
    name: `${baseName}-watermark-removed.png`,
    contentType: "image/png",
  };
}

export async function removeImageWatermark(
  inputPath: string,
  outputDir: string,
  baseName: string,
  options: Record<string, unknown> = {},
) {
  if (!env.OPENAI_API_KEY) {
    return removeImageWatermarkLocal(inputPath, outputDir, baseName, options);
  }

  const fileBuffer = await readFile(inputPath);
  const mimeType = getContentTypeFromExt(inputPath);
  const form = new FormData();
  form.append("model", env.OPENAI_IMAGE_MODEL);
  form.append("prompt", buildImagePrompt((options.mode as ImageMode | undefined) ?? "auto", options.details));
  form.append("image", new Blob([fileBuffer], { type: mimeType }), path.basename(inputPath));

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });

  const data = await response.json() as OpenAiImageResponse;
  if (!response.ok) {
    const message = data.error?.message ?? "OpenAI image edit trả về lỗi";
    if (isQuotaOrBillingError(message)) {
      return removeImageWatermarkLocal(inputPath, outputDir, baseName, options);
    }
    throw new HttpError(response.status >= 500 ? 502 : 400, message);
  }

  const base64 = data.data?.[0]?.b64_json;
  if (!base64) {
    throw new HttpError(502, "AI không trả về ảnh đã xử lý");
  }

  const outputPath = path.join(outputDir, `${baseName}-watermark-removed.png`);
  await writeFile(outputPath, Buffer.from(base64, "base64"));
  return {
    path: outputPath,
    name: `${baseName}-watermark-removed.png`,
    contentType: "image/png",
  };
}

export function resolveVideoRegions(
  width: number,
  height: number,
  options: VideoOptions = {},
) {
  const preset = (typeof options.preset === "string" ? options.preset : "tiktok-dual-corner") as VideoPreset;
  const watermarkWidthPercent = clamp(toNumber(options.watermarkWidthPercent, 18), 5, 40);
  const watermarkHeightPercent = clamp(toNumber(options.watermarkHeightPercent, 12), 5, 30);
  const subtitleStripPercent = clamp(toNumber(options.subtitleStripPercent, 0), 0, 30);
  const margin = Math.max(10, Math.round(Math.min(width, height) * 0.02));
  const boxWidth = clamp(Math.round(width * (watermarkWidthPercent / 100)), 48, width);
  const boxHeight = clamp(Math.round(height * (watermarkHeightPercent / 100)), 36, height);

  const place = (x: number, y: number): Region => ({
    x: clamp(Math.round(x), 0, Math.max(0, width - boxWidth)),
    y: clamp(Math.round(y), 0, Math.max(0, height - boxHeight)),
    width: boxWidth,
    height: boxHeight,
  });

  const regions: Region[] = [];
  if (preset === "tiktok-dual-corner") {
    regions.push(place(margin, margin));
    regions.push(place(width - boxWidth - margin, height - boxHeight - margin));
  } else if (preset === "top-left") {
    regions.push(place(margin, margin));
  } else if (preset === "top-right") {
    regions.push(place(width - boxWidth - margin, margin));
  } else if (preset === "bottom-left") {
    regions.push(place(margin, height - boxHeight - margin));
  } else if (preset === "bottom-right") {
    regions.push(place(width - boxWidth - margin, height - boxHeight - margin));
  } else if (preset === "bottom-center") {
    regions.push(place((width - boxWidth) / 2, height - boxHeight - margin));
  }

  if (subtitleStripPercent > 0) {
    const stripHeight = clamp(Math.round(height * (subtitleStripPercent / 100)), 24, height);
    regions.push({
      x: 0,
      y: clamp(height - stripHeight, 0, height),
      width,
      height: stripHeight,
    });
  }

  return regions;
}

export function buildVideoFilter(width: number, height: number, options: VideoOptions = {}) {
  const regions = resolveVideoRegions(width, height, options);
  if (!regions.length) {
    throw new Error("Chưa có vùng watermark hoặc subtitle để xử lý");
  }
  return regions.map((region) => `delogo=x=${region.x}:y=${region.y}:w=${region.width}:h=${region.height}:show=0`).join(",");
}

async function probeVideoSize(inputPath: string) {
  return probeMediaSize(inputPath, "video");
}

export async function removeVideoWatermark(
  inputPath: string,
  outputDir: string,
  baseName: string,
  options: Record<string, unknown> = {},
) {
  const { width, height } = await probeVideoSize(inputPath);
  const filter = buildVideoFilter(width, height, options);
  const outputPath = path.join(outputDir, `${baseName}-watermark-removed.mp4`);

  await runBinary("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vf", filter,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "192k",
    outputPath,
  ], {
    timeout: 600_000,
    maxBuffer: 8 * 1024 * 1024,
  });

  return {
    path: outputPath,
    name: `${baseName}-watermark-removed.mp4`,
    contentType: "video/mp4",
  };
}
