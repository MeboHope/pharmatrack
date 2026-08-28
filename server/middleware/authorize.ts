import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type { JwtPayload } from "../services/auth";

export type UserRole = JwtPayload["role"];

export const authorize = (
  ...allowedRoles: UserRole[]
) => {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    if (!request.auth) {
      response.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      response.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
};

export const adminOnly =
  authorize("ADMIN");

export const pharmacistOnly =
  authorize(
    "ADMIN",
    "PHARMACIST",
  );

export const clinicianOnly =
  authorize(
    "ADMIN",
    "CLINICIAN",
  );

export const pharmacyStaff =
  authorize(
    "ADMIN",
    "PHARMACIST",
    "CLINICIAN",
  );

export default authorize;