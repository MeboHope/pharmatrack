import {
  NextFunction,
  Request,
  Response,
  Router,
} from "express";
import type { UserRole } from "@prisma/client";

import { prisma } from "../prisma.js";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import {
  generalApiRateLimiter,
  registrationRateLimiter,
} from "../middleware/rateLimit.js";
import {
  isStrongPassword,
  isValidEmail,
} from "../middleware/security.js";
import {
  acceptInvitation,
  createInvitation,
  listOrganizationInvitations,
  resendInvitation,
  revokeInvitation,
  validateInvitation,
} from "../services/invitations.js";
import type { InvitationRole } from "../services/invitationEmail.js";

const router = Router();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isInvitationRole(
  role: UserRole | string,
): role is InvitationRole {
  return (
    role === "ADMIN" ||
    role === "PHARMACIST" ||
    role === "CLINICIAN"
  );
}

/**
 * Only organization administrators can manage invitations.
 *
 * Organization membership is the authoritative source for
 * organization-level permissions.
 */
async function requireOrganizationAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = req.auth?.organizationId;
    const userId = req.auth?.sub;

    if (!userId) {
      res.status(401).json({
        message: "Authentication required.",
      });
      return;
    }

    if (!organizationId) {
      res.status(400).json({
        message: "An active organization is required.",
      });
      return;
    }

    const membership =
      await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        select: {
          role: true,
        },
      });

    if (!membership) {
      res.status(403).json({
        message:
          "You are not a member of this organization.",
      });
      return;
    }

    if (membership.role !== "ADMIN") {
      res.status(403).json({
        message:
          "Only organization administrators can manage invitations.",
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * PUBLIC
 *
 * Validate an invitation token.
 *
 * This endpoint does not reveal the raw invitation token
 * or any sensitive account information.
 */
router.get(
  "/validate",
  registrationRateLimiter,
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const token =
        typeof req.query.token === "string"
          ? req.query.token.trim()
          : "";

      if (!token) {
        res.status(400).json({
          message: "Invitation token is required.",
        });
        return;
      }

      const result = await validateInvitation(token);

      if (!result.valid || !result.invitation) {
        res.status(400).json({
          valid: false,
          message:
            "Invitation is invalid or has expired.",
        });
        return;
      }

      res.json({
        valid: true,
        invitation: {
          id: result.invitation.id,
          name: result.invitation.name,
          email: result.invitation.email,
          role: result.invitation.role,
          organizationId:
            result.invitation.organizationId,
          expiresAt: result.invitation.expiresAt,
        },
      });
    } catch (error) {
      console.error(
        "Invitation validation error:",
        error,
      );

      res.status(500).json({
        message:
          "Unable to validate invitation.",
      });
    }
  },
);

/**
 * PUBLIC
 *
 * Accept an invitation.
 *
 * The invitation link proves control of the invited
 * email address. The user then creates a strong password.
 */
router.post(
  "/accept",
  registrationRateLimiter,
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const token =
        typeof req.body?.token === "string"
          ? req.body.token.trim()
          : "";

      const password =
        typeof req.body?.password === "string"
          ? req.body.password
          : "";

      const name =
        typeof req.body?.name === "string"
          ? req.body.name.trim()
          : undefined;

      if (!token) {
        res.status(400).json({
          message:
            "Invitation token is required.",
        });
        return;
      }

      if (!password) {
        res.status(400).json({
          message: "Password is required.",
        });
        return;
      }

      if (!isStrongPassword(password)) {
        res.status(400).json({
          message:
            "Password must be 12–128 characters and contain uppercase, lowercase, number, and special character.",
        });
        return;
      }

      const result = await acceptInvitation({
        token,
        password,
        name,
      });

      await recordAudit(req, {
        action: "INVITATION_ACCEPTED",
        entity: "OrganizationInvitation",
        entityId: result.userId,
        details: {
          organizationId:
            result.organizationId,
        },
      });

      res.status(201).json({
        message:
          "Invitation accepted successfully. You can now sign in.",
        userId: result.userId,
        organizationId:
          result.organizationId,
      });
    } catch (error) {
      console.error(
        "Invitation acceptance error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to accept invitation.";

      res.status(400).json({
        message,
      });
    }
  },
);

/**
 * All routes below this point require authentication
 * and organization administrator privileges.
 */
router.use(
  authenticate,
  requireOrganizationAdmin,
);

/**
 * GET /api/invitations
 *
 * List invitations belonging to the authenticated
 * user's active organization.
 */
router.get(
  "/",
  generalApiRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const organizationId =
        req.auth?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          message:
            "An active organization is required.",
        });
        return;
      }

      const invitations =
        await listOrganizationInvitations(
          organizationId,
        );

      res.json({
        invitations,
      });
    } catch (error) {
      console.error(
        "List invitations error:",
        error,
      );

      res.status(500).json({
        message:
          "Unable to load invitations.",
      });
    }
  },
);

/**
 * POST /api/invitations
 *
 * Create and send an organization invitation.
 *
 * SUPER_ADMIN is intentionally not accepted here.
 */
router.post(
  "/",
  generalApiRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const organizationId =
        req.auth?.organizationId;

      const invitedById =
        req.auth?.sub;

      if (!organizationId || !invitedById) {
        res.status(400).json({
          message:
            "An authenticated organization administrator is required.",
        });
        return;
      }

      const name =
        typeof req.body?.name === "string"
          ? req.body.name.trim()
          : "";

      const email =
        typeof req.body?.email === "string"
          ? normalizeEmail(req.body.email)
          : "";

      const phone =
        typeof req.body?.phone === "string"
          ? req.body.phone.trim()
          : null;

      const role =
        typeof req.body?.role === "string"
          ? req.body.role.trim().toUpperCase()
          : "";

      if (!name) {
        res.status(400).json({
          message: "Name is required.",
        });
        return;
      }

      if (!email || !isValidEmail(email)) {
        res.status(400).json({
          message:
            "Please provide a valid email address.",
        });
        return;
      }

      if (!isInvitationRole(role)) {
        res.status(400).json({
          message:
            "Role must be ADMIN, PHARMACIST, or CLINICIAN.",
        });
        return;
      }

      const result = await createInvitation({
        organizationId,
        invitedById,
        name,
        email,
        phone,
        role,
      });

      await recordAudit(req, {
        action: "USER_INVITED",
        entity: "OrganizationInvitation",
        entityId: result.invitation.id,
        details: {
          organizationId,
          email,
          role,
        },
      });

      /*
       * Never return the raw invitation token.
       */
      res.status(201).json({
        message:
          "Invitation created and sent successfully.",
        invitation: result.invitation,
      });
    } catch (error) {
      console.error(
        "Create invitation error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to create invitation.";

      res.status(400).json({
        message,
      });
    }
  },
);

/**
 * POST /api/invitations/:id/resend
 *
 * Resend an existing pending invitation.
 */
router.post(
  "/:id/resend",
  generalApiRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const invitationId =
        typeof req.params.id === "string"
          ? req.params.id
          : "";

      const organizationId =
        req.auth?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          message:
            "An active organization is required.",
        });
        return;
      }

      const invitation =
        await prisma.organizationInvitation.findUnique({
          where: {
            id: invitationId,
          },
          select: {
            id: true,
            organizationId: true,
          },
        });

      if (
        !invitation ||
        invitation.organizationId !== organizationId
      ) {
        res.status(404).json({
          message: "Invitation not found.",
        });
        return;
      }

      await resendInvitation(invitationId);

      await recordAudit(req, {
        action: "INVITATION_RESENT",
        entity: "OrganizationInvitation",
        entityId: invitationId,
        details: {
          organizationId,
        },
      });

      res.json({
        message:
          "Invitation resent successfully.",
      });
    } catch (error) {
      console.error(
        "Resend invitation error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to resend invitation.";

      res.status(400).json({
        message,
      });
    }
  },
);

/**
 * POST /api/invitations/:id/revoke
 *
 * Revoke an existing pending invitation.
 */
router.post(
  "/:id/revoke",
  generalApiRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const invitationId =
        typeof req.params.id === "string"
          ? req.params.id
          : "";

      const organizationId =
        req.auth?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          message:
            "An active organization is required.",
        });
        return;
      }

      const invitation =
        await prisma.organizationInvitation.findUnique({
          where: {
            id: invitationId,
          },
          select: {
            id: true,
            organizationId: true,
          },
        });

      if (
        !invitation ||
        invitation.organizationId !== organizationId
      ) {
        res.status(404).json({
          message: "Invitation not found.",
        });
        return;
      }

      await revokeInvitation(invitationId);

      await recordAudit(req, {
        action: "INVITATION_REVOKED",
        entity: "OrganizationInvitation",
        entityId: invitationId,
        details: {
          organizationId,
        },
      });

      res.json({
        message:
          "Invitation revoked successfully.",
      });
    } catch (error) {
      console.error(
        "Revoke invitation error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to revoke invitation.";

      res.status(400).json({
        message,
      });
    }
  },
);

export default router;