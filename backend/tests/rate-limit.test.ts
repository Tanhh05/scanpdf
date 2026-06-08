import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("rate limit headers", () => {
  it("adds rate limit metadata to API responses", async () => {
    const response = await request(app).get("/api/profile").expect(401);
    expect(response.headers["ratelimit"]).toBeTruthy();
  });
});
