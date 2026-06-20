import { Router } from "express";
import { getAdminSettings } from "../services/admin-settings.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/announcement", asyncHandler(async (_req, res) => {
  const settings = await getAdminSettings();
  res.json({
    announcement: settings.announcement,
  });
}));

export default router;
