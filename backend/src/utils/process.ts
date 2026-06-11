import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type RunBinaryOptions = {
  timeout?: number;
  maxBuffer?: number;
};

function truncate(value: string, max = 1200) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

function formatArgs(args: string[]) {
  return args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(" ");
}

function mapMissingBinary(binary: string) {
  const names: Record<string, string> = {
    ffmpeg: "FFmpeg",
    ffprobe: "FFprobe",
    gs: "Ghostscript",
    soffice: "LibreOffice",
    pdftotext: "Poppler pdftotext",
    pdftoppm: "Poppler pdftoppm",
    qpdf: "qpdf",
    tesseract: "Tesseract OCR",
  };
  const label = names[binary] ?? binary;
  return `${label} chưa được cài trên server (${binary} not found)`;
}

export async function runBinary(binary: string, args: string[], options: RunBinaryOptions = {}) {
  try {
    const result = await execFileAsync(binary, args, {
      timeout: options.timeout,
      maxBuffer: options.maxBuffer,
    });
    if (result.stderr?.trim()) {
      console.info(`[process:${binary}] stderr: ${truncate(result.stderr)}`);
    }
    return result;
  } catch (error) {
    const details = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string; code?: string | number };
    console.error(`[process:${binary}] failed: ${binary} ${formatArgs(args)}`);
    if (details.stderr?.trim()) {
      console.error(`[process:${binary}] stderr: ${truncate(details.stderr)}`);
    }
    if (details.stdout?.trim()) {
      console.error(`[process:${binary}] stdout: ${truncate(details.stdout)}`);
    }
    if (details.code === "ENOENT") {
      throw new Error(mapMissingBinary(binary));
    }
    throw error;
  }
}
