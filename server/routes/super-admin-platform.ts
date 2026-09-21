import express from "express";
import { prisma } from "../prisma.js";
import {
  authenticate,
  requireSuperAdmin,
} from "../middleware/auth.js";

const router = express.Router();

/* ============================================================
   SUPER ADMIN PLATFORM AUTHORIZATION
   ============================================================ */

router.use(authenticate);
router.use(requireSuperAdmin);

/* ============================================================
   PLATFORM AUDIT LOG TYPES
   ============================================================ */

interface AuditLogWhere {
  action?: string;
  entity?: string;
  userId?: string;
  organizationId?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

/* ============================================================
   GET PLATFORM AUDIT LOGS
   ============================================================

   GET /api/super-admin/audit-logs

   Platform-wide audit access is intentionally separated from
   /api/audit-logs, which is tenant-scoped for organization
   administrators.

   Query parameters:

     page
     limit
     search
     action
     entity
     userId
     organizationId
     from
     to
*/

router.get(
  "/audit-logs",
  async (request, response) => {
    try {
      const parsedPage = Number(
        request.query.page ?? 1,
      );

      const parsedLimit = Number(
        request.query.limit ?? 25,
      );

      const page =
        Number.isInteger(parsedPage) &&
        parsedPage >= 1
          ? parsedPage
          : 1;

      const limit =
        Number.isInteger(parsedLimit) &&
        parsedLimit >= 1
          ? Math.min(parsedLimit, 100)
          : 25;

      const search =
        typeof request.query.search === "string"
          ? request.query.search.trim()
          : "";

      const action =
        typeof request.query.action === "string"
          ? request.query.action.trim()
          : "";

      const entity =
        typeof request.query.entity === "string"
          ? request.query.entity.trim()
          : "";

      const userId =
        typeof request.query.userId === "string"
          ? request.query.userId.trim()
          : "";

      const organizationId =
        typeof request.query.organizationId === "string"
          ? request.query.organizationId.trim()
          : "";

      const fromValue =
        typeof request.query.from === "string"
          ? request.query.from.trim()
          : "";

      const toValue =
        typeof request.query.to === "string"
          ? request.query.to.trim()
          : "";

      const from = fromValue
        ? new Date(fromValue)
        : undefined;

      const to = toValue
        ? new Date(toValue)
        : undefined;

      if (
        from &&
        Number.isNaN(from.getTime())
      ) {
        response.status(400).json({
          success: false,
          message: "Invalid 'from' date.",
        });

        return;
      }

      if (
        to &&
        Number.isNaN(to.getTime())
      ) {
        response.status(400).json({
          success: false,
          message: "Invalid 'to' date.",
        });

        return;
      }

      if (
        from &&
        to &&
        from > to
      ) {
        response.status(400).json({
          success: false,
          message:
            "'from' date cannot be later than 'to' date.",
        });

        return;
      }

      const where: AuditLogWhere = {};

      if (action) {
        where.action = action;
      }

      if (entity) {
        where.entity = entity;
      }

      if (userId) {
        where.userId = userId;
      }

      if (organizationId) {
        where.organizationId =
          organizationId;
      }

      if (from || to) {
        where.createdAt = {};

        if (from) {
          where.createdAt.gte = from;
        }

        if (to) {
          where.createdAt.lte = to;
        }
      }

      if (search) {
        /*
         * Search is applied across the most useful platform
         * audit fields and related user/organization records.
         */
        const logs =
          await prisma.auditLog.findMany({
            where: {
              ...where,
              OR: [
                {
                  action: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  entity: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  entityId: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  details: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  User: {
                    is: {
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
                      ],
                    },
                  },
                },
                {
                  Organization: {
                    is: {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              ],
            },

            orderBy: {
              createdAt: "desc",
            },

            skip:
              (page - 1) * limit,

            take: limit,

            select: {
              id: true,
              action: true,
              entity: true,
              entityId: true,
              details: true,
              ipAddress: true,
              createdAt: true,
              userId: true,

              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },

              Organization: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  status: true,
                },
              },
            },
          });

        const total =
          await prisma.auditLog.count({
            where: {
              ...where,
              OR: [
                {
                  action: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  entity: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  entityId: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  details: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  User: {
                    is: {
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
                      ],
                    },
                  },
                },
                {
                  Organization: {
                    is: {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              ],
            },
          });

        const totalPages =
          total === 0
            ? 0
            : Math.ceil(
                total / limit,
              );

        response.json({
          success: true,
          data: logs,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage:
              page < totalPages,
            hasPreviousPage:
              page > 1 &&
              totalPages > 0,
          },
        });

        return;
      }

      const [
        logs,
        total,
      ] = await prisma.$transaction([
        prisma.auditLog.findMany({
          where,

          orderBy: {
            createdAt: "desc",
          },

          skip:
            (page - 1) * limit,

          take: limit,

          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            details: true,
            ipAddress: true,
            createdAt: true,
            userId: true,

            User: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },

            Organization: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
              },
            },
          },
        }),

        prisma.auditLog.count({
          where,
        }),
      ]);

      const totalPages =
        total === 0
          ? 0
          : Math.ceil(
              total / limit,
            );

      response.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage:
            page < totalPages,
          hasPreviousPage:
            page > 1 &&
            totalPages > 0,
        },
      });
    } catch (error) {
      console.error(
        "Failed to fetch platform audit logs:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch platform audit logs.",
      });
    }
  },
);

/* ============================================================
   GET SINGLE PLATFORM AUDIT LOG
   ============================================================ */

router.get(
  "/audit-logs/:id",
  async (request, response) => {
    try {
      const log =
        await prisma.auditLog.findUnique({
          where: {
            id: request.params.id,
          },

          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            details: true,
            ipAddress: true,
            createdAt: true,
            userId: true,

            User: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },

            Organization: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
              },
            },
          },
        });

      if (!log) {
        response.status(404).json({
          success: false,
          message:
            "Audit log not found.",
        });

        return;
      }

      response.json({
        success: true,
        data: log,
      });
    } catch (error) {
      console.error(
        "Failed to fetch platform audit log:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch platform audit log.",
      });
    }
  },
);

/* ============================================================
   PLATFORM SYSTEM STATUS
   ============================================================

   GET /api/super-admin/system-status

   This performs an actual database connectivity check instead
   of allowing the frontend to assume that the platform is
   healthy.
*/

router.get(
  "/system-status",
  async (_request, response) => {
    const startedAt =
      Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;

      const databaseResponseTime =
        Date.now() - startedAt;

      const [
        organizationCount,
        userCount,
        auditLogCount,
      ] = await Promise.all([
        prisma.organization.count(),

        prisma.user.count({
          where: {
            role: {
              not: "SUPER_ADMIN",
            },
          },
        }),

        prisma.auditLog.count(),
      ]);

      response.json({
        success: true,

        status: "OPERATIONAL",

        api: {
          status: "OPERATIONAL",
          responseTimeMs:
            databaseResponseTime,
        },

        database: {
          status: "CONNECTED",
          responseTimeMs:
            databaseResponseTime,
        },

        platform: {
          organizations:
            organizationCount,

          users:
            userCount,

          auditLogs:
            auditLogCount,
        },

        server: {
          environment:
            process.env.NODE_ENV ||
            "development",

          nodeVersion:
            process.version,

          uptimeSeconds:
            Math.floor(
              process.uptime(),
            ),
        },

        timestamp:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "Platform system status check failed:",
        error,
      );

      response.status(503).json({
        success: false,

        status: "DEGRADED",

        api: {
          status: "OPERATIONAL",
        },

        database: {
          status: "DISCONNECTED",
        },

        message:
          "The API is running but the database health check failed.",

        timestamp:
          new Date().toISOString(),
      });
    }
  },
);

export default router;