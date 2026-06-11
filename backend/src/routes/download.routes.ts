import { Router } from "express";
import { z } from "zod";
import {
  analyzeMedia,
  prepareAudioDownload,
  prepareVideoDownload,
  providerLabel,
  type DownloaderProvider,
} from "../services/downloader.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();
const providerSchema = z.enum(["tiktok", "facebook", "instagram", "youtube"]);

router.post("/:provider/analyze", asyncHandler(async (req, res) => {
  const provider = providerSchema.parse(req.params.provider) as DownloaderProvider;
  const { url } = z.object({ url: z.url() }).parse(req.body);
  const data = await analyzeMedia(provider, url);
  res.json(data);
}));

router.get("/file", asyncHandler(async (req, res) => {
  const query = z.object({
    provider: providerSchema,
    source: z.url(),
    mode: z.enum(["video", "audio"]),
    formatId: z.string().min(1).optional(),
    filename: z.string().min(1).max(160).default("scanpdf-download.bin"),
    ext: z.string().min(1).max(10).optional(),
  }).parse(req.query);

  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(query.filename)}`);

  if (query.mode === "video") {
    if (!query.formatId) throw new HttpError(400, "Thiếu format video");
    const prepared = await prepareVideoDownload({
      sourceUrl: query.source,
      formatId: query.formatId,
      title: query.filename.replace(/\.[^.]+$/, ""),
      extension: query.ext,
    });
    res.setHeader("Content-Type", prepared.contentType);
    res.on("finish", () => { void prepared.cleanup(); });
    res.on("close", () => { void prepared.cleanup(); });
    res.sendFile(prepared.filePath);
    return;
  }

  const prepared = await prepareAudioDownload(query.source, query.filename.replace(/\.[^.]+$/, ""));
  res.setHeader("Content-Type", prepared.contentType);
  res.on("finish", () => { void prepared.cleanup(); });
  res.on("close", () => { void prepared.cleanup(); });
  res.sendFile(prepared.filePath);
}));

router.get("/providers", (_req, res) => {
  const providers = providerSchema.options.map((value) => ({
    id: value,
    label: providerLabel(value),
  }));
  res.json(providers);
});

export default router;
