import { Worker } from "bullmq";
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/queue.js";
import { storage } from "../services/storage.service.js";
import { sendConversionResultEmail } from "../services/mail.service.js";
import {
  selectVideoHighlights,
  summarizeVideoTranscript,
  transcribeVideoWithSpeakers,
  translateTranscriptSegments,
  writeSrtFile,
  writeSummaryMarkdown,
} from "../services/video-ai.service.js";
import { removeImageWatermark, removeVideoWatermark } from "../services/watermark-removal.service.js";
import { captureError, initMonitoring } from "../config/monitoring.js";
import { runBinary } from "../utils/process.js";

initMonitoring();

type JobData = {
  conversionId: string;
  inputFileIds?: string[];
  options?: Record<string, unknown>;
};

type Output = {
  path: string;
  name: string;
  contentType: string;
};

async function wordToPdf(input: string, outputDir: string, baseName: string): Promise<Output> {
  await runBinary("soffice", ["--headless", "--convert-to", "pdf", "--outdir", outputDir, input], {
    timeout: 120_000,
  });
  return {
    path: path.join(outputDir, `${path.parse(input).name}.pdf`),
    name: `${baseName}.pdf`,
    contentType: "application/pdf",
  };
}

async function pdfToWord(input: string, outputDir: string, baseName: string): Promise<Output> {
  const textFile = path.join(outputDir, "content.txt");
  await runBinary("pdftotext", ["-layout", input, textFile], { timeout: 120_000 });
  const text = await readFile(textFile, "utf8");
  const document = new Document({
    sections: [{
      children: text.split(/\r?\n/).map((line) => new Paragraph({ text: line || " " })),
    }],
  });
  const output = path.join(outputDir, `${baseName}.docx`);
  await writeFile(output, await Packer.toBuffer(document));
  return {
    path: output,
    name: `${baseName}.docx`,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

async function mergePdf(inputs: string[], outputDir: string): Promise<Output> {
  const merged = await PDFDocument.create();
  for (const input of inputs) {
    const source = await PDFDocument.load(await readFile(input));
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const output = path.join(outputDir, "merged.pdf");
  await writeFile(output, await merged.save());
  return { path: output, name: "scanpdf-merged.pdf", contentType: "application/pdf" };
}

async function compressPdf(input: string, outputDir: string, baseName: string): Promise<Output> {
  const compressed = path.join(outputDir, `${baseName}-compressed.pdf`);
  await runBinary("gs", [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    "-dPDFSETTINGS=/ebook",
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    `-sOutputFile=${compressed}`,
    input,
  ], { timeout: 180_000 });
  const [originalBuffer, compressedBuffer] = await Promise.all([readFile(input), readFile(compressed)]);
  if (compressedBuffer.length >= originalBuffer.length) {
    await writeFile(compressed, originalBuffer);
  }
  return { path: compressed, name: `${baseName}-compressed.pdf`, contentType: "application/pdf" };
}

async function imagesToPdf(inputs: string[], outputDir: string): Promise<Output> {
  const document = await PDFDocument.create();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;
  for (const input of inputs) {
    const bytes = await readFile(input);
    const image = [".png"].includes(path.extname(input).toLowerCase())
      ? await document.embedPng(bytes)
      : await document.embedJpg(bytes);
    const scale = Math.min(
      (pageWidth - margin * 2) / image.width,
      (pageHeight - margin * 2) / image.height,
      1,
    );
    const width = image.width * scale;
    const height = image.height * scale;
    const page = document.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }
  const output = path.join(outputDir, "images.pdf");
  await writeFile(output, await document.save());
  return { path: output, name: "scanpdf-images.pdf", contentType: "application/pdf" };
}

async function createZip(files: string[], output: string) {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(path.basename(file), await readFile(file));
  }
  await writeFile(output, await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  }));
}

async function pdfToJpg(input: string, outputDir: string, baseName: string): Promise<Output> {
  const prefix = path.join(outputDir, baseName);
  await runBinary("pdftoppm", ["-jpeg", "-r", "150", "-jpegopt", "quality=85", input, prefix], {
    timeout: 180_000,
  });
  const images = (await readdir(outputDir))
    .filter((name) => name.startsWith(`${baseName}-`) && name.endsWith(".jpg"))
    .sort()
    .map((name) => path.join(outputDir, name));
  if (!images.length) throw new Error("Không thể tạo ảnh từ PDF");
  const output = path.join(outputDir, `${baseName}-jpg.zip`);
  await createZip(images, output);
  return { path: output, name: `${baseName}-jpg.zip`, contentType: "application/zip" };
}

async function ocrPdf(input: string, outputDir: string, baseName: string): Promise<Output> {
  const imagePrefix = path.join(outputDir, "ocr-page");
  await runBinary("pdftoppm", ["-png", "-r", "200", input, imagePrefix], { timeout: 180_000 });
  const images = (await readdir(outputDir))
    .filter((name) => name.startsWith("ocr-page-") && name.endsWith(".png"))
    .sort()
    .map((name) => path.join(outputDir, name));
  if (!images.length) throw new Error("Không thể đọc trang PDF để OCR");

  const pagePdfs = [];
  for (const [index, image] of images.entries()) {
    const outputBase = path.join(outputDir, `ocr-result-${index + 1}`);
    await runBinary("tesseract", [image, outputBase, "-l", "vie+eng", "pdf"], { timeout: 180_000 });
    pagePdfs.push(`${outputBase}.pdf`);
  }
  const output = await mergePdf(pagePdfs, outputDir);
  const finalPath = path.join(outputDir, `${baseName}-ocr.pdf`);
  await writeFile(finalPath, await readFile(output.path));
  return { path: finalPath, name: `${baseName}-ocr.pdf`, contentType: "application/pdf" };
}

async function splitPdf(input: string, outputDir: string, baseName: string): Promise<Output> {
  const source = await PDFDocument.load(await readFile(input));
  const pageFiles = [];
  for (const pageIndex of source.getPageIndices()) {
    const document = await PDFDocument.create();
    const [page] = await document.copyPages(source, [pageIndex]);
    if (!page) throw new Error("Không thể tách trang PDF");
    document.addPage(page);
    const output = path.join(outputDir, `${baseName}-page-${String(pageIndex + 1).padStart(3, "0")}.pdf`);
    await writeFile(output, await document.save());
    pageFiles.push(output);
  }
  const zipPath = path.join(outputDir, `${baseName}-split.zip`);
  await createZip(pageFiles, zipPath);
  return { path: zipPath, name: `${baseName}-split.zip`, contentType: "application/zip" };
}

async function rotatePdf(input: string, outputDir: string, baseName: string, angle: number): Promise<Output> {
  const document = await PDFDocument.load(await readFile(input));
  for (const page of document.getPages()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }
  const output = path.join(outputDir, `${baseName}-rotated.pdf`);
  await writeFile(output, await document.save());
  return { path: output, name: `${baseName}-rotated.pdf`, contentType: "application/pdf" };
}

function parsePageSet(value: unknown, pageCount: number) {
  if (typeof value !== "string") throw new Error("Danh sách trang không hợp lệ");
  const pages = new Set<number>();
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < start || end > pageCount) throw new Error("Khoảng trang không hợp lệ");
      for (let page = start; page <= end; page += 1) pages.add(page - 1);
      continue;
    }
    const page = Number(trimmed);
    if (!Number.isInteger(page) || page < 1 || page > pageCount) throw new Error("Số trang không hợp lệ");
    pages.add(page - 1);
  }
  return pages;
}

async function deletePdfPages(input: string, outputDir: string, baseName: string, pagesOption: unknown): Promise<Output> {
  const source = await PDFDocument.load(await readFile(input));
  const deletePages = parsePageSet(pagesOption, source.getPageCount());
  const keepPages = source.getPageIndices().filter((index) => !deletePages.has(index));
  if (!keepPages.length) throw new Error("Không thể xóa toàn bộ trang PDF");
  const document = await PDFDocument.create();
  const pages = await document.copyPages(source, keepPages);
  pages.forEach((page) => document.addPage(page));
  const output = path.join(outputDir, `${baseName}-pages-deleted.pdf`);
  await writeFile(output, await document.save());
  return { path: output, name: `${baseName}-pages-deleted.pdf`, contentType: "application/pdf" };
}

async function watermarkPdf(input: string, outputDir: string, baseName: string, textOption: unknown): Promise<Output> {
  const text = typeof textOption === "string" && textOption.trim() ? textOption.trim() : "ScanPDF";
  const document = await PDFDocument.load(await readFile(input));
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  for (const page of document.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.max(18, Math.min(width, height) / 18);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const horizontalStep = Math.max(textWidth + 90, width / 2.6);
    const verticalStep = Math.max(fontSize * 4.5, height / 5);
    for (let y = -height * 0.15; y < height * 1.2; y += verticalStep) {
      for (let x = -width * 0.25; x < width * 1.2; x += horizontalStep) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.38, 0.38, 0.38),
          opacity: 0.16,
          rotate: degrees(-35),
        });
      }
    }
  }
  const output = path.join(outputDir, `${baseName}-watermark.pdf`);
  await writeFile(output, await document.save());
  return { path: output, name: `${baseName}-watermark.pdf`, contentType: "application/pdf" };
}

function parsePageOrder(value: unknown, pageCount: number) {
  if (typeof value !== "string") throw new Error("Thứ tự trang không hợp lệ");
  const pages = value.split(",").map((part) => Number(part.trim()));
  if (
    pages.length !== pageCount
    || pages.some((page) => !Number.isInteger(page) || page < 1 || page > pageCount)
    || new Set(pages).size !== pageCount
  ) {
    throw new Error(`Vui lòng nhập đủ ${pageCount} trang, mỗi trang xuất hiện đúng một lần`);
  }
  return pages.map((page) => page - 1);
}

async function reorderPdf(input: string, outputDir: string, baseName: string, pagesOption: unknown): Promise<Output> {
  const source = await PDFDocument.load(await readFile(input));
  const order = parsePageOrder(pagesOption, source.getPageCount());
  const document = await PDFDocument.create();
  const pages = await document.copyPages(source, order);
  pages.forEach((page) => document.addPage(page));
  const output = path.join(outputDir, `${baseName}-reordered.pdf`);
  await writeFile(output, await document.save());
  return { path: output, name: `${baseName}-reordered.pdf`, contentType: "application/pdf" };
}

async function addPageNumbers(
  input: string,
  outputDir: string,
  baseName: string,
  positionOption: unknown,
): Promise<Output> {
  const position = typeof positionOption === "string" ? positionOption : "bottom-center";
  const document = await PDFDocument.load(await readFile(input));
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();

  pages.forEach((page, index) => {
    const text = `${index + 1} / ${pages.length}`;
    const size = 10;
    const margin = 24;
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = position.endsWith("right") ? width - textWidth - margin : (width - textWidth) / 2;
    const y = position.startsWith("top") ? height - margin : margin;
    page.drawText(text, { x, y, size, font, color: rgb(0.25, 0.25, 0.25) });
  });

  const output = path.join(outputDir, `${baseName}-numbered.pdf`);
  await writeFile(output, await document.save());
  return { path: output, name: `${baseName}-numbered.pdf`, contentType: "application/pdf" };
}

function getPdfPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 4 || value.length > 64) {
    throw new Error("Mật khẩu PDF phải có từ 4 đến 64 ký tự");
  }
  return value;
}

async function protectPdf(input: string, outputDir: string, baseName: string, passwordOption: unknown): Promise<Output> {
  const password = getPdfPassword(passwordOption);
  const output = path.join(outputDir, `${baseName}-protected.pdf`);
  await runBinary("qpdf", ["--encrypt", password, password, "256", "--", input, output], { timeout: 120_000 });
  return { path: output, name: `${baseName}-protected.pdf`, contentType: "application/pdf" };
}

async function unlockPdf(input: string, outputDir: string, baseName: string, passwordOption: unknown): Promise<Output> {
  const password = getPdfPassword(passwordOption);
  const output = path.join(outputDir, `${baseName}-unlocked.pdf`);
  try {
    await runBinary("qpdf", [`--password=${password}`, "--decrypt", input, output], { timeout: 120_000 });
  } catch {
    throw new Error("Không thể mở khóa PDF. Vui lòng kiểm tra lại mật khẩu");
  }
  return { path: output, name: `${baseName}-unlocked.pdf`, contentType: "application/pdf" };
}

async function signPdf(
  input: string,
  outputDir: string,
  baseName: string,
  signerOption: unknown,
  positionOption: unknown,
): Promise<Output> {
  const signer = typeof signerOption === "string" ? signerOption.trim() : "";
  if (signer.length < 2 || signer.length > 80) throw new Error("Tên người ký không hợp lệ");
  const position = positionOption === "bottom-left" ? "bottom-left" : "bottom-right";
  const document = await PDFDocument.load(await readFile(input));
  const font = await document.embedFont(StandardFonts.HelveticaOblique);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const page = document.getPages().at(-1);
  if (!page) throw new Error("PDF không có trang");
  const { width } = page.getSize();
  const signature = `Signed by ${signer}`;
  const date = new Date().toISOString().slice(0, 10);
  const signatureWidth = font.widthOfTextAtSize(signature, 18);
  const x = position === "bottom-left" ? 36 : width - signatureWidth - 36;
  page.drawText(signature, { x, y: 52, size: 18, font, color: rgb(0.08, 0.2, 0.55) });
  page.drawText(`ScanPDF visual signature - ${date}`, {
    x,
    y: 36,
    size: 8,
    font: regular,
    color: rgb(0.35, 0.35, 0.35),
  });
  const output = path.join(outputDir, `${baseName}-signed.pdf`);
  await writeFile(output, await document.save());
  return { path: output, name: `${baseName}-signed.pdf`, contentType: "application/pdf" };
}

async function compressVideo(input: string, outputDir: string, baseName: string): Promise<Output> {
  const output = path.join(outputDir, `${baseName}-compressed.mp4`);
  await runBinary("ffmpeg", [
    "-y",
    "-i", input,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    output,
  ], { timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  return { path: output, name: `${baseName}-compressed.mp4`, contentType: "video/mp4" };
}

async function convertVideoToMp4(input: string, outputDir: string, baseName: string): Promise<Output> {
  const output = path.join(outputDir, `${baseName}.mp4`);
  await runBinary("ffmpeg", [
    "-y",
    "-i", input,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "160k",
    output,
  ], { timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  return { path: output, name: `${baseName}.mp4`, contentType: "video/mp4" };
}

async function videoToGif(input: string, outputDir: string, baseName: string): Promise<Output> {
  const palette = path.join(outputDir, `${baseName}-palette.png`);
  const output = path.join(outputDir, `${baseName}.gif`);
  await runBinary("ffmpeg", [
    "-y",
    "-i", input,
    "-vf", "fps=10,scale=720:-1:flags=lanczos,palettegen",
    palette,
  ], { timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  await runBinary("ffmpeg", [
    "-y",
    "-i", input,
    "-i", palette,
    "-lavfi", "fps=10,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse",
    output,
  ], { timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  return { path: output, name: `${baseName}.gif`, contentType: "image/gif" };
}

async function extractAudio(input: string, outputDir: string, baseName: string): Promise<Output> {
  const output = path.join(outputDir, `${baseName}.mp3`);
  await runBinary("ffmpeg", [
    "-y",
    "-i", input,
    "-vn",
    "-acodec", "libmp3lame",
    "-q:a", "2",
    output,
  ], { timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  return { path: output, name: `${baseName}.mp3`, contentType: "audio/mpeg" };
}

async function mergeVideos(inputs: string[], outputDir: string): Promise<Output> {
  if (inputs.length < 2) throw new Error("Ghép video cần ít nhất hai file");
  const listPath = path.join(outputDir, "merge-list.txt");
  await writeFile(listPath, inputs.map((input) => `file '${input.replace(/'/g, "'\\''")}'`).join("\n"), "utf8");
  const output = path.join(outputDir, "merged-video.mp4");
  await runBinary("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "160k",
    output,
  ], { timeout: 900_000, maxBuffer: 8 * 1024 * 1024 });
  return { path: output, name: "scanpdf-merged-video.mp4", contentType: "video/mp4" };
}

async function trimVideo(input: string, outputDir: string, baseName: string, startOption: unknown, endOption: unknown): Promise<Output> {
  const start = Number(startOption ?? 0);
  const end = Number(endOption ?? 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new Error("Khoảng cắt video không hợp lệ");
  }
  const output = path.join(outputDir, `${baseName}-trimmed.mp4`);
  await runBinary("ffmpeg", [
    "-y",
    "-ss", `${start}`,
    "-to", `${end}`,
    "-i", input,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "160k",
    output,
  ], { timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
  return { path: output, name: `${baseName}-trimmed.mp4`, contentType: "video/mp4" };
}

async function autoSubtitleVideo(input: string, outputDir: string, baseName: string, translateToOption: unknown): Promise<Output> {
  const { segments } = await transcribeVideoWithSpeakers(input);
  const translateTo = translateToOption === "vi" || translateToOption === "en" ? translateToOption : "none";
  const translatedSegments = translateTo === "none" ? segments : await translateTranscriptSegments(segments, translateTo);
  const output = path.join(outputDir, `${baseName}.srt`);
  await writeSrtFile(output, translatedSegments);
  return { path: output, name: `${baseName}.srt`, contentType: "application/x-subrip" };
}

async function summarizeVideo(input: string, outputDir: string, baseName: string): Promise<Output> {
  const { segments } = await transcribeVideoWithSpeakers(input);
  const summary = await summarizeVideoTranscript(segments);
  const output = path.join(outputDir, `${baseName}-summary.md`);
  await writeSummaryMarkdown(output, `${baseName} video summary`, summary, segments);
  return { path: output, name: `${baseName}-summary.md`, contentType: "text/markdown" };
}

async function generateShorts(input: string, outputDir: string, baseName: string): Promise<Output> {
  const { segments } = await transcribeVideoWithSpeakers(input);
  const highlights = await selectVideoHighlights(segments);
  const clipPaths: string[] = [];
  const metadataPath = path.join(outputDir, `${baseName}-highlights.txt`);
  const metadataLines: string[] = [];

  for (const [index, clip] of highlights.entries()) {
    const output = path.join(outputDir, `${baseName}-short-${index + 1}.mp4`);
    await runBinary("ffmpeg", [
      "-y",
      "-ss", `${clip.start}`,
      "-to", `${clip.end}`,
      "-i", input,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "160k",
      output,
    ], { timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
    clipPaths.push(output);
    metadataLines.push(`Clip ${index + 1}: ${clip.title}\nStart: ${clip.start}s\nEnd: ${clip.end}s\n`);
  }

  await writeFile(metadataPath, metadataLines.join("\n"), "utf8");
  const zipPath = path.join(outputDir, `${baseName}-shorts.zip`);
  await createZip([...clipPaths, metadataPath], zipPath);
  return { path: zipPath, name: `${baseName}-shorts.zip`, contentType: "application/zip" };
}

async function processConversion(
  tool: string,
  inputs: string[],
  outputDir: string,
  baseName: string,
  options: Record<string, unknown> = {},
): Promise<Output> {
  switch (tool) {
    case "WORD_TO_PDF": return wordToPdf(inputs[0]!, outputDir, baseName);
    case "PDF_TO_WORD": return pdfToWord(inputs[0]!, outputDir, baseName);
    case "MERGE_PDF": return mergePdf(inputs, outputDir);
    case "COMPRESS_PDF": return compressPdf(inputs[0]!, outputDir, baseName);
    case "JPG_TO_PDF": return imagesToPdf(inputs, outputDir);
    case "PDF_TO_JPG": return pdfToJpg(inputs[0]!, outputDir, baseName);
    case "OCR_PDF": return ocrPdf(inputs[0]!, outputDir, baseName);
    case "SPLIT_PDF": return splitPdf(inputs[0]!, outputDir, baseName);
    case "ROTATE_PDF": return rotatePdf(inputs[0]!, outputDir, baseName, Number(options.angle ?? 90));
    case "DELETE_PDF_PAGES": return deletePdfPages(inputs[0]!, outputDir, baseName, options.pages);
    case "WATERMARK_PDF": return watermarkPdf(inputs[0]!, outputDir, baseName, options.text);
    case "REORDER_PDF": return reorderPdf(inputs[0]!, outputDir, baseName, options.pages);
    case "ADD_PAGE_NUMBERS": return addPageNumbers(inputs[0]!, outputDir, baseName, options.position);
    case "PROTECT_PDF": return protectPdf(inputs[0]!, outputDir, baseName, options.password);
    case "UNLOCK_PDF": return unlockPdf(inputs[0]!, outputDir, baseName, options.password);
    case "SIGN_PDF": return signPdf(inputs[0]!, outputDir, baseName, options.signer, options.position);
    case "REMOVE_WATERMARK_IMAGE": return removeImageWatermark(inputs[0]!, outputDir, baseName, options);
    case "REMOVE_WATERMARK_VIDEO": return removeVideoWatermark(inputs[0]!, outputDir, baseName, options);
    case "VIDEO_COMPRESS": return compressVideo(inputs[0]!, outputDir, baseName);
    case "VIDEO_CONVERT": return convertVideoToMp4(inputs[0]!, outputDir, baseName);
    case "VIDEO_TO_GIF": return videoToGif(inputs[0]!, outputDir, baseName);
    case "EXTRACT_AUDIO": return extractAudio(inputs[0]!, outputDir, baseName);
    case "VIDEO_MERGE": return mergeVideos(inputs, outputDir);
    case "VIDEO_TRIM": return trimVideo(inputs[0]!, outputDir, baseName, options.startSeconds, options.endSeconds);
    case "AUTO_SUBTITLE_VIDEO": return autoSubtitleVideo(inputs[0]!, outputDir, baseName, options.translateTo);
    case "VIDEO_SUMMARY": return summarizeVideo(inputs[0]!, outputDir, baseName);
    case "GENERATE_SHORTS": return generateShorts(inputs[0]!, outputDir, baseName);
    default: throw new Error(`Unsupported conversion tool: ${tool}`);
  }
}

const worker = new Worker<JobData>(
  "document-conversions",
  async (job) => {
    const conversion = await prisma.conversion.findUnique({
      where: { id: job.data.conversionId },
      include: { inputFile: true, user: true },
    });
    if (!conversion) throw new Error("Conversion not found");

    await prisma.conversion.update({
      where: { id: conversion.id },
      data: { status: "PROCESSING", startedAt: new Date(), errorMessage: null },
    });

    const workDir = await mkdtemp(path.join(tmpdir(), "scanpdf-"));
    try {
      const inputIds = job.data.inputFileIds?.length
        ? job.data.inputFileIds
        : [conversion.inputFileId];
      const records = await prisma.file.findMany({
        where: { id: { in: inputIds }, userId: conversion.userId },
      });
      const recordsById = new Map(records.map((file) => [file.id, file]));
      const orderedRecords = inputIds.map((id) => recordsById.get(id)).filter((file) => file !== undefined);
      if (orderedRecords.length !== inputIds.length) throw new Error("Một hoặc nhiều file đầu vào không tồn tại");

      const inputPaths = [];
      for (const [index, record] of orderedRecords.entries()) {
        const inputPath = path.join(workDir, `input-${index}${path.extname(record.originalName).toLowerCase()}`);
        await writeFile(inputPath, await storage.get(record.storageKey));
        inputPaths.push(inputPath);
      }

      const baseName = path.parse(conversion.inputFile.originalName).name;
      const output = await processConversion(conversion.tool, inputPaths, workDir, baseName, job.data.options);
      const outputExt = path.extname(output.path);
      const outputKey = `output/${conversion.userId}/${nanoid()}${outputExt}`;
      const outputBuffer = await readFile(output.path);
      await storage.put(outputKey, outputBuffer, output.contentType);

      const outputFile = await prisma.file.create({
        data: {
          userId: conversion.userId,
          originalName: output.name,
          storageKey: outputKey,
          fileType: output.contentType,
          fileSize: outputBuffer.length,
          expiredAt: conversion.inputFile.expiredAt,
        },
      });
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: {
          status: "COMPLETED",
          outputFileId: outputFile.id,
          finishedAt: new Date(),
        },
      });
      await sendConversionResultEmail(
        conversion.user.email,
        conversion.inputFile.originalName,
        "COMPLETED",
      ).catch((error) => console.error("Conversion email failed", error));
    } catch (error) {
      captureError(error, { conversionId: conversion.id, tool: conversion.tool, worker: "conversion" });
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error",
          finishedAt: new Date(),
        },
      });
      await sendConversionResultEmail(
        conversion.user.email,
        conversion.inputFile.originalName,
        "FAILED",
        error instanceof Error ? error.message : "Unknown error",
      ).catch((mailError) => console.error("Conversion email failed", mailError));
      throw error;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  },
  { connection: redisConnection, concurrency: 2 },
);

worker.on("ready", () => console.log("Conversion worker is ready"));
worker.on("failed", (job, error) => console.error(`Job ${job?.id} failed`, error));

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
