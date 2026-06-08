import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("auth guard", () => {
  it("rejects protected routes without a token", async () => {
    const response = await request(app).get("/api/profile").expect(401);
    expect(response.body.message).toBe("Bạn cần đăng nhập");
    expect(response.body.requestId).toBeTruthy();
  });
});
