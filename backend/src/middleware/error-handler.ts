import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Dữ liệu không hợp lệ", issues: error.issues });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(400).json({ message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Lỗi hệ thống" });
};
