import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("public API guard", () => {
  it("rejects conversion requests without auth or API key", async () => {
    const response = await request(app).post("/api/v1/convert/compress-pdf").expect(401);
    expect(response.body.message).toBe("Bạn cần đăng nhập");
  });
});
