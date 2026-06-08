import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/common/providers";

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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("scanpdf-theme");var d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})();`,
          }}
        />
      </head>
      <body className={sourceSans.variable} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
