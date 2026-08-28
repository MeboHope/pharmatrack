import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  requireAuth,
  requireRole,
} from "./auth";

/**
 * Reusable permission definitions for PharmaTrack.
 *
 * Authentication and authorization remain
 * centralized here instead of being duplicated
 * throughout individual route files.
 */

export const adminOnly = [
  requireAuth,
  requireRole("ADMIN"),
];

export const pharmacistOnly = [
  requireAuth,
  requireRole(
    "ADMIN",
    "PHARMACIST",
  ),
];

export const clinicianOnly = [
  requireAuth,
  requireRole(
    "ADMIN",
    "CLINICIAN",
  ),
];

export const pharmacyStaff = [
  requireAuth,
  requireRole(
    "ADMIN",
    "PHARMACIST",
    "CLINICIAN",
  ),
];

/**
 * Explicit helper for operations that should
 * be available to every authenticated employee.
 */
export const authenticatedStaff = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      message:
        "Authentication required.",
    });
    return;
  }

  next();
};