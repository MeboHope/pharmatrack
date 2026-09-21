import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  authService,
  type JwtPayload,
  type AppRole,
} from "../services/auth";

import { prisma } from "../prisma";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      effectiveRole?: AppRole;
    }
  }
}

export type AuthenticatedRequest = Request;

/**
 * =========================================================
 * AUTHENTICATION
 * =========================================================
 *
 * Verifies the access token and attaches the JWT payload
 * to the request.
 *
 * IMPORTANT:
 * This middleware verifies identity only.
 *
 * Organization membership and organization status are
 * verified separately by requireOrganizationContext().
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authorizationHeader =
      req.headers.authorization;

    if (
      typeof authorizationHeader !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const [
      scheme,
      token,
    ] = authorizationHeader
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

    /*
     * The JWT role is retained for compatibility,
     * but organization routes must not use it as the
     * authoritative tenant permission.
     */
    req.effectiveRole = payload.role;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message:
        "Invalid or expired access token.",
    });
  }
};

export const authenticate = requireAuth;

/**
 * =========================================================
 * ORGANIZATION CONTEXT
 * =========================================================
 *
 * Requires:
 * 1. Authentication
 * 2. A non-SUPER_ADMIN organization context
 * 3. An existing membership for the authenticated user
 * 4. An existing organization
 * 5. An ACTIVE organization
 *
 * The membership role becomes the authoritative role for
 * organization-level permissions.
 */
export const requireOrganizationContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
      return;
    }

    if (
      req.auth.role === "SUPER_ADMIN"
    ) {
      res.status(403).json({
        success: false,
        message:
          "An organization context is required for this operation.",
      });
      return;
    }

    const organizationId =
      req.auth.organizationId;

    if (!organizationId) {
      res.status(403).json({
        success: false,
        message:
          "Your account is not assigned to an organization.",
      });
      return;
    }

    const membership =
      await prisma.organizationMembership.findFirst(
        {
          where: {
            organizationId,
            userId: req.auth.sub,
          },
          select: {
            id: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
              },
            },
          },
        },
      );

    if (!membership) {
      res.status(403).json({
        success: false,
        message:
          "You are no longer a member of this organization.",
      });
      return;
    }

    if (
      membership.organization.status !==
      "ACTIVE"
    ) {
      res.status(403).json({
        success: false,
        message:
          "This organization is currently suspended.",
      });
      return;
    }

    /*
     * OrganizationMembership.role is now the effective
     * organization permission.
     *
     * SUPER_ADMIN must never be granted as a normal
     * organization membership role.
     */
    if (
      membership.role === "SUPER_ADMIN"
    ) {
      res.status(403).json({
        success: false,
        message:
          "Invalid organization membership role.",
      });
      return;
    }

    req.effectiveRole =
      membership.role;

    /*
     * Keep the existing JWT organizationId intact.
     * We intentionally do not mutate req.auth here.
     *
     * Existing route code that reads organizationId
     * continues to work without changing the login flow.
     */

    next();
  } catch (error) {
    console.error(
      "Failed to resolve organization context:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to verify organization access.",
    });
  }
};

/**
 * =========================================================
 * ROLE AUTHORIZATION
 * =========================================================
 *
 * For organization-scoped requests, effectiveRole comes
 * from OrganizationMembership.
 *
 * For SUPER_ADMIN platform requests, the verified JWT
 * role remains authoritative.
 */
export const requireRole =
  (...roles: AppRole[]) =>
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

    const role =
      req.effectiveRole ??
      req.auth.role;

    if (!roles.includes(role)) {
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

/**
 * =========================================================
 * SUPER ADMIN
 * =========================================================
 *
 * Platform-level operations are intentionally separate
 * from organization-level permissions.
 */
export const requireSuperAdmin =
  requireRole(
    "SUPER_ADMIN",
  );

export default requireAuth;