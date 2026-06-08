import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { storage } from "../src/services/storage.service.js";

const token = `share-test-${crypto.randomUUID()}`;
const storageKey = `output/test/${crypto.randomUUID()}.txt`;
const createdIds: { userId?: string; fileId?: string; shareId?: string } = {};

function hashPublicToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

describe("public share download", () => {
  it("downloads password-protected shared file without auth when password is correct", async () => {
    const user = await prisma.user.create({
      data: {
        email: `share-${crypto.randomUUID()}@example.com`,
        fullName: "Người dùng chia sẻ",
        passwordHash: await bcrypt.hash("password123", 12),
      },
    });
    createdIds.userId = user.id;
    await storage.put(storageKey, Buffer.from("scanpdf shared content"), "text/plain");
    const file = await prisma.file.create({
      data: {
        userId: user.id,
        originalName: "tai-lieu-chia-se.txt",
        storageKey,
        fileType: "text/plain",
        fileSize: 22,
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    createdIds.fileId = file.id;
    const share = await prisma.fileShare.create({
      data: {
        userId: user.id,
        fileId: file.id,
        tokenHash: hashPublicToken(token),
        passwordHash: await bcrypt.hash("1234", 12),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    createdIds.shareId = share.id;

    const wrongPassword = await request(app)
      .get(`/api/files/share/${encodeURIComponent(token)}/download`)
      .query({ password: "12" })
      .expect(401);
    expect(wrongPassword.body.message).toBe("Mật khẩu chia sẻ không đúng");

    const response = await request(app)
      .get(`/api/files/share/${encodeURIComponent(token)}/download`)
      .query({ password: "1234" })
      .expect(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.text).toBe("scanpdf shared content");
  });
});

afterAll(async () => {
  if (createdIds.shareId) await prisma.fileShare.deleteMany({ where: { id: createdIds.shareId } });
  if (createdIds.fileId) await prisma.file.deleteMany({ where: { id: createdIds.fileId } });
  if (createdIds.userId) await prisma.user.deleteMany({ where: { id: createdIds.userId } });
  await storage.remove(storageKey);
});
