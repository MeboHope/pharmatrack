
import { Router } from "express";

import { auditService } from "../services/audit";
import { authenticate } from "../middleware/auth";
import { adminOnly } from "../middleware/authorize";

const router = Router();

/*
 * All audit-log access requires authentication.
 *
 * Only administrators can view audit history because
 * audit records contain operational and security information.
 */
router.use(authenticate);
router.use(adminOnly);

/**
 * GET /api/audit
 *
 * Query parameters:
 *   page
 *   limit
 *   entity
 *   action
 *   userId
 *   from
 *   to
 */
router.get("/", async (request, response) => {
  try {
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 25);

    const entity =
      typeof request.query.entity === "string"
        ? request.query.entity
        : undefined;

    const action =
      typeof request.query.action === "string"
        ? request.query.action
        : undefined;

    const userId =
      typeof request.query.userId === "string"
        ? request.query.userId
        : undefined;

    const from =
      typeof request.query.from === "string"
        ? new Date(request.query.from)
        : undefined;

    const to =
      typeof request.query.to === "string"
        ? new Date(request.query.to)
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

    const result =
      await auditService.list({
        page,
        limit,
        entity,
        action,
        userId,
        from,
        to,
      });

    response.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error(
      "Failed to fetch audit logs:",
      error,
    );

    response.status(500).json({
      success: false,
      message: "Failed to fetch audit logs.",
    });
  }
});

/**
 * GET /api/audit/:id
 *
 * Retrieve one audit record.
 */
router.get(
  "/:id",
  async (request, response) => {
    try {
      const auditLog =
        await auditService.getById?.(
          request.params.id,
        );

      if (!auditLog) {
        response.status(404).json({
          success: false,
          message: "Audit log not found.",
        });
        return;
      }

      response.json({
        success: true,
        data: auditLog,
      });
    } catch (error) {
      console.error(
        "Failed to fetch audit log:",
        error,
      );

      response.status(500).json({
        success: false,
        message: "Failed to fetch audit log.",
      });
    }
  },
);

export default router;
