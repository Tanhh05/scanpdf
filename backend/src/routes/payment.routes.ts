import { Router } from "express";
import { z } from "zod";
import { getPayOS } from "../config/payos.js";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { activatePaidPayment, mapPayOSStatus } from "../services/payment.service.js";
import { createPaymentInvoice } from "../services/invoice.service.js";

const router = Router();

router.post("/create", requireAuth, asyncHandler(async (req, res) => {
  const { planId } = z.object({ planId: z.uuid() }).parse(req.body);
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.price <= 0) throw new HttpError(400, "Gói dịch vụ không hợp lệ");
  const payOS = getPayOS();

  const orderCode = Number(`${Date.now()}`.slice(-10));
  const payment = await prisma.payment.create({
    data: {
      userId: req.user!.id,
      planId: plan.id,
      amount: plan.price,
      paymentMethod: "PAYOS",
      transactionCode: String(orderCode),
    },
  });

  try {
    const link = await payOS.paymentRequests.create({
      orderCode,
      amount: plan.price,
      description: `SCANPDF ${plan.name}`.slice(0, 25),
      items: [{ name: `Gói ScanPDF ${plan.name}`, quantity: 1, price: plan.price }],
      cancelUrl: `${env.FRONTEND_URL}/payment/cancel?orderCode=${orderCode}`,
      returnUrl: `${env.FRONTEND_URL}/payment/success?orderCode=${orderCode}`,
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
    });

    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        gateway: "PAYOS",
        gatewayTransactionId: link.paymentLinkId,
        rawResponse: JSON.parse(JSON.stringify(link)),
      },
    });

    res.status(201).json({
      paymentId: payment.id,
      orderCode: String(orderCode),
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
      bank: {
        bin: link.bin,
        accountNumber: link.accountNumber,
        accountName: link.accountName,
      },
      amount: link.amount,
      description: link.description,
      expiredAt: link.expiredAt,
    });
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw error;
  }
}));

router.post("/webhook", asyncHandler(async (req, res) => {
  const data = await getPayOS().webhooks.verify(req.body);
  const transactionCode = String(data.orderCode);
  const payment = await prisma.payment.findUnique({
    where: { transactionCode },
    include: { plan: true },
  });

  // PayOS gửi payload mẫu khi xác nhận webhook; không coi đó là đơn hàng của hệ thống.
  if (!payment) {
    res.json({ success: true });
    return;
  }
  if (payment.amount !== data.amount) throw new HttpError(400, "Số tiền thanh toán không hợp lệ");
  if (payment.status === "PAID") {
    res.json({ success: true });
    return;
  }

  await activatePaidPayment(payment, JSON.parse(JSON.stringify(req.body)));

  res.json({ success: true });
}));

router.post("/webhook/confirm", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { webhookUrl } = z.object({ webhookUrl: z.url() }).parse(req.body);
  res.json(await getPayOS().webhooks.confirm(webhookUrl));
}));

router.get("/mine", requireAuth, asyncHandler(async (req, res) => {
  res.json(await prisma.payment.findMany({
    where: { userId: req.user!.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  }));
}));

router.get("/:id/invoice", requireAuth, asyncHandler(async (req, res) => {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "ID không hợp lệ");
  const payment = await prisma.payment.findFirst({
    where: { id, userId: req.user!.id, status: "PAID" },
    include: { user: true, plan: true },
  });
  if (!payment) throw new HttpError(404, "Không tìm thấy hóa đơn");
  const bytes = await createPaymentInvoice(payment);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="scanpdf-invoice-${payment.transactionCode}.pdf"`);
  res.setHeader("Content-Length", String(bytes.length));
  res.send(bytes);
}));

router.get("/status/:orderCode", requireAuth, asyncHandler(async (req, res) => {
  const value = req.params.orderCode;
  const orderCode = Array.isArray(value) ? value[0] : value;
  const payment = await prisma.payment.findFirst({
    where: { transactionCode: orderCode, userId: req.user!.id },
    include: {
      plan: true,
      transactions: {
        where: { gateway: "PAYOS" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!payment) throw new HttpError(404, "Không tìm thấy thanh toán");
  if (payment.status === "PENDING") {
    try {
      const payOSPayment = await getPayOS().paymentRequests.get(Number(payment.transactionCode));
      const nextStatus = mapPayOSStatus(payOSPayment.status);
      if (nextStatus === "PAID") {
        await activatePaidPayment(payment, JSON.parse(JSON.stringify(payOSPayment)));
        payment.status = "PAID";
      } else if (nextStatus) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: nextStatus } });
        payment.status = nextStatus;
      }
    } catch (error) {
      console.error("Không thể đồng bộ trạng thái PayOS", error);
    }
  }
  const raw = payment.transactions[0]?.rawResponse as Record<string, unknown> | undefined;
  res.json({
    id: payment.id,
    orderCode: payment.transactionCode,
    amount: payment.amount,
    status: payment.status,
    plan: payment.plan,
    qrCode: raw?.qrCode,
    checkoutUrl: raw?.checkoutUrl,
    description: raw?.description,
    expiredAt: raw?.expiredAt,
    bank: raw ? {
      bin: raw.bin,
      accountNumber: raw.accountNumber,
      accountName: raw.accountName,
    } : null,
  });
}));

router.post("/:orderCode/cancel", requireAuth, asyncHandler(async (req, res) => {
  const value = req.params.orderCode;
  const orderCode = Array.isArray(value) ? value[0] : value;
  const payment = await prisma.payment.findFirst({
    where: { transactionCode: orderCode, userId: req.user!.id },
  });
  if (!payment) throw new HttpError(404, "Không tìm thấy thanh toán");
  if (payment.status !== "PENDING") {
    res.json(payment);
    return;
  }

  const cancelled = await getPayOS().paymentRequests.cancel(Number(orderCode), "Người dùng hủy thanh toán");
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "CANCELLED" },
  });
  await prisma.paymentTransaction.create({
    data: {
      paymentId: payment.id,
      gateway: "PAYOS_CANCEL",
      rawResponse: JSON.parse(JSON.stringify(cancelled)),
    },
  });
  res.json(updated);
}));

export default router;
