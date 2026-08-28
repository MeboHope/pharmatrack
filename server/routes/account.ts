
import { Router } from "express";

import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth";

import { recordAudit } from "../middleware/audit";

import {
  authService,
} from "../services/auth";

const router = Router();

/*
 * Every account endpoint requires an authenticated user.
 */
router.use(authenticate);

/*
 * PUT /api/account/password
 *
 * Changes the password of the currently
 * authenticated account.
 */
router.put(
  "/password",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const userId =
        request.auth?.sub;

      if (!userId) {
        response.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });

        return;
      }

      const {
        currentPassword,
        newPassword,
      } =
        request.body ?? {};

      if (
        typeof currentPassword !==
          "string" ||
        currentPassword.length === 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Current password is required.",
        });

        return;
      }

      if (
        typeof newPassword !==
          "string" ||
        newPassword.length === 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "New password is required.",
        });

        return;
      }

      if (
        newPassword.length < 8
      ) {
        response.status(400).json({
          success: false,
          message:
            "New password must contain at least 8 characters.",
        });

        return;
      }

      await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      await recordAudit(
        request,
        {
          action:
            "PASSWORD_CHANGE",
          entity: "User",
          entityId: userId,
          details: {
            message:
              "User password changed successfully.",
          },
        },
      );

      response.json({
        success: true,
        message:
          "Password changed successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
