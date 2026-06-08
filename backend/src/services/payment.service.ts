import type { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { addDays } from "../utils/date.js";
import { sendPaymentSuccessEmail } from "./mail.service.js";

type PaymentWithPlan = Prisma.PaymentGetPayload<{ include: { plan: true } }>;

export async function activatePaidPayment(payment: PaymentWithPlan, rawResponse: Prisma.InputJsonValue) {
  if (payment.status === "PAID") return;

  await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current || current.status === "PAID") return;

    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });
    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        gateway: "PAYOS_CONFIRMATION",
        rawResponse,
      },
    });
    await tx.subscription.updateMany({
      where: { userId: payment.userId, status: "ACTIVE" },
      data: { status: "EXPIRED", endDate: new Date() },
    });
    await tx.subscription.create({
      data: {
        userId: payment.userId,
        planId: payment.planId,
        status: "ACTIVE",
        endDate: addDays(30),
      },
    });
  });
  const user = await prisma.user.findUnique({ where: { id: payment.userId }, select: { email: true } });
  if (user) {
    await sendPaymentSuccessEmail(
      user.email,
      payment.plan.name,
      payment.amount,
      payment.transactionCode,
    ).catch((error) => console.error("Payment email failed", error));
  }
}

export function mapPayOSStatus(status: string): PaymentStatus | null {
  if (status === "PAID") return "PAID";
  if (status === "CANCELLED" || status === "EXPIRED") return "CANCELLED";
  if (status === "FAILED") return "FAILED";
  return null;
}
