import crypto from "node:crypto";

import express from "express";

import { prisma } from "../prisma.js";

import {
  authenticate,
  requireSuperAdmin,
} from "../middleware/auth.js";

import auditService from "../services/audit.js";

import {
  sendInvitationEmail,
  type InvitationRole,
} from "../services/invitationEmail.js";

const router = express.Router();

/* ============================================================
   SUPER ADMIN AUTHORIZATION
   ============================================================ */

router.use(authenticate);
router.use(requireSuperAdmin);

/* ============================================================
   CONSTANTS / HELPERS
   ============================================================ */

const organizationRoles = [
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
] as const;

type OrganizationRole =
  (typeof organizationRoles)[number];

const INVITATION_EXPIRY_HOURS = 72;

const isOrganizationRole = (
  value: unknown,
): value is OrganizationRole => {
  return (
    typeof value === "string" &&
    organizationRoles.includes(
      value as OrganizationRole,
    )
  );
};

const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
    value.trim(),
  );
};

const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const hashInvitationToken = (
  token: string,
): string => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const getInvitationExpiry = (): Date => {
  return new Date(
    Date.now() +
      INVITATION_EXPIRY_HOURS *
        60 *
        60 *
        1000,
  );
};

/* ============================================================
   GET PLATFORM USERS
   ============================================================ */

router.get(
  "/users",
  async (request, response) => {
    try {
      const search =
        typeof request.query.search === "string"
          ? request.query.search.trim()
          : "";

      const organizationId =
        typeof request.query.organizationId === "string"
          ? request.query.organizationId.trim()
          : "";

      const users =
        await prisma.user.findMany({
          where: {
            role: {
              not: "SUPER_ADMIN",
            },

            ...(search
              ? {
                  OR: [
                    {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                    {
                      email: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                    {
                      phone: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  ],
                }
              : {}),

            ...(organizationId
              ? {
                  memberships: {
                    some: {
                      organizationId,
                    },
                  },
                }
              : {}),
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 100,

          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,

            memberships: {
              select: {
                id: true,
                role: true,
                createdAt: true,

                organization: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    status: true,
                  },
                },
              },

              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      response.json({
        success: true,

        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          systemRole: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,

          organizations:
            user.memberships.map(
              (membership) => ({
                id: membership.organization.id,
                name: membership.organization.name,
                type: membership.organization.type,
                status:
                  membership.organization.status,
                role: membership.role,
                membershipId: membership.id,
                joinedAt:
                  membership.createdAt,
              }),
            ),
        })),
      });
    } catch (error) {
      console.error(
        "Failed to fetch platform users:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch platform users",
      });
    }
  },
);

/* ============================================================
   GET SINGLE PLATFORM USER
   ============================================================ */

router.get(
  "/users/:id",
  async (request, response) => {
    try {
      const user =
        await prisma.user.findUnique({
          where: {
            id: request.params.id,
          },

          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,

            memberships: {
              select: {
                id: true,
                role: true,
                createdAt: true,

                organization: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    status: true,
                  },
                },
              },

              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (!user) {
        response.status(404).json({
          success: false,
          message: "User not found",
        });

        return;
      }

      if (user.role === "SUPER_ADMIN") {
        response.status(403).json({
          success: false,
          message:
            "Super Admin accounts cannot be managed as organization users.",
        });

        return;
      }

      response.json({
        success: true,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          systemRole: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,

          organizations:
            user.memberships.map(
              (membership) => ({
                id: membership.organization.id,
                name: membership.organization.name,
                type: membership.organization.type,
                status:
                  membership.organization.status,
                role: membership.role,
                membershipId: membership.id,
                joinedAt:
                  membership.createdAt,
              }),
            ),
        },
      });
    } catch (error) {
      console.error(
        "Failed to fetch platform user:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch platform user",
      });
    }
  },
);

/* ============================================================
   GET ALL ORGANIZATIONS
   ============================================================ */

router.get(
  "/organizations",
  async (_request, response) => {
    try {
      const organizations =
        await prisma.organization.findMany({
          orderBy: {
            createdAt: "desc",
          },

          include: {
            _count: {
              select: {
                memberships: true,
                invitations: true,
                drugs: true,
                patients: true,
                suppliers: true,
                transactions: true,
                stockAdjustments: true,
                auditLogs: true,
              },
            },
          },
        });

      response.json({
        success: true,
        organizations,
      });
    } catch (error) {
      console.error(
        "Failed to fetch organizations:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch organizations",
      });
    }
  },
);

/* ============================================================
   GET SINGLE ORGANIZATION
   ============================================================ */

router.get(
  "/organizations/:id",
  async (request, response) => {
    try {
      const organization =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },

          include: {
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    isVerified: true,
                    createdAt: true,
                  },
                },
              },

              orderBy: {
                createdAt: "asc",
              },
            },

            invitations: {
              where: {
                acceptedAt: null,
                revokedAt: null,
              },

              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                expiresAt: true,
                createdAt: true,
              },

              orderBy: {
                createdAt: "desc",
              },
            },

            _count: {
              select: {
                drugs: true,
                patients: true,
                suppliers: true,
                transactions: true,
                stockAdjustments: true,
                auditLogs: true,
              },
            },
          },
        });

      if (!organization) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      response.json({
        success: true,
        organization,
      });
    } catch (error) {
      console.error(
        "Failed to fetch organization:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch organization",
      });
    }
  },
);

/* ============================================================
   CREATE ORGANIZATION
   ============================================================ */

router.post(
  "/organizations",
  async (request, response) => {
    try {
      const {
        name,
        type,
        address,
        phone,
        email,
      } = request.body as {
        name?: unknown;
        type?: unknown;
        address?: unknown;
        phone?: unknown;
        email?: unknown;
      };

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Organization name is required",
        });

        return;
      }

      if (
        type !== "PHARMACY" &&
        type !== "CLINIC"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Organization type must be PHARMACY or CLINIC",
        });

        return;
      }

      let normalizedEmail:
        | string
        | null = null;

      if (
        email !== undefined &&
        email !== null &&
        email !== ""
      ) {
        if (
          typeof email !== "string" ||
          !isValidEmail(email)
        ) {
          response.status(400).json({
            success: false,
            message:
              "A valid organization email address is required",
          });

          return;
        }

        normalizedEmail =
          normalizeEmail(email);
      }

      const organization =
        await prisma.organization.create({
          data: {
            name: name.trim(),
            type,

            address:
              typeof address === "string" &&
              address.trim()
                ? address.trim()
                : null,

            phone:
              typeof phone === "string" &&
              phone.trim()
                ? phone.trim()
                : null,

            email: normalizedEmail,
          },
        });

      await auditService.log({
        action: "ORGANIZATION_CREATED",
        entity: "Organization",
        entityId: organization.id,
        organizationId: organization.id,

        details: JSON.stringify({
          name: organization.name,
          type: organization.type,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.status(201).json({
        success: true,
        message:
          "Organization created successfully",
        organization,
      });
    } catch (error) {
      console.error(
        "Failed to create organization:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to create organization",
      });
    }
  },
);

/* ============================================================
   UPDATE ORGANIZATION
   ============================================================ */

router.put(
  "/organizations/:id",
  async (request, response) => {
    try {
      const {
        name,
        type,
        status,
        address,
        phone,
        email,
      } = request.body as {
        name?: unknown;
        type?: unknown;
        status?: unknown;
        address?: unknown;
        phone?: unknown;
        email?: unknown;
      };

      const existing =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      if (
        name !== undefined &&
        (typeof name !== "string" ||
          !name.trim())
      ) {
        response.status(400).json({
          success: false,
          message:
            "Organization name must be a non-empty string",
        });

        return;
      }

      if (
        type !== undefined &&
        type !== "PHARMACY" &&
        type !== "CLINIC"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Organization type must be PHARMACY or CLINIC",
        });

        return;
      }

      if (
        status !== undefined &&
        status !== "ACTIVE" &&
        status !== "SUSPENDED"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Organization status must be ACTIVE or SUSPENDED",
        });

        return;
      }

      let normalizedEmail:
        | string
        | null
        | undefined;

      if (email !== undefined) {
        if (
          email === null ||
          email === ""
        ) {
          normalizedEmail = null;
        } else if (
          typeof email !== "string" ||
          !isValidEmail(email)
        ) {
          response.status(400).json({
            success: false,
            message:
              "A valid organization email address is required",
          });

          return;
        } else {
          normalizedEmail =
            normalizeEmail(email);
        }
      }

      const organization =
        await prisma.organization.update({
          where: {
            id: request.params.id,
          },

          data: {
            ...(name !== undefined && {
              name: (
                name as string
              ).trim(),
            }),

            ...(type !== undefined && {
              type:
                type as
                  | "PHARMACY"
                  | "CLINIC",
            }),

            ...(status !== undefined && {
              status:
                status as
                  | "ACTIVE"
                  | "SUSPENDED",
            }),

            ...(address !== undefined && {
              address:
                typeof address === "string" &&
                address.trim()
                  ? address.trim()
                  : null,
            }),

            ...(phone !== undefined && {
              phone:
                typeof phone === "string" &&
                phone.trim()
                  ? phone.trim()
                  : null,
            }),

            ...(email !== undefined && {
              email: normalizedEmail,
            }),
          },
        });

      await auditService.log({
        action: "ORGANIZATION_UPDATED",
        entity: "Organization",
        entityId: organization.id,
        organizationId: organization.id,

        details: JSON.stringify({
          previous: {
            name: existing.name,
            type: existing.type,
            status: existing.status,
          },

          updated: {
            name: organization.name,
            type: organization.type,
            status: organization.status,
          },
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.json({
        success: true,
        message:
          "Organization updated successfully",
        organization,
      });
    } catch (error) {
      console.error(
        "Failed to update organization:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to update organization",
      });
    }
  },
);

/* ============================================================
   SUSPEND ORGANIZATION
   ============================================================ */

router.post(
  "/organizations/:id/suspend",
  async (request, response) => {
    try {
      const existing =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      if (existing.status === "SUSPENDED") {
        response.status(400).json({
          success: false,
          message:
            "Organization is already suspended",
        });

        return;
      }

      const organization =
        await prisma.organization.update({
          where: {
            id: request.params.id,
          },

          data: {
            status: "SUSPENDED",
          },
        });

      await auditService.log({
        action:
          "ORGANIZATION_SUSPENDED",
        entity: "Organization",
        entityId: organization.id,
        organizationId: organization.id,

        details: JSON.stringify({
          name: organization.name,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.json({
        success: true,
        message:
          "Organization suspended successfully",
        organization,
      });
    } catch (error) {
      console.error(
        "Failed to suspend organization:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to suspend organization",
      });
    }
  },
);

/* ============================================================
   ACTIVATE ORGANIZATION
   ============================================================ */

router.post(
  "/organizations/:id/activate",
  async (request, response) => {
    try {
      const existing =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      if (existing.status === "ACTIVE") {
        response.status(400).json({
          success: false,
          message:
            "Organization is already active",
        });

        return;
      }

      const organization =
        await prisma.organization.update({
          where: {
            id: request.params.id,
          },

          data: {
            status: "ACTIVE",
          },
        });

      await auditService.log({
        action:
          "ORGANIZATION_ACTIVATED",
        entity: "Organization",
        entityId: organization.id,
        organizationId: organization.id,

        details: JSON.stringify({
          name: organization.name,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.json({
        success: true,
        message:
          "Organization activated successfully",
        organization,
      });
    } catch (error) {
      console.error(
        "Failed to activate organization:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to activate organization",
      });
    }
  },
);

/* ============================================================
   GET ORGANIZATION MEMBERS
   ============================================================ */

router.get(
  "/organizations/:id/members",
  async (request, response) => {
    try {
      const organization =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },

          select: {
            id: true,
          },
        });

      if (!organization) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      const memberships =
        await prisma.organizationMembership.findMany({
          where: {
            organizationId:
              request.params.id,
          },

          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isVerified: true,
                createdAt: true,
              },
            },
          },

          orderBy: {
            createdAt: "asc",
          },
        });

      response.json({
        success: true,

        members: memberships.map(
          (membership) => ({
            id: membership.id,
            userId: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            phone: membership.user.phone,
            role: membership.role,
            systemRole:
              membership.user.role,
            isVerified:
              membership.user.isVerified,
            createdAt:
              membership.createdAt,
          }),
        ),
      });
    } catch (error) {
      console.error(
        "Failed to fetch organization members:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch organization members",
      });
    }
  },
);

/* ============================================================
   GET ORGANIZATION INVITATIONS
   ============================================================ */

router.get(
  "/organizations/:id/invitations",
  async (request, response) => {
    try {
      const organization =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },

          select: {
            id: true,
          },
        });

      if (!organization) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      const invitations =
        await prisma.organizationInvitation.findMany({
          where: {
            organizationId:
              request.params.id,
          },

          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            createdAt: true,

            invitedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 100,
        });

      response.json({
        success: true,
        invitations,
      });
    } catch (error) {
      console.error(
        "Failed to fetch organization invitations:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch organization invitations",
      });
    }
  },
);

/* ============================================================
   INVITE NEW USER TO ORGANIZATION
   ============================================================ */

router.post(
  "/organizations/:id/invitations",
  async (request, response) => {
    try {
      const {
        name,
        email,
        phone,
        role,
      } = request.body as {
        name?: unknown;
        email?: unknown;
        phone?: unknown;
        role?: unknown;
      };

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invitee name is required",
        });

        return;
      }

      if (
        typeof email !== "string" ||
        !isValidEmail(email)
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid invitee email address is required",
        });

        return;
      }

      if (!isOrganizationRole(role)) {
        response.status(400).json({
          success: false,
          message:
            "Role must be ADMIN, PHARMACIST, or CLINICIAN",
        });

        return;
      }

      const organization =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!organization) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      if (organization.status === "SUSPENDED") {
        response.status(400).json({
          success: false,
          message:
            "Cannot invite users to a suspended organization",
        });

        return;
      }

      const normalizedEmail =
        normalizeEmail(email);

      const existingUser =
        await prisma.user.findUnique({
          where: {
            email: normalizedEmail,
          },

          select: {
            id: true,
            role: true,
          },
        });

      if (
        existingUser &&
        existingUser.role === "SUPER_ADMIN"
      ) {
        response.status(400).json({
          success: false,
          message:
            "A Super Admin cannot be invited as an organization user",
        });

        return;
      }

      if (existingUser) {
        const existingMembership =
          await prisma.organizationMembership.findUnique(
            {
              where: {
                organizationId_userId: {
                  organizationId:
                    organization.id,
                  userId: existingUser.id,
                },
              },
            },
          );

        if (existingMembership) {
          response.status(409).json({
            success: false,
            message:
              "This user is already a member of the organization",
          });

          return;
        }
      }

      const activeInvitation =
        await prisma.organizationInvitation.findFirst(
          {
            where: {
              organizationId:
                organization.id,

              email: normalizedEmail,

              acceptedAt: null,
              revokedAt: null,

              expiresAt: {
                gt: new Date(),
              },
            },
          },
        );

      if (activeInvitation) {
        response.status(409).json({
          success: false,
          message:
            "An active invitation already exists for this email address",
        });

        return;
      }

      const invitationToken =
        generateInvitationToken();

      const tokenHash =
        hashInvitationToken(
          invitationToken,
        );

      const expiresAt =
        getInvitationExpiry();

      /*
       * Explicitly generate the invitation ID.
       *
       * The currently generated Prisma Client requires
       * OrganizationInvitation.id during create(), even
       * though the Prisma schema may define a default.
       */
      const invitation =
        await prisma.organizationInvitation.create(
          {
            data: {
              id: crypto.randomUUID(),

              organizationId:
                organization.id,

              invitedById:
                request.auth?.sub as string,

              name: name.trim(),

              email: normalizedEmail,

              phone:
                typeof phone === "string" &&
                phone.trim()
                  ? phone.trim()
                  : null,

              role,

              tokenHash,

              expiresAt,
            },
          },
        );

      try {
        await sendInvitationEmail({
          to: normalizedEmail,

          recipientName:
            name.trim(),

          organizationName:
            organization.name,

          role: role as InvitationRole,

          invitationToken,

          expiresAt,
        });
      } catch (emailError) {
        console.error(
          "Failed to send organization invitation email:",
          emailError,
        );

        await prisma.organizationInvitation.delete(
          {
            where: {
              id: invitation.id,
            },
          },
        );

        response.status(502).json({
          success: false,
          message:
            "The invitation could not be sent because the email service failed. No invitation was created.",
        });

        return;
      }

      await auditService.log({
        action:
          "ORGANIZATION_INVITATION_CREATED",

        entity:
          "OrganizationInvitation",

        entityId:
          invitation.id,

        organizationId:
          organization.id,

        details: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          role,
          expiresAt,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.status(201).json({
        success: true,

        message:
          "Invitation sent successfully",

        invitation: {
          id: invitation.id,
          name: invitation.name,
          email: invitation.email,
          phone: invitation.phone,
          role: invitation.role,
          expiresAt:
            invitation.expiresAt,
          createdAt:
            invitation.createdAt,
        },
      });
    } catch (error) {
      console.error(
        "Failed to create organization invitation:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to create organization invitation",
      });
    }
  },
);

/* ============================================================
   REVOKE ORGANIZATION INVITATION
   ============================================================ */

router.post(
  "/organizations/:id/invitations/:invitationId/revoke",
  async (request, response) => {
    try {
      const invitation =
        await prisma.organizationInvitation.findFirst(
          {
            where: {
              id: request.params.invitationId,

              organizationId:
                request.params.id,
            },
          },
        );

      if (!invitation) {
        response.status(404).json({
          success: false,
          message:
            "Invitation not found",
        });

        return;
      }

      if (invitation.acceptedAt) {
        response.status(400).json({
          success: false,
          message:
            "This invitation has already been accepted",
        });

        return;
      }

      if (invitation.revokedAt) {
        response.status(400).json({
          success: false,
          message:
            "This invitation has already been revoked",
        });

        return;
      }

      const updated =
        await prisma.organizationInvitation.update(
          {
            where: {
              id: invitation.id,
            },

            data: {
              revokedAt: new Date(),
            },
          },
        );

      await auditService.log({
        action:
          "ORGANIZATION_INVITATION_REVOKED",

        entity:
          "OrganizationInvitation",

        entityId:
          updated.id,

        organizationId:
          request.params.id,

        details: JSON.stringify({
          name: invitation.name,
          email: invitation.email,
          role: invitation.role,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.json({
        success: true,
        message:
          "Invitation revoked successfully",
      });
    } catch (error) {
      console.error(
        "Failed to revoke organization invitation:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to revoke organization invitation",
      });
    }
  },
);

/* ============================================================
   ADD EXISTING USER TO ORGANIZATION
   ============================================================ */

router.post(
  "/organizations/:id/members",
  async (request, response) => {
    try {
      const {
        userId,
        role,
      } = request.body as {
        userId?: unknown;
        role?: unknown;
      };

      if (
        typeof userId !== "string" ||
        !userId.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "User ID is required",
        });

        return;
      }

      if (!isOrganizationRole(role)) {
        response.status(400).json({
          success: false,
          message:
            "Role must be ADMIN, PHARMACIST, or CLINICIAN",
        });

        return;
      }

      const organization =
        await prisma.organization.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!organization) {
        response.status(404).json({
          success: false,
          message:
            "Organization not found",
        });

        return;
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId.trim(),
          },

          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
          },
        });

      if (!user) {
        response.status(404).json({
          success: false,
          message:
            "The selected user could not be found.",
        });

        return;
      }

      if (user.role === "SUPER_ADMIN") {
        response.status(400).json({
          success: false,
          message:
            "A Super Admin cannot be added as an organization member",
        });

        return;
      }

      const existingMembership =
        await prisma.organizationMembership.findUnique(
          {
            where: {
              organizationId_userId: {
                organizationId:
                  request.params.id,
                userId: user.id,
              },
            },
          },
        );

      if (existingMembership) {
        response.status(409).json({
          success: false,
          message:
            "User is already a member of this organization",
        });

        return;
      }

      const membership =
        await prisma.organizationMembership.create(
          {
            data: {
              organizationId:
                request.params.id,

              userId: user.id,

              role,
            },

            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  role: true,
                  isVerified: true,
                },
              },
            },
          },
        );

      await auditService.log({
        action:
          "ORGANIZATION_MEMBER_ADDED",

        entity:
          "OrganizationMembership",

        entityId:
          membership.id,

        organizationId:
          organization.id,

        details: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          role,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.status(201).json({
        success: true,

        message:
          "User added to organization successfully",

        membership,
      });
    } catch (error) {
      console.error(
        "Failed to add organization member:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to add organization member",
      });
    }
  },
);

/* ============================================================
   UPDATE ORGANIZATION MEMBER ROLE
   ============================================================ */

router.put(
  "/organizations/:id/members/:userId",
  async (request, response) => {
    try {
      const {
        role,
      } = request.body as {
        role?: unknown;
      };

      if (!isOrganizationRole(role)) {
        response.status(400).json({
          success: false,
          message:
            "Role must be ADMIN, PHARMACIST, or CLINICIAN",
        });

        return;
      }

      const membership =
        await prisma.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId:
                request.params.id,

              userId:
                request.params.userId,
            },
          },

          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });

      if (!membership) {
        response.status(404).json({
          success: false,
          message:
            "Organization membership not found",
        });

        return;
      }

      if (
        membership.user.role ===
        "SUPER_ADMIN"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Super Admin membership cannot be modified.",
        });

        return;
      }

      if (
        membership.role === "ADMIN" &&
        role !== "ADMIN"
      ) {
        const adminCount =
          await prisma.organizationMembership.count(
            {
              where: {
                organizationId:
                  request.params.id,

                role: "ADMIN",
              },
            },
          );

        if (adminCount <= 1) {
          response.status(400).json({
            success: false,
            message:
              "The organization must have at least one ADMIN. Add another ADMIN before changing this role.",
          });

          return;
        }
      }

      const updated =
        await prisma.organizationMembership.update(
          {
            where: {
              id: membership.id,
            },

            data: {
              role,
            },

            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  role: true,
                  isVerified: true,
                },
              },
            },
          },
        );

      await auditService.log({
        action:
          "ORGANIZATION_MEMBER_ROLE_UPDATED",

        entity:
          "OrganizationMembership",

        entityId:
          updated.id,

        organizationId:
          request.params.id,

        details: JSON.stringify({
          userId:
            request.params.userId,

          userName:
            membership.user.name,

          previousRole:
            membership.role,

          newRole: role,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.json({
        success: true,

        message:
          "Organization member role updated successfully",

        membership: updated,
      });
    } catch (error) {
      console.error(
        "Failed to update organization member role:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to update organization member role",
      });
    }
  },
);

/* ============================================================
   REMOVE USER FROM ORGANIZATION
   ============================================================ */

router.delete(
  "/organizations/:id/members/:userId",
  async (request, response) => {
    try {
      const membership =
        await prisma.organizationMembership.findUnique(
          {
            where: {
              organizationId_userId: {
                organizationId:
                  request.params.id,

                userId:
                  request.params.userId,
              },
            },

            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        );

      if (!membership) {
        response.status(404).json({
          success: false,
          message:
            "Organization membership not found",
        });

        return;
      }

      if (
        membership.user.role ===
        "SUPER_ADMIN"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Super Admin membership cannot be removed.",
        });

        return;
      }

      if (membership.role === "ADMIN") {
        const adminCount =
          await prisma.organizationMembership.count(
            {
              where: {
                organizationId:
                  request.params.id,

                role: "ADMIN",
              },
            },
          );

        if (adminCount <= 1) {
          response.status(400).json({
            success: false,
            message:
              "The organization must have at least one ADMIN. Add another ADMIN before removing this user.",
          });

          return;
        }
      }

      await prisma.organizationMembership.delete({
        where: {
          id: membership.id,
        },
      });

      await auditService.log({
        action:
          "ORGANIZATION_MEMBER_REMOVED",

        entity:
          "OrganizationMembership",

        entityId:
          membership.id,

        organizationId:
          request.params.id,

        details: JSON.stringify({
          userId:
            request.params.userId,

          userName:
            membership.user.name,

          role:
            membership.role,
        }),

        userId: request.auth?.sub,
        ipAddress: request.ip,
      });

      response.json({
        success: true,
        message:
          "User removed from organization successfully",
      });
    } catch (error) {
      console.error(
        "Failed to remove organization member:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to remove organization member",
      });
    }
  },
);

export default router;