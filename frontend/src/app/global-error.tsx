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
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <main className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Đã xảy ra lỗi</h1>
          <p className="mt-3 text-slate-600">
            Hệ thống đã ghi nhận sự cố. Vui lòng thử lại.
          </p>
          <button
            className="mt-6 rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700"
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
