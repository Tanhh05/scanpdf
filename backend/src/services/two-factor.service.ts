import crypto from "node:crypto";
import { OTP } from "otplib";
import { env } from "../config/env.js";

const otp = new OTP({ strategy: "totp" });
const encryptionKey = crypto.createHash("sha256").update(env.JWT_SECRET).digest();

export function createTwoFactorSecret(email: string) {
  const secret = otp.generateSecret();
  return {
    secret,
    uri: otp.generateURI({ issuer: "ScanPDF", label: email, secret }),
  };
}

export async function verifyTwoFactorToken(secret: string, token: string) {
  const result = await otp.verify({ secret, token, epochTolerance: 30 });
  return result.valid;
}

export function generateTwoFactorToken(secret: string) {
  return otp.generateSync({ secret });
}

export function encryptTwoFactorSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((value) => value.toString("base64url")).join(".");
}

export function decryptTwoFactorSecret(payload: string) {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("2FA secret không hợp lệ");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
