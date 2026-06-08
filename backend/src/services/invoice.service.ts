import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";

type InvoicePayment = {
  transactionCode: string;
  amount: number;
  createdAt: Date;
  user: {
    fullName: string;
    email: string;
  };
  plan: {
    name: string;
  };
};

const regularFontUrl = new URL(
  import.meta.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf"),
);
const boldFontUrl = new URL(
  import.meta.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf"),
);

export async function createPaymentInvoice(payment: InvoicePayment) {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(regularFontUrl),
    readFile(boldFontUrl),
  ]);
  const [regular, bold] = await Promise.all([
    document.embedFont(regularBytes),
    document.embedFont(boldBytes),
  ]);
  const page = document.addPage([595, 842]);

  page.drawRectangle({
    x: 0,
    y: 742,
    width: 595,
    height: 100,
    color: rgb(0.11, 0.12, 0.42),
  });
  page.drawText("SCANPDF", {
    x: 50,
    y: 790,
    size: 24,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("HÓA ĐƠN THANH TOÁN", {
    x: 50,
    y: 760,
    size: 13,
    font: regular,
    color: rgb(0.88, 0.89, 1),
  });

  const rows = [
    ["Mã giao dịch", payment.transactionCode],
    ["Khách hàng", payment.user.fullName],
    ["Email", payment.user.email],
    ["Gói dịch vụ", payment.plan.name],
    ["Số tiền", `${payment.amount.toLocaleString("vi-VN")} VNĐ`],
    ["Trạng thái", "Đã thanh toán"],
    ["Ngày thanh toán", payment.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })],
  ];

  rows.forEach(([label, value], index) => {
    const y = 690 - index * 48;
    page.drawText(label!, { x: 50, y, size: 11, font: bold, color: rgb(0.35, 0.4, 0.5) });
    page.drawText(value!, { x: 190, y, size: 12, font: regular, color: rgb(0.08, 0.1, 0.17) });
    page.drawLine({
      start: { x: 50, y: y - 15 },
      end: { x: 545, y: y - 15 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });
  });

  page.drawText("Cảm ơn bạn đã sử dụng ScanPDF.", {
    x: 50,
    y: 300,
    size: 12,
    font: regular,
    color: rgb(0.35, 0.4, 0.5),
  });
  page.drawText("Đây là hóa đơn điện tử được tạo tự động bởi hệ thống ScanPDF.", {
    x: 50,
    y: 275,
    size: 10,
    font: regular,
    color: rgb(0.45, 0.5, 0.6),
  });

  return Buffer.from(await document.save());
}
