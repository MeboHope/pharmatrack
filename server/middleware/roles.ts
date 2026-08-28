// server/middleware/roles.ts

import type { NextFunction, Response } from "express";

import type {
  AuthenticatedRequest,
} from "./auth";

export type AppRole =
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

export const requireRole =
  (...allowedRoles: AppRole[]) =>
  (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): void => {
    const role =
      request.auth?.role;

    if (!role) {
      response.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
      return;
    }

    if (
      !allowedRoles.includes(
        role as AppRole,
      )
    ) {
      response.status(403).json({
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
    "PHARMACIST",
    "CLINICIAN",
  );

export const requirePharmacyStaff =
  requireRole(
    "ADMIN",
    "PHARMACIST",
    "CLINICIAN",
  );

export default requireRole;