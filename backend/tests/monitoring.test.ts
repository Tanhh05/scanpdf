import { describe, expect, it } from "vitest";
import { captureError, initMonitoring } from "../src/config/monitoring.js";

describe("monitoring helpers", () => {
  it("are safe when Sentry DSN is not configured", () => {
    expect(() => initMonitoring()).not.toThrow();
    expect(() => captureError(new Error("test"), { scope: "unit" })).not.toThrow();
  });
});
