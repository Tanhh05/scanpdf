import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export function isMailConfigured() {
  return Boolean(env.RESEND_API_KEY || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS));
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

async function sendMail(mail: Mail) {
  if (env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.MAIL_FROM, ...mail }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend email failed (${response.status}): ${body.slice(0, 500)}`);
    }
    return;
  }

  await createTransporter().sendMail({ from: env.MAIL_FROM, ...mail });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!isMailConfigured()) return false;

  await sendMail({
    to,
    subject: "Đặt lại mật khẩu ScanPDF",
    text: `Bạn vừa yêu cầu đặt lại mật khẩu ScanPDF.\n\nMở liên kết sau trong 30 phút để đặt lại mật khẩu:\n${resetUrl}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>Đặt lại mật khẩu ScanPDF</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu ScanPDF.</p>
        <p>Liên kết này có hiệu lực trong 30 phút.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#5b5cf0;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">
            Đặt lại mật khẩu
          </a>
        </p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  });

  return true;
}

export async function sendEmailVerification(to: string, verifyUrl: string) {
  if (!isMailConfigured()) return false;

  await sendMail({
    to,
    subject: "Xác thực email ScanPDF",
    text: `Xác thực email ScanPDF bằng liên kết sau trong 24 giờ:\n${verifyUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>Xác thực email ScanPDF</h2>
        <p>Nhấn nút bên dưới để xác thực địa chỉ email của bạn. Liên kết có hiệu lực trong 24 giờ.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#5b5cf0;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">
            Xác thực email
          </a>
        </p>
      </div>
    `,
  });
  return true;
}

export async function sendConversionResultEmail(
  to: string,
  fileName: string,
  status: "COMPLETED" | "FAILED",
  errorMessage?: string,
) {
  if (!isMailConfigured()) return false;
  const completed = status === "COMPLETED";
  await sendMail({
    to,
    subject: completed ? `ScanPDF đã xử lý xong ${fileName}` : `ScanPDF không thể xử lý ${fileName}`,
    text: completed
      ? `Tài liệu ${fileName} đã được xử lý xong. Đăng nhập ScanPDF để tải kết quả.`
      : `Tài liệu ${fileName} xử lý thất bại. ${errorMessage ?? ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>${completed ? "Tài liệu đã xử lý xong" : "Xử lý tài liệu thất bại"}</h2>
        <p><strong>${fileName}</strong></p>
        ${completed
          ? `<p><a href="${env.FRONTEND_URL}/dashboard/history">Mở lịch sử chuyển đổi</a></p>`
          : `<p>${errorMessage ?? "Vui lòng thử lại."}</p>`}
      </div>
    `,
  });
  return true;
}

export async function sendPaymentSuccessEmail(to: string, planName: string, amount: number, transactionCode: string) {
  if (!isMailConfigured()) return false;
  await sendMail({
    to,
    subject: `Thanh toán ScanPDF ${planName} thành công`,
    text: `Thanh toán ${amount.toLocaleString("vi-VN")} VNĐ cho gói ${planName} đã thành công. Mã giao dịch: ${transactionCode}.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>Thanh toán thành công</h2>
        <p>Gói <strong>${planName}</strong> đã được kích hoạt.</p>
        <p>Số tiền: <strong>${amount.toLocaleString("vi-VN")} VNĐ</strong></p>
        <p>Mã giao dịch: <strong>${transactionCode}</strong></p>
        <p><a href="${env.FRONTEND_URL}/dashboard/payments">Xem lịch sử thanh toán</a></p>
      </div>
    `,
  });
  return true;
}

export async function sendTeamInviteEmail(to: string, teamName: string, inviteUrl: string) {
  if (!isMailConfigured()) return false;
  await sendMail({
    to,
    subject: `Bạn được mời vào team ${teamName} trên ScanPDF`,
    text: `Bạn được mời vào team ${teamName} trên ScanPDF.\n\nMở liên kết sau để chấp nhận lời mời:\n${inviteUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>Lời mời team ScanPDF</h2>
        <p>Bạn được mời vào team <strong>${teamName}</strong>.</p>
        <p>
          <a href="${inviteUrl}" style="display:inline-block;background:#5b5cf0;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">
            Chấp nhận lời mời
          </a>
        </p>
      </div>
    `,
  });
  return true;
}
