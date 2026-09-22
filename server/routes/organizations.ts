import { Router } from "express";

import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

import {
  authService,
} from "../services/auth.js";

import {
  recordAudit,
} from "../middleware/audit.js";

const router = Router();

router.use(authenticate);

/* ============================================================
   GET MY ORGANIZATIONS
   ============================================================ */

router.get(
  "/my",
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

      if (
        req.auth?.role ===
        "SUPER_ADMIN"
      ) {
        res.json({
          success: true,
          data: {
            organizations: [],
            currentOrganizationId:
              null,
          },
        });

        return;
      }

      const organizations =
        await authService.getUserOrganizations(
          userId,
        );

      const currentOrganizationId =
        req.auth?.organizationId ??
        null;

      res.json({
        success: true,

        data: {
          organizations,
          currentOrganizationId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ============================================================
   SWITCH ORGANIZATION
   ============================================================ */

router.post(
  "/select",
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

      if (
        req.auth?.role ===
        "SUPER_ADMIN"
      ) {
        res.status(403).json({
          success: false,
          message:
            "Super Admin accounts do not use organization switching.",
        });

        return;
      }

      const {
        organizationId,
        refreshToken,
      } = req.body ?? {};

      if (
        typeof organizationId !==
          "string" ||
        !organizationId.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            "Organization ID is required.",
        });

        return;
      }

      if (
        typeof refreshToken !==
          "string" ||
        !refreshToken.trim()
      ) {
        res.status(400).json({
          success: false,
          message:
            "Refresh token is required.",
        });

        return;
      }

      if (
        organizationId ===
        req.auth?.organizationId
      ) {
        res.status(400).json({
          success: false,
          message:
            "You are already working in this organization.",
        });

        return;
      }

      const result =
        await authService.switchOrganization(
          userId,
          organizationId,
          refreshToken,
        );

      await recordAudit(
        req,
        {
          action:
            "ORGANIZATION_SWITCHED",
          entity:
            "Organization",
          entityId:
            organizationId,
          organizationId:
            organizationId,
          details: {
            previousOrganizationId:
              req.auth?.organizationId,
            newOrganizationId:
              organizationId,
            userId,
          },
        },
      );

      const organizations =
        await authService.getUserOrganizations(
          userId,
        );

      res.json({
        success: true,

        message:
          "Organization switched successfully.",

        data: {
          user:
            result.user,

          accessToken:
            result.accessToken,

          refreshToken:
            result.refreshToken,

          organizations,

          currentOrganizationId:
            result.user.organizationId,
        },
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
        const clientErrors = [
          "You are not a member of that active organization.",
          "Super Admin accounts do not use organization switching.",
          "Current refresh token is invalid.",
          "Current refresh token has already been revoked.",
          "Current refresh token has expired.",
          "You are already working in this organization.",
          "User account no longer exists.",
          "Email verification is required.",
        ];

        if (
          clientErrors.includes(
            error.message,
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              error.message,
          });

          return;
        }
      }

      next(error);
    }
  },
);

export default router;