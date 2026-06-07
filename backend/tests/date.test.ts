import { describe, expect, it } from "vitest";
import { addDays, endOfDay, startOfDay } from "../src/utils/date.js";

describe("date helpers", () => {
  it("returns local day boundaries", () => {
    const date = new Date(2026, 5, 7, 12, 30);
    expect(startOfDay(date).getHours()).toBe(0);
    expect(endOfDay(date).getHours()).toBe(23);
  });

  it("adds storage days without mutating input", () => {
    const date = new Date(2026, 5, 7);
    expect(addDays(7, date).getDate()).toBe(14);
    expect(date.getDate()).toBe(7);
  });
});
