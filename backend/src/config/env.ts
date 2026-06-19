import { config } from "dotenv";
import path from "node:path";
import { z } from "zod";

config();
config({ path: path.resolve(process.cwd(), "../.env"), override: true });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGINS: z.string().default(""),
  STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
  STORAGE_ROOT: z.string().default("../storage"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("documents"),
  PAYOS_CLIENT_ID: z.string().optional(),
  PAYOS_API_KEY: z.string().optional(),
  PAYOS_CHECKSUM_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  API_URL: z.string().default("http://localhost:4000/api"),
  AI_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.2"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  OPENAI_TRANSCRIBE_MODEL: z.string().default("gpt-4o-transcribe-diarize"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("ScanPDF <no-reply@scanpdf.vn>"),
  CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().min(0).default(1440),
  CLEANUP_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(200),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

export const env = schema.parse(process.env);
