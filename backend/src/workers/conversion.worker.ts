import { Worker } from "bullmq";
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/queue.js";
import { storage } from "../services/storage.service.js";

const run = promisify(execFile);

type JobData = {
  conversionId: string;
  inputFileIds?: string[];
};

type Output = {
  path: string;
  name: string;
  contentType: string;
};

async function wordToPdf(input: string, outputDir: string, baseName: string): Promise<Output> {
  await run("soffice", ["--headless", "--convert-to", "pdf", "--outdir", outputDir, input], {
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
  await run("pdftotext", ["-layout", input, textFile], { timeout: 120_000 });
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
  await run("gs", [
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
  await run("pdftoppm", ["-jpeg", "-r", "150", "-jpegopt", "quality=85", input, prefix], {
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
  await run("pdftoppm", ["-png", "-r", "200", input, imagePrefix], { timeout: 180_000 });
  const images = (await readdir(outputDir))
    .filter((name) => name.startsWith("ocr-page-") && name.endsWith(".png"))
    .sort()
    .map((name) => path.join(outputDir, name));
  if (!images.length) throw new Error("Không thể đọc trang PDF để OCR");

  const pagePdfs = [];
  for (const [index, image] of images.entries()) {
    const outputBase = path.join(outputDir, `ocr-result-${index + 1}`);
    await run("tesseract", [image, outputBase, "-l", "vie+eng", "pdf"], { timeout: 180_000 });
    pagePdfs.push(`${outputBase}.pdf`);
  }
  const output = await mergePdf(pagePdfs, outputDir);
  const finalPath = path.join(outputDir, `${baseName}-ocr.pdf`);
  await writeFile(finalPath, await readFile(output.path));
  return { path: finalPath, name: `${baseName}-ocr.pdf`, contentType: "application/pdf" };
}

async function processConversion(
  tool: string,
  inputs: string[],
  outputDir: string,
  baseName: string,
): Promise<Output> {
  switch (tool) {
    case "WORD_TO_PDF": return wordToPdf(inputs[0]!, outputDir, baseName);
    case "PDF_TO_WORD": return pdfToWord(inputs[0]!, outputDir, baseName);
    case "MERGE_PDF": return mergePdf(inputs, outputDir);
    case "COMPRESS_PDF": return compressPdf(inputs[0]!, outputDir, baseName);
    case "JPG_TO_PDF": return imagesToPdf(inputs, outputDir);
    case "PDF_TO_JPG": return pdfToJpg(inputs[0]!, outputDir, baseName);
    case "OCR_PDF": return ocrPdf(inputs[0]!, outputDir, baseName);
    default: throw new Error(`Unsupported conversion tool: ${tool}`);
  }
}

const worker = new Worker<JobData>(
  "document-conversions",
  async (job) => {
    const conversion = await prisma.conversion.findUnique({
      where: { id: job.data.conversionId },
      include: { inputFile: true },
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
      const output = await processConversion(conversion.tool, inputPaths, workDir, baseName);
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
    } catch (error) {
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error",
          finishedAt: new Date(),
        },
      });
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
