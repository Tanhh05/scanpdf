import type { NextFunction, Request, Response } from "express";
import { getAdminSettings } from "../services/admin-settings.service.js";
import { HttpError } from "../utils/http-error.js";

function isAdminOrAuthException(pathname: string, method: string) {
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/public/announcement" && method === "GET") return true;
  if (pathname === "/auth/login" && method === "POST") return true;
  return false;
}

function isRemoveWatermarkRequest(pathname: string) {
  return /^\/(?:v1\/)?convert\/(?:batch\/)?remove-watermark-(?:image|video)$/.test(pathname);
}

export async function adminSettingsGuard(req: Request, _res: Response, next: NextFunction) {
  const settings = await getAdminSettings();
  const pathname = req.path;

  if (!settings.allowRegistrations && pathname === "/auth/register" && req.method === "POST") {
    throw new HttpError(403, "Hệ thống đang tắt đăng ký tài khoản mới");
  }

  if (!settings.downloaderEnabled && pathname.startsWith("/downloaders")) {
    throw new HttpError(503, "Chức năng downloader đang tạm tắt");
  }

  if (!settings.watermarkRemovalEnabled && isRemoveWatermarkRequest(pathname)) {
    throw new HttpError(503, "Chức năng xóa watermark đang tạm tắt");
  }

  if (settings.maintenanceMode && !isAdminOrAuthException(pathname, req.method)) {
    throw new HttpError(503, settings.announcement || "Hệ thống đang bảo trì. Vui lòng thử lại sau.");
  }

  next();
}
