import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { withSentryConfig } from "@sentry/nextjs";

export default function nextConfig(phase: string): NextConfig {
  return withSentryConfig(
    {
      output: "standalone",
      devIndicators: false,
      distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    },
    {
      silent: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
      },
    },
  );
}
