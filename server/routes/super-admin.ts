import express from "express";
import { prisma } from "../prisma.js";
import {
  authenticate,
  requireSuperAdmin,
} from "../middleware/auth.js";
import auditService from "../services/audit.js";

const router = express.Router();

/* ============================================================
   SUPER ADMIN AUTHORIZATION
   ============================================================ */

router.use(authenticate);
router.use(requireSuperAdmin);

/* ============================================================
   PLATFORM USER TYPES
   ============================================================ */

const organizationRoles = [
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
] as const;

type OrganizationRole =
  (typeof organizationRoles)[number];

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

/* ============================================================
   GET PLATFORM USERS
   ============================================================

   Super Admin operates at platform level and therefore
   cannot use the normal tenant-scoped /api/users endpoint.

   This endpoint provides a safe platform-level user directory
   for Super Admin only.

   Optional query parameters:
     ?search=john
     ?search=john@example.com
     ?organizationId=...
*/
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

          orderBy: [
            {
              createdAt: "desc",
            },
          ],

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

      /*
       * Super Admin accounts are deliberately kept out of
       * normal platform-user management.
       */
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
                drugs: true,
                patients: true,
                suppliers: true,
                transactions: true,
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
                    isVerified: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
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
            email:
              typeof email === "string" &&
              email.trim()
                ? email.trim().toLowerCase()
                : null,
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
              email:
                typeof email === "string" &&
                email.trim()
                  ? email.trim().toLowerCase()
                  : null,
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

      if (
        existing.status ===
        "SUSPENDED"
      ) {
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
        action: "ORGANIZATION_SUSPENDED",
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

      if (
        existing.status ===
        "ACTIVE"
      ) {
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
        action: "ORGANIZATION_ACTIVATED",
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
        entityId: membership.id,
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

      /*
       * Never allow the last organization ADMIN
       * to be demoted.
       */
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
        entityId: updated.id,
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

      /*
       * Never allow the last organization ADMIN
       * to be removed.
       */
      if (
        membership.role === "ADMIN"
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
        entityId: membership.id,
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