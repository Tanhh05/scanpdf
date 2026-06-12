import { describe, expect, it } from "vitest";
import { buildAssets, detectProvider, isSupportedSourceUrl, providerLabel } from "../src/services/downloader.service.js";

describe("downloader service", () => {
  it("detects supported providers from extractor metadata", () => {
    expect(detectProvider({ extractor: "TikTok", extractor_key: "", webpage_url: "", original_url: "" })).toBe("tiktok");
    expect(detectProvider({ extractor: "", extractor_key: "Instagram", webpage_url: "", original_url: "" })).toBe("instagram");
    expect(detectProvider({ extractor: "", extractor_key: "", webpage_url: "https://www.facebook.com/reel/123", original_url: "" })).toBe("facebook");
    expect(detectProvider({ extractor: "", extractor_key: "", webpage_url: "", original_url: "https://youtu.be/abc" })).toBe("youtube");
    expect(detectProvider({ extractor: "", extractor_key: "", webpage_url: "", original_url: "" })).toBeNull();
  });

  it("builds video and audio assets for media posts", () => {
    const result = buildAssets("tiktok", {
      title: "Demo video",
      formats: [
        { format_id: "18", ext: "mp4", url: "https://cdn.example.com/360.mp4", height: 360, vcodec: "avc1", acodec: "aac" },
        { format_id: "22", ext: "mp4", url: "https://cdn.example.com/720.mp4", height: 720, vcodec: "avc1", acodec: "aac" },
      ],
    }, "https://www.tiktok.com/@scanpdf/video/1");

    expect(result.assets.some((asset) => asset.kind === "video")).toBe(true);
    expect(result.assets.some((asset) => asset.kind === "audio" && asset.format === "mp3")).toBe(true);
  });

  it("builds image assets for slideshow/carousel entries", () => {
    const result = buildAssets("instagram", {
      title: "Carousel post",
      entries: [
        { url: "https://cdn.example.com/1.jpg", ext: "jpg", width: 1080, height: 1350 },
        { url: "https://cdn.example.com/2.jpg", ext: "jpg", width: 1080, height: 1350 },
      ],
    }, "https://www.instagram.com/p/scanpdf");

    expect(result.assets.filter((asset) => asset.kind === "image")).toHaveLength(2);
    expect(result.warnings.some((item) => item.includes("Carousel"))).toBe(true);
  });

  it("returns human labels for providers", () => {
    expect(providerLabel("youtube")).toBe("YouTube");
  });

  it("accepts TikTok short links but rejects TikTok profile URLs", () => {
    expect(isSupportedSourceUrl("tiktok", "https://vt.tiktok.com/ZSQ5UUxpt/")).toBe(true);
    expect(isSupportedSourceUrl("tiktok", "https://vm.tiktok.com/ZSQ5UUxpt/")).toBe(true);
    expect(isSupportedSourceUrl("tiktok", "https://www.tiktok.com/@scanpdf")).toBe(false);
  });
});
