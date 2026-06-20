import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env.js";
import { HttpError } from "../src/utils/http-error.js";

const findUnique = vi.fn();

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    user: { findUnique },
  },
}));

const { requireAuth } = await import("../src/middleware/auth.js");

function requestWithToken(token?: string) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as Request;
}

describe("requireAuth", () => {
  let next: NextFunction;

  beforeEach(() => {
    findUnique.mockReset();
    next = vi.fn();
  });

  it("rejects missing tokens", async () => {
    await expect(requireAuth(requestWithToken(), {} as Response, next))
      .rejects.toMatchObject({ status: 401, message: "Bạn cần đăng nhập" });
    expect(findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens before querying the database", async () => {
    await expect(requireAuth(requestWithToken("bad-token"), {} as Response, next))
      .rejects.toBeInstanceOf(HttpError);
    expect(findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("hydrates request user from the active database record", async () => {
    const req = requestWithToken(jwt.sign(
      { email: "stale@example.com", role: "ADMIN" },
      env.JWT_SECRET,
      { subject: "user-1" },
    ));
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "real@example.com",
      role: "USER",
      status: "ACTIVE",
    });

    await requireAuth(req, {} as Response, next);

    expect(req.user).toEqual({ id: "user-1", email: "real@example.com", role: "USER" });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, email: true, role: true, status: true },
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects tokens for suspended users", async () => {
    const token = jwt.sign({}, env.JWT_SECRET, { subject: "user-1" });
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "real@example.com",
      role: "USER",
      status: "SUSPENDED",
    });

    await expect(requireAuth(requestWithToken(token), {} as Response, next))
      .rejects.toMatchObject({ status: 401, message: "Tài khoản không khả dụng" });
    expect(next).not.toHaveBeenCalled();
  });
});
