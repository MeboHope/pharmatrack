import { Router } from "express";

import {
  authenticate,
  requireOrganizationContext,
  type AuthenticatedRequest,
} from "../middleware/auth";

import { requireAdmin } from "../middleware/roles";

import { recordAudit } from "../middleware/audit";

import { prisma } from "../prisma";

import {
  authService,
  hashPassword,
  isStrongPassword,
  isValidEmail,
} from "../services/auth";

const router = Router();

router.use(authenticate);
router.use(requireOrganizationContext);
router.use(requireAdmin);

const getOrganizationId = (
  request: AuthenticatedRequest,
): string => {
  const organizationId = request.auth?.organizationId;

  if (!organizationId) {
    throw new Error("Organization context is required.");
  }

  return organizationId;
};

const allowedOrganizationRoles = [
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
] as const;

type OrganizationRole =
  (typeof allowedOrganizationRoles)[number];

const isOrganizationRole = (
  value: unknown,
): value is OrganizationRole => {
  return (
    typeof value === "string" &&
    allowedOrganizationRoles.includes(
      value as OrganizationRole,
    )
  );
};

const sanitizeUser = (user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: OrganizationRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * =========================================================
 * GET /api/users
 * =========================================================
 *
 * Returns only users who belong to the authenticated
 * administrator's active organization.
 *
 * The role returned here comes from the organization
 * membership, because that is the authoritative role for
 * this organization.
 */
router.get(
  "/",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const organizationId =
        getOrganizationId(request);

      const memberships =
        await prisma.organizationMembership.findMany({
          where: {
            organizationId,
            role: {
              in: [
                "ADMIN",
                "PHARMACIST",
                "CLINICIAN",
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: true,
          },
        });

      response.json({
        success: true,
        data: memberships.map((membership) =>
          sanitizeUser({
            ...membership.user,
            role: membership.role as OrganizationRole,
          }),
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * =========================================================
 * POST /api/users
 * =========================================================
 *
 * Creates a new account and assigns it to the
 * authenticated administrator's organization.
 *
 * SUPER_ADMIN cannot be created through this endpoint.
 *
 * The membership role is the organization-level
 * authorization role.
 */
router.post(
  "/",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const organizationId =
        getOrganizationId(request);

      const {
        name,
        email,
        phone,
        password,
        role,
      } = request.body ?? {};

      if (
        typeof name !== "string" ||
        name.trim().length < 2
      ) {
        response.status(400).json({
          success: false,
          message: "A valid name is required.",
        });
        return;
      }

      if (
        typeof email !== "string" ||
        !isValidEmail(email.trim())
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid email address is required.",
        });
        return;
      }

      if (
        typeof password !== "string" ||
        !isStrongPassword(password)
      ) {
        response.status(400).json({
          success: false,
          message:
            "Password must be 12-128 characters and include uppercase, lowercase, number, and special character.",
        });
        return;
      }

      if (!isOrganizationRole(role)) {
        response.status(400).json({
          success: false,
          message:
            "A valid organization user role is required.",
        });
        return;
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const existing =
        await prisma.user.findUnique({
          where: {
            email: normalizedEmail,
          },
        });

      if (existing) {
        response.status(409).json({
          success: false,
          message:
            "An account with this email already exists.",
        });
        return;
      }

      const passwordHash =
        await hashPassword(password);

      const user =
        await prisma.$transaction(
          async (database) => {
            const createdUser =
              await database.user.create({
                data: {
                  name: name.trim(),
                  email: normalizedEmail,
                  phone:
                    typeof phone === "string" &&
                    phone.trim()
                      ? phone.trim()
                      : null,

                  /*
                   * User.role is retained for compatibility
                   * with the existing schema and authentication
                   * flow.
                   *
                   * For organization-level authorization,
                   * OrganizationMembership.role is authoritative.
                   */
                  role,
                  isVerified: true,
                  passwordHash,
                },
              });

            await database.organizationMembership.create({
              data: {
                organizationId,
                userId: createdUser.id,
                role,
              },
            });

            return createdUser;
          },
        );

      await recordAudit(request, {
        action: "USER_CREATED",
        entity: "User",
        entityId: user.id,
        organizationId,
        details: {
          name: user.name,
          email: user.email,
          role,
        },
      });

      response.status(201).json({
        success: true,
        message:
          "User account created successfully.",
        data: sanitizeUser({
          ...user,
          role,
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * =========================================================
 * PUT /api/users/:id/password
 * =========================================================
 *
 * Administrator password reset.
 *
 * This route must remain before /:id so the explicit
 * password-reset endpoint is matched correctly.
 */
router.put(
  "/:id/password",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const organizationId =
        getOrganizationId(request);

      const targetUserId =
        request.params.id;

      const administratorId =
        request.auth?.sub;

      if (!administratorId) {
        response.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      if (targetUserId === administratorId) {
        response.status(400).json({
          success: false,
          message:
            "Use the account password-change function to change your own password.",
        });
        return;
      }

      const { password } = request.body ?? {};

      if (
        typeof password !== "string" ||
        !isStrongPassword(password)
      ) {
        response.status(400).json({
          success: false,
          message:
            "Password must be 12-128 characters and include uppercase, lowercase, number, and special character.",
        });
        return;
      }

      const membership =
        await prisma.organizationMembership.findFirst({
          where: {
            organizationId,
            userId: targetUserId,
            role: {
              in: [
                "ADMIN",
                "PHARMACIST",
                "CLINICIAN",
              ],
            },
          },
          include: {
            user: true,
          },
        });

      if (!membership) {
        response.status(404).json({
          success: false,
          message:
            "User account could not be found in this organization.",
        });
        return;
      }

      await authService.adminResetPassword(
        targetUserId,
        password,
      );

      await recordAudit(request, {
        action: "ADMIN_PASSWORD_RESET",
        entity: "User",
        entityId: targetUserId,
        organizationId,
        details: {
          message:
            "Administrator reset the user's password.",
          targetUserId,
          targetEmail: membership.user.email,
          targetRole: membership.role,
        },
      });

      response.json({
        success: true,
        message:
          "User password reset successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * =========================================================
 * PUT /api/users/:id
 * =========================================================
 *
 * Updates an organization member.
 *
 * IMPORTANT:
 * OrganizationMembership.role is the authoritative
 * organization-level role.
 *
 * We intentionally do NOT update User.role when an Admin
 * changes a member's role. This prevents a future
 * multi-organization user from having one organization's
 * role overwrite another organization's role.
 */
router.put(
  "/:id",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const organizationId =
        getOrganizationId(request);

      const userId =
        request.params.id;

      const {
        name,
        email,
        phone,
        role,
        isVerified,
      } = request.body ?? {};

      const membership =
        await prisma.organizationMembership.findFirst({
          where: {
            organizationId,
            userId,
            role: {
              in: [
                "ADMIN",
                "PHARMACIST",
                "CLINICIAN",
              ],
            },
          },
          include: {
            user: true,
          },
        });

      if (!membership) {
        response.status(404).json({
          success: false,
          message:
            "User account could not be found in this organization.",
        });
        return;
      }

      const existing = membership.user;

      /*
       * Administrators cannot change their own
       * organization role.
       */
      if (
        userId === request.auth?.sub &&
        role !== undefined &&
        role !== membership.role
      ) {
        response.status(400).json({
          success: false,
          message:
            "You cannot change your own organization role.",
        });
        return;
      }

      if (
        role !== undefined &&
        !isOrganizationRole(role)
      ) {
        response.status(400).json({
          success: false,
          message: "Invalid user role.",
        });
        return;
      }

      if (
        typeof name === "string" &&
        name.trim().length < 2
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid name is required.",
        });
        return;
      }

      const normalizedEmail =
        typeof email === "string"
          ? email.trim().toLowerCase()
          : undefined;

      if (
        normalizedEmail !== undefined &&
        !isValidEmail(normalizedEmail)
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid email address is required.",
        });
        return;
      }

      if (
        normalizedEmail &&
        normalizedEmail !== existing.email
      ) {
        const emailOwner =
          await prisma.user.findUnique({
            where: {
              email: normalizedEmail,
            },
          });

        if (
          emailOwner &&
          emailOwner.id !== userId
        ) {
          response.status(409).json({
            success: false,
            message:
              "That email address is already assigned to another account.",
          });
          return;
        }
      }

      /*
       * Empty email is not accepted as an update.
       * The email is a required account identity field.
       */
      if (
        email !== undefined &&
        normalizedEmail === ""
      ) {
        response.status(400).json({
          success: false,
          message:
            "Email address cannot be empty.",
        });
        return;
      }

      /*
       * Only account identity/contact information and
       * verification state are updated on User.
       *
       * The organization role is updated separately on
       * OrganizationMembership.
       */
      const updated =
        await prisma.$transaction(
          async (database) => {
            const updatedUser =
              await database.user.update({
                where: {
                  id: userId,
                },
                data: {
                  ...(typeof name === "string" && {
                    name: name.trim(),
                  }),

                  ...(normalizedEmail !== undefined && {
                    email: normalizedEmail,
                  }),

                  ...(phone !== undefined && {
                    phone:
                      typeof phone === "string" &&
                      phone.trim()
                        ? phone.trim()
                        : null,
                  }),

                  ...(typeof isVerified ===
                    "boolean" && {
                    isVerified,
                  }),
                },
              });

            if (role !== undefined) {
              await database.organizationMembership.update({
                where: {
                  id: membership.id,
                },
                data: {
                  role,
                },
              });
            }

            return updatedUser;
          },
        );

      const effectiveRole =
        role ?? membership.role;

      await recordAudit(request, {
        action: "USER_UPDATED",
        entity: "User",
        entityId: updated.id,
        organizationId,
        details: {
          name: updated.name,
          email: updated.email,
          role: effectiveRole,
          isVerified: updated.isVerified,
        },
      });

      response.json({
        success: true,
        message:
          "User account updated successfully.",
        data: sanitizeUser({
          ...updated,
          role: effectiveRole,
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * =========================================================
 * DELETE /api/users/:id
 * =========================================================
 *
 * Removes the user from the administrator's organization.
 *
 * IMPORTANT:
 * This does NOT delete the global User record.
 *
 * This is essential for multi-organization support:
 * a user may belong to multiple organizations.
 */
router.delete(
  "/:id",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const organizationId =
        getOrganizationId(request);

      const userId =
        request.params.id;

      if (userId === request.auth?.sub) {
        response.status(400).json({
          success: false,
          message:
            "You cannot remove your own account from the organization.",
        });
        return;
      }

      const membership =
        await prisma.organizationMembership.findFirst({
          where: {
            organizationId,
            userId,
            role: {
              in: [
                "ADMIN",
                "PHARMACIST",
                "CLINICIAN",
              ],
            },
          },
          include: {
            user: true,
          },
        });

      if (!membership) {
        response.status(404).json({
          success: false,
          message:
            "User account could not be found in this organization.",
        });
        return;
      }

      const existing = membership.user;

      await prisma.organizationMembership.delete({
        where: {
          id: membership.id,
        },
      });

      await recordAudit(request, {
        action: "USER_DELETED",
        entity: "User",
        entityId: userId,
        organizationId,
        details: {
          name: existing.name,
          email: existing.email,
          role: membership.role,
          message:
            "User removed from the organization.",
        },
      });

      response.json({
        success: true,
        message:
          "User account removed from this organization successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;