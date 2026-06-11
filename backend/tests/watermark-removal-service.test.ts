import { describe, expect, it } from "vitest";
import { buildVideoFilter, resolveVideoRegions } from "../src/services/watermark-removal.service.js";

describe("watermark removal service", () => {
  it("creates dual-corner regions for TikTok preset", () => {
    const regions = resolveVideoRegions(1080, 1920, {
      preset: "tiktok-dual-corner",
      watermarkWidthPercent: 20,
      watermarkHeightPercent: 10,
    });

    expect(regions).toHaveLength(2);
    expect(regions[0]?.x).toBeLessThan(regions[1]?.x ?? 0);
    expect(regions[0]?.y).toBeLessThan(regions[1]?.y ?? 0);
  });

  it("adds bottom subtitle strip when configured", () => {
    const regions = resolveVideoRegions(1280, 720, {
      preset: "top-right",
      subtitleStripPercent: 14,
    });

    expect(regions).toHaveLength(2);
    expect(regions[1]?.x).toBe(0);
    expect(regions[1]?.width).toBe(1280);
    expect(regions[1]?.y).toBeGreaterThan(600);
  });

  it("builds ffmpeg filter chain from resolved regions", () => {
    const filter = buildVideoFilter(1080, 1920, {
      preset: "bottom-right",
      subtitleStripPercent: 12,
    });

    expect(filter).toContain("delogo=");
    expect(filter.split(",")).toHaveLength(2);
  });
});
