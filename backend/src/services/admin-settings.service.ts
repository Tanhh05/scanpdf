import { z } from "zod";
import { prisma } from "../config/prisma.js";

export const adminSettingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  supportEmail: z.email().max(120),
  contactPhone: z.string().trim().max(30).optional().default(""),
  maintenanceMode: z.boolean().default(false),
  allowRegistrations: z.boolean().default(true),
  maxUploadMb: z.coerce.number().int().min(1).max(2000),
  defaultStorageDays: z.coerce.number().int().min(1).max(365),
  downloaderEnabled: z.boolean().default(true),
  watermarkRemovalEnabled: z.boolean().default(true),
  announcement: z.string().trim().max(240).optional().default(""),
});

export type AdminSettings = z.infer<typeof adminSettingsSchema>;

export const defaultAdminSettings: AdminSettings = adminSettingsSchema.parse({
  siteName: "ScanPDF",
  supportEmail: "support@scanpdf.vn",
  contactPhone: "",
  maintenanceMode: false,
  allowRegistrations: true,
  maxUploadMb: 200,
  defaultStorageDays: 7,
  downloaderEnabled: true,
  watermarkRemovalEnabled: true,
  announcement: "",
});

let cachedSettings: { value: AdminSettings; expiresAt: number } | null = null;
const cacheTtlMs = 5_000;

export function normalizeAdminSettings(records: Array<{ key: string; value: unknown }>) {
  const values = records.reduce<Record<string, unknown>>((result, item) => {
    result[item.key] = item.value;
    return result;
  }, {});
  return adminSettingsSchema.parse({ ...defaultAdminSettings, ...values });
}

export function invalidateAdminSettingsCache() {
  cachedSettings = null;
}

export async function getAdminSettings() {
  if (cachedSettings && cachedSettings.expiresAt > Date.now()) return cachedSettings.value;

  const records = await prisma.adminSetting.findMany({
    select: { key: true, value: true },
  });
  const value = normalizeAdminSettings(records);
  cachedSettings = { value, expiresAt: Date.now() + cacheTtlMs };
  return value;
}
