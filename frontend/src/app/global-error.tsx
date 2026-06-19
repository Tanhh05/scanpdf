"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-[#f3f7fb] p-6">
        <main className="w-full max-w-md rounded-lg border border-[#d8ded5] bg-white p-8 text-center shadow-sm">
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#17201d]">Đã xảy ra lỗi</h1>
          <p className="mt-3 text-[#52615d]">
            Hệ thống đã ghi nhận sự cố. Vui lòng thử lại.
          </p>
          <button
            className="mt-6 rounded-lg bg-[#10aee8] px-5 py-2.5 font-semibold text-white hover:bg-[#0789c5]"
            onClick={reset}
            type="button"
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
