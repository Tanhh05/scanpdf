import { Worker } from "bullmq";
import { Document, Packer, Paragraph } from "docx";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { prisma } from "../config/prisma.js";
import { redisConnection } from "../config/queue.js";
import { storage } from "../services/storage.service.js";

const run = promisify(execFile);

async function wordToPdf(input: string, outputDir: string) {
  await run("soffice", [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    outputDir,
    input,
  ], { timeout: 120_000 });
  return path.join(outputDir, `${path.parse(input).name}.pdf`);
}

async function pdfToWord(input: string, outputDir: string) {
  const textFile = path.join(outputDir, "content.txt");
  await run("pdftotext", ["-layout", input, textFile], { timeout: 120_000 });
  const text = await readFile(textFile, "utf8");
  const document = new Document({
    sections: [{
      children: text.split(/\r?\n/).map((line) => new Paragraph({ text: line || " " })),
    }],
  });
  const output = path.join(outputDir, `${path.parse(input).name}.docx`);
  await writeFile(output, await Packer.toBuffer(document));
  return output;
}

const worker = new Worker<{ conversionId: string }>(
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
      const inputExt = path.extname(conversion.inputFile.originalName).toLowerCase();
      const inputPath = path.join(workDir, `input${inputExt}`);
      await writeFile(inputPath, await storage.get(conversion.inputFile.storageKey));

      const outputPath = conversion.tool === "WORD_TO_PDF"
        ? await wordToPdf(inputPath, workDir)
        : await pdfToWord(inputPath, workDir);
      const outputExt = path.extname(outputPath);
      const outputName = `${path.parse(conversion.inputFile.originalName).name}${outputExt}`;
      const outputKey = `output/${conversion.userId}/${nanoid()}${outputExt}`;
      const outputBuffer = await readFile(outputPath);
      const fileType = outputExt === ".pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      await storage.put(outputKey, outputBuffer, fileType);
      const outputFile = await prisma.file.create({
        data: {
          userId: conversion.userId,
          originalName: outputName,
          storageKey: outputKey,
          fileType,
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
