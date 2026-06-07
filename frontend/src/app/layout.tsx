import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/common/providers";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";

const sourceSans = Source_Sans_3({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "ScanPDF - Chuyển đổi tài liệu trực tuyến",
  description: "Chuyển Word, Excel, PowerPoint và PDF nhanh chóng, an toàn.",
  icons: {
    icon: "/scanpdf-icon.png",
    shortcut: "/scanpdf-icon.png",
    apple: "/scanpdf-icon.png",
  },
  openGraph: {
    title: "ScanPDF - Chuyển đổi tài liệu trực tuyến",
    description: "Chuyển đổi và quản lý tài liệu PDF nhanh chóng, an toàn.",
    images: ["/scanpdf-logo.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={sourceSans.variable}>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-140px)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
