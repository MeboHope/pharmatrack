import { Router } from "express";

import { authService } from "../services/auth.js";

import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

import { recordAudit } from "../middleware/audit.js";

import {
  isStrongPassword,
  isValidEmail,
} from "../middleware/security.js";

import {
  loginRateLimiter,
  registrationRateLimiter,
  refreshRateLimiter,
} from "../middleware/rateLimit.js";

import { prisma } from "../prisma.js";

const router = Router();

const isNonEmptyString = (
  value: unknown,
): value is string =>
  typeof value === "string" &&
  value.trim().length > 0;

const normalizeEmail = (
  value: string,
): string =>
  value.trim().toLowerCase();

const isAuthenticationFailure = (
  error: unknown,
): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message ===
      "Invalid email or password." ||
    error.message ===
      "Please verify your email before logging in."
  );
};

/* ============================================================
   REGISTER
   ============================================================ */

router.post(
  "/register",
  registrationRateLimiter,
  async (
    req,
    res,
    next,
  ) => {
    try {
      const {
        name,
        email,
        phone,
        password,
        role,
      } = req.body ?? {};

      if (!isNonEmptyString(name)) {
        res.status(400).json({
          success: false,
          message:
            "Full name is required.",
        });

        return;
      }

      if (!isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message:
            "Please provide a valid email address.",
        });

        return;
      }

      if (!isStrongPassword(password)) {
        res.status(400).json({
          success: false,
          message:
            "Password must contain at least 12 characters, including uppercase, lowercase, a number, and a special character.",
        });

        return;
      }

      if (
        role === "ADMIN" ||
        role === "SUPER_ADMIN"
      ) {
        res.status(403).json({
          success: false,
          message:
            "Privileged accounts cannot be created through public registration.",
        });

        return;
      }

      const registrationRole =
        role === "CLINICIAN"
          ? "CLINICIAN"
          : "PHARMACIST";

      const result =
        await authService.registerUser({
          name,
          email,
          phone:
            isNonEmptyString(phone)
              ? phone
              : undefined,
          password,
          role: registrationRole,
        });

      await recordAudit(
        req,
        {
          action:
            "USER_REGISTER",
          entity: "User",
          entityId:
            result.user.id,
          organizationId:
            result.user.organizationId ??
            undefined,
          details: {
            email:
              result.user.email,
            role:
              result.user.role,
            verificationRequired:
              true,
          },
        },
      );

      res.status(201).json({
        success: true,
        message:
          "Account created successfully. A verification code has been sent to your email address.",
        data: result,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          "already exists",
        )
      ) {
        res.status(409).json({
          success: false,
          message:
            error.message,
        });

        return;
      }

      next(error);
    }
  },
);

/* ============================================================
   VERIFY EMAIL
   ============================================================ */

router.post(
  "/verify-email",
  registrationRateLimiter,
  async (
    req,
    res,
    next,
  ) => {
    try {
      const {
        email,
        code,
      } = req.body ?? {};

      if (!isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message:
            "Please provide a valid email address.",
        });

        return;
      }

      if (!isNonEmptyString(code)) {
        res.status(400).json({
          success: false,
          message:
            "Verification code is required.",
        });

        return;
      }

      const normalizedEmail =
        normalizeEmail(email);

      const user =
        await prisma.user.findUnique({
          where: {
            email:
              normalizedEmail,
          },
        });

      if (!user) {
        res.status(400).json({
          success: false,
          message:
            "Invalid or expired verification code.",
        });

        return;
      }

      const result =
        await authService.verifyEmail(
          user.id,
          code,
        );

      await recordAudit(
        req,
        {
          action:
            "USER_EMAIL_VERIFIED",
          entity: "User",
          entityId:
            result.id,
          ...(result.organizationId && {
            organizationId:
              result.organizationId,
          }),
          details: {
            email:
              result.email,
          },
        },
      );

      res.json({
        success: true,
        message:
          "Email address verified successfully.",
        data: {
          user: result,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message ===
            "Invalid verification code." ||
          error.message ===
            "Verification code has expired." ||
          error.message ===
            "Too many verification attempts."
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            error.message,
        });

        return;
      }

      next(error);
    }
  },
);

/* ============================================================
   RESEND VERIFICATION
   ============================================================ */

router.post(
  "/resend-verification",
  registrationRateLimiter,
  async (
    req,
    res,
    next,
  ) => {
    try {
      const { email } =
        req.body ?? {};

      if (!isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message:
            "Please provide a valid email address.",
        });

        return;
      }

      const user =
        await prisma.user.findUnique({
          where: {
            email:
              normalizeEmail(email),
          },
        });

      if (!user) {
        res.status(404).json({
          success: false,
          message:
            "No account found with this email address.",
        });

        return;
      }

      await authService.resendVerificationCode(
        user.id,
      );

      res.json({
        success: true,
        message:
          "If the account requires verification, a new verification code has been sent.",
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   LOGIN
   ============================================================ */

router.post(
  "/login",
  loginRateLimiter,
  async (
    req,
    res,
    next,
  ) => {
    try {
      const {
        email,
        password,
      } = req.body ?? {};

      if (!isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message:
            "Please provide a valid email address.",
        });

        return;
      }

      if (!isNonEmptyString(password)) {
        res.status(401).json({
          success: false,
          message:
            "Invalid email or password.",
        });

        return;
      }

      const result =
        await authService.login({
          email,
          password,
        });

      await recordAudit(
        req,
        {
          action:
            "USER_LOGIN",
          entity:
            "User",
          entityId:
            result.user.id,
          ...(result.user.organizationId && {
            organizationId:
              result.user.organizationId,
          }),
          details: {
            email:
              result.user.email,
            organizationId:
              result.user.organizationId,
            role:
              result.user.role,
          },
        },
      );

      res.json({
        success: true,
        message:
          "Login successful.",
        data: result,
      });
    } catch (error) {
      if (
        isAuthenticationFailure(
          error,
        )
      ) {
        await recordAudit(
          req,
          {
            action:
              "USER_LOGIN_FAILED",
            entity:
              "Authentication",
            details: {
              email:
                typeof req.body?.email ===
                "string"
                  ? normalizeEmail(
                      req.body.email,
                    )
                  : undefined,
            },
          },
        );

        res.status(401).json({
          success: false,
          message:
            "Invalid email or password.",
        });

        return;
      }

      next(error);
    }
  },
);

/* ============================================================
   REFRESH
   ============================================================ */

router.post(
  "/refresh",
  refreshRateLimiter,
  async (
    req,
    res,
  ) => {
    try {
      const {
        refreshToken,
      } = req.body ?? {};

      if (
        !isNonEmptyString(
          refreshToken,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Refresh token is required.",
        });

        return;
      }

      const result =
        await authService.refreshAccessToken(
          refreshToken,
        );

      res.json({
        success: true,
        message:
          "Access token refreshed.",
        data: result,
      });
    } catch {
      res.status(401).json({
        success: false,
        message:
          "Invalid or expired refresh token.",
      });
    }
  },
);

/* ============================================================
   LOGOUT
   ============================================================ */

router.post(
  "/logout",
  async (
    req,
    res,
    next,
  ) => {
    try {
      const {
        refreshToken,
      } = req.body ?? {};

      if (
        isNonEmptyString(
          refreshToken,
        )
      ) {
        await authService.logoutUser(
          refreshToken,
        );
      }

      res.json({
        success: true,
        message:
          "Logout successful.",
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   CURRENT USER
   ============================================================ */

router.get(
  "/me",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res,
    next,
  ) => {
    try {
      const userId =
        req.auth?.sub;

      if (!userId) {
        res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });

        return;
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            createdAt: true,
          },
        });

      if (!user) {
        res.status(401).json({
          success: false,
          message:
            "User account no longer exists.",
        });

        return;
      }

      if (!user.isVerified) {
        res.status(403).json({
          success: false,
          message:
            "Email verification is required.",
        });

        return;
      }

      /*
       * Super Admin is platform-level and has
       * no tenant organization context.
       */
      if (
        user.role ===
        "SUPER_ADMIN"
      ) {
        res.json({
          success: true,
          data: {
            ...user,

            organizationId:
              null,

            organizationName:
              null,

            organizationType:
              null,

            organizationStatus:
              null,

            organizationRole:
              "SUPER_ADMIN",
          },
        });

        return;
      }

      /*
       * The JWT is now authoritative for the
       * currently selected organization.
       */
      const organizationId =
        req.auth?.organizationId;

      if (!organizationId) {
        res.status(403).json({
          success: false,
          message:
            "Organization context is required.",
        });

        return;
      }

      const authenticatedUser =
        await authService.getAuthenticatedUser(
          userId,
          organizationId,
        );

      if (!authenticatedUser) {
        res.status(403).json({
          success: false,
          message:
            "You are no longer assigned to the selected active organization.",
        });

        return;
      }

      const membership =
        await prisma.organizationMembership.findFirst(
          {
            where: {
              userId,
              organizationId,
            },

            select: {
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
            "Organization membership not found.",
        });

        return;
      }

      res.json({
        success: true,

        data: {
          ...user,

          /*
           * The membership role is authoritative
           * within the selected organization.
           */
          role:
            authenticatedUser.role,

          organizationId:
            membership.organization.id,

          organizationName:
            membership.organization.name,

          organizationType:
            membership.organization.type,

          organizationStatus:
            membership.organization.status,

          organizationRole:
            membership.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;