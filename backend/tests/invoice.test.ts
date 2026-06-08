import { describe, expect, it } from "vitest";
import { createPaymentInvoice } from "../src/services/invoice.service.js";

describe("payment invoice", () => {
  it("creates a PDF containing Vietnamese customer data", async () => {
    const invoice = await createPaymentInvoice({
      transactionCode: "823448341",
      amount: 10_000,
      createdAt: new Date("2026-06-07T09:10:48.000Z"),
      user: {
        fullName: "Tuấn Anh Phan",
        email: "tuananh@example.com",
      },
      plan: {
        name: "Chuyên nghiệp",
      },
    });

    expect(invoice.subarray(0, 5).toString()).toBe("%PDF-");
    expect(invoice.length).toBeGreaterThan(5_000);
  });
});
