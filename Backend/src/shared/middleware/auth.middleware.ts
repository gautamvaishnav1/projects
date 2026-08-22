import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.util";
import { ApiError } from "../utils/api-error";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

/** Requires a valid JWT; attaches req.user = { id, email }. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized("Missing bearer token");
    const payload = verifyAccessToken(token);
    if (!payload?.sub) throw ApiError.unauthorized("Invalid token payload");
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
      return;
    }
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}
