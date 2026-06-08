import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("health endpoints", () => {
  it("returns liveness status and request id", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });
});
