import { describe, expect, it } from "vitest";
import {
  createTwoFactorSecret,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateTwoFactorToken,
  verifyTwoFactorToken,
} from "../src/services/two-factor.service.js";
import { OTP } from "otplib";

describe("two-factor helpers", () => {
  it("encrypts secrets and verifies TOTP codes", async () => {
    const setup = createTwoFactorSecret("user@example.com");
    const encrypted = encryptTwoFactorSecret(setup.secret);
    expect(encrypted).not.toBe(setup.secret);
    expect(decryptTwoFactorSecret(encrypted)).toBe(setup.secret);

    const otp = new OTP({ strategy: "totp" });
    const token = await otp.generate({ secret: setup.secret });
    expect(generateTwoFactorToken(setup.secret)).toMatch(/^\d{6}$/);
    await expect(verifyTwoFactorToken(setup.secret, token)).resolves.toBe(true);
    await expect(verifyTwoFactorToken(setup.secret, "000000")).resolves.toBe(false);
  });
});
