import { describe, expect, it } from "vitest";
import { mapPayOSStatus } from "../src/services/payment.service.js";

describe("payment service", () => {
  it("maps PayOS statuses to internal statuses", () => {
    expect(mapPayOSStatus("PAID")).toBe("PAID");
    expect(mapPayOSStatus("CANCELLED")).toBe("CANCELLED");
    expect(mapPayOSStatus("EXPIRED")).toBe("CANCELLED");
    expect(mapPayOSStatus("FAILED")).toBe("FAILED");
    expect(mapPayOSStatus("PENDING")).toBeNull();
  });
});
