import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  authService,
  type JwtPayload,
} from "../services/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export type AuthenticatedRequest = Request;

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authorizationHeader =
      req.headers.authorization;

    if (!authorizationHeader) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const [scheme, token] =
      authorizationHeader
        .trim()
        .split(/\s+/);

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token
    ) {
      res.status(401).json({
        success: false,
        message:
          "Invalid authorization header. Expected Bearer token.",
      });
      return;
    }

    const payload =
      authService.verifyAccessToken(token);

    req.auth = payload;

    next();
  } catch (error) {
    console.error(
      "Authentication middleware failed:",
      error,
    );

    res.status(401).json({
      success: false,
      message:
        "Invalid or expired access token.",
    });
  }
};

export const authenticate = requireAuth;

export const requireRole =
  (
    ...roles: JwtPayload["role"][]
  ) =>
  (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
      return;
    }

    if (
      !roles.includes(req.auth.role)
    ) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };

export const requireAdmin =
  requireRole("ADMIN");

export const requirePharmacist =
  requireRole(
    "ADMIN",
    "PHARMACIST",
  );

export const requireClinician =
  requireRole(
    "ADMIN",
    "CLINICIAN",
  );

export const requirePharmacyStaff =
  requireRole(
    "ADMIN",
    "PHARMACIST",
  );

export default requireAuth;