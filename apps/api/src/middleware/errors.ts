import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
    return;
  }
  const status = error.status === 403 ? 403 : 500;
  res.status(status).json({
    error: {
      code: status === 403 ? "ORIGIN_DENIED" : "INTERNAL_ERROR",
      message:
        status === 403
          ? "Origin is not allowed"
          : "The news service is temporarily unavailable",
    },
  });
};
