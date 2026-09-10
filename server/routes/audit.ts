import { Router } from "express";

import { auditService } from "../services/audit.js";
import {
  authenticate,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("ADMIN"));

router.get("/", async (request, response, next) => {
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

    const entity =
      typeof request.query.entity === "string"
        ? request.query.entity.trim() || undefined
        : undefined;

    const action =
      typeof request.query.action === "string"
        ? request.query.action.trim() || undefined
        : undefined;

    const userId =
      typeof request.query.userId === "string"
        ? request.query.userId.trim() || undefined
        : undefined;

    const from =
      typeof request.query.from === "string"
        ? new Date(request.query.from)
        : undefined;

    const to =
      typeof request.query.to === "string"
        ? new Date(request.query.to)
        : undefined;

    if (from && Number.isNaN(from.getTime())) {
      response.status(400).json({
        success: false,
        message: "Invalid 'from' date.",
      });
      return;
    }

    if (to && Number.isNaN(to.getTime())) {
      response.status(400).json({
        success: false,
        message: "Invalid 'to' date.",
      });
      return;
    }

    if (from && to && from > to) {
      response.status(400).json({
        success: false,
        message:
          "'from' date cannot be later than 'to' date.",
      });
      return;
    }

    const result = await auditService.list({
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
    next(error);
  }
});

router.get(
  "/:id",
  async (request, response, next) => {
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
      next(error);
    }
  },
);

export default router;