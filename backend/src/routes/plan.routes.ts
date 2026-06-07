import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json(await prisma.plan.findMany({ include: { features: true }, orderBy: { price: "asc" } }));
}));

export default router;
