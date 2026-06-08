import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("cross-platform CORS", () => {
  it("allows configured web origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:3000")
      .expect(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("allows Chrome extension origin in development", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", "chrome-extension://abcdefghijklmnop")
      .set("Access-Control-Request-Method", "POST")
      .expect(204);
    expect(response.headers["access-control-allow-origin"]).toBe("chrome-extension://abcdefghijklmnop");
  });
});
