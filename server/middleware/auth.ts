
import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  authService,
  type JwtPayload,
} from "../services/auth";

/**
 * ---------------------------------------------------------
 * EXPRESS REQUEST AUTH TYPES
 * ---------------------------------------------------------
 *
 * The authenticated JWT payload is attached to:
 *
 *     req.auth
 *
 * Routes can therefore access:
 *
 *     req.auth?.sub
 *     req.auth?.email
 *     req.auth?.role
 */

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

/**
 * Backwards-compatible authenticated request type.
 *
 * Some existing routes use:
 *
 *     AuthenticatedRequest
 *
 * while newer middleware uses Express.Request.
 *
 * Keeping this alias prevents unnecessary changes across
 * existing route files.
 */
export type AuthenticatedRequest = Request;

/**
 * ---------------------------------------------------------
 * REQUIRE AUTHENTICATION
 * ---------------------------------------------------------
 *
 * Validates:
 *
 * Authorization: Bearer <access-token>
 *
 * If valid:
 *
 *     req.auth = decoded JWT payload
 *
 * Otherwise:
 *
 *     HTTP 401
 */
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
      authorizationHeader.trim().split(/\s+/);

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

/**
 * ---------------------------------------------------------
 * BACKWARDS-COMPATIBLE AUTHENTICATE ALIAS
 * ---------------------------------------------------------
 *
 * Existing routes currently use:
 *
 *     router.use(authenticate);
 *
 * Keep that code working while standardizing internally
 * on requireAuth.
 */
export const authenticate = requireAuth;

/**
 * ---------------------------------------------------------
 * ROLE AUTHORIZATION
 * ---------------------------------------------------------
 *
 * Example:
 *
 * router.post(
 *   "/",
 *   requireAuth,
 *   requireRole("ADMIN", "PHARMACIST"),
 *   handler
 * );
 */
export const requireRole =
  (...roles: JwtPayload["role"][]) =>
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

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
