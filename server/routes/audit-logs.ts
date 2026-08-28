
import {
  Router,
  type Request,
  type Response,
} from "express";

import { prisma } from "../prisma";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth";

const router = Router();

/**
 * =========================================================
 * ADMIN-ONLY AUDIT LOG API
 * =========================================================
 *
 * Audit logs contain sensitive operational information.
 * Only authenticated ADMIN users may access them.
 */
router.use(requireAuth);
router.use(requireRole("ADMIN"));

/**
 * =========================================================
 * GET /api/audit-logs
 * =========================================================
 *
 * Query parameters:
 *
 * page       - page number, default 1
 * limit      - records per page, default 25, maximum 100
 * entity     - optional entity filter
 * action     - optional action filter
 * userId     - optional user filter
 *
 * Example:
 *
 * /api/audit-logs?page=1&limit=25
 * /api/audit-logs?entity=Drug
 * /api/audit-logs?action=CREATE
 */
router.get(
  "/",
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const parsedPage = Number(
        req.query.page ?? 1,
      );

      const parsedLimit = Number(
        req.query.limit ?? 25,
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

      const entity =
        typeof req.query.entity ===
        "string"
          ? req.query.entity.trim()
          : "";

      const action =
        typeof req.query.action ===
        "string"
          ? req.query.action.trim()
          : "";

      const userId =
        typeof req.query.userId ===
        "string"
          ? req.query.userId.trim()
          : "";

      const where: {
        entity?: string;
        action?: string;
        userId?: string;
      } = {};

      if (entity) {
        where.entity = entity;
      }

      if (action) {
        where.action = action;
      }

      if (userId) {
        where.userId = userId;
      }

      const skip =
        (page - 1) * limit;

      const [
        logs,
        total,
      ] = await prisma.$transaction([
        prisma.auditLog.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
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

      res.json({
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
        "Failed to fetch audit logs:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch audit logs.",
      });
    }
  },
);

/**
 * =========================================================
 * GET /api/audit-logs/:id
 * =========================================================
 *
 * Retrieve one audit record.
 */
router.get(
  "/:id",
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const log =
        await prisma.auditLog.findUnique({
          where: {
            id: req.params.id,
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

      if (!log) {
        res.status(404).json({
          success: false,
          message:
            "Audit log not found.",
        });
        return;
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      console.error(
        "Failed to fetch audit log:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch audit log.",
      });
    }
  },
);

export default router;
