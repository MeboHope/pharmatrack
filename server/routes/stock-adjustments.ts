
import { Router } from "express";

import { prisma } from "../prisma";
import {
  authenticate,
  requireRole,
} from "../middleware/auth";
import { recordAudit } from "../middleware/audit";

const router = Router();

router.use(authenticate);

const pharmacyStaff = requireRole(
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
);

const pharmacistOnly = requireRole(
  "ADMIN",
  "PHARMACIST",
);

const adjustmentTypes = [
  "LOSS_DAMAGE",
  "EXPIRY_REMOVAL",
  "AUDIT_RECONCILIATION",
  "RETURN_TO_SUPPLIER",
] as const;

router.get(
  "/",
  pharmacyStaff,
  async (_request, response, next) => {
    try {
      const adjustments =
        await prisma.stockAdjustment.findMany({
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
          orderBy: {
            date: "desc",
          },
        });

      response.json({
        success: true,
        data: adjustments,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const adjustment =
        await prisma.stockAdjustment.findUnique({
          where: {
            id: request.params.id,
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

      if (!adjustment) {
        response.status(404).json({
          success: false,
          message:
            "Stock adjustment not found.",
        });
        return;
      }

      response.json({
        success: true,
        data: adjustment,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const {
        drugId,
        adjustedQty,
        type,
        reason,
      } = request.body ?? {};

      if (
        typeof drugId !== "string" ||
        !drugId.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Drug ID is required.",
        });
        return;
      }

      if (
        adjustedQty === undefined ||
        adjustedQty === null ||
        adjustedQty === ""
      ) {
        response.status(400).json({
          success: false,
          message:
            "Adjusted quantity is required.",
        });
        return;
      }

      const newQty =
        Number(adjustedQty);

      if (
        !Number.isInteger(newQty) ||
        newQty < 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Adjusted quantity must be a non-negative whole number.",
        });
        return;
      }

      if (
        typeof type !== "string" ||
        !adjustmentTypes.includes(
          type as (typeof adjustmentTypes)[number],
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid stock adjustment type is required.",
        });
        return;
      }

      if (
        typeof reason !== "string" ||
        !reason.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "A reason for the stock adjustment is required.",
        });
        return;
      }

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

      const result =
        await prisma.$transaction(
          async (database) => {
            const drug =
              await database.drug.findUnique({
                where: {
                  id: drugId.trim(),
                },
              });

            if (!drug) {
              throw new Error(
                "Drug not found.",
              );
            }

            const user =
              await database.user.findUnique({
                where: {
                  id: userId,
                },
              });

            if (!user) {
              throw new Error(
                "Authenticated user could not be found.",
              );
            }

            const previousQty =
              drug.qty;

            const newStatus =
              newQty === 0
                ? "OUT_OF_STOCK"
                : newQty <= 10
                  ? "LOW_STOCK"
                  : "IN_STOCK";

            await database.drug.update({
              where: {
                id: drug.id,
              },
              data: {
                qty: newQty,
                status: newStatus,
              },
            });

            const adjustment =
              await database.stockAdjustment.create(
                {
                  data: {
                    drugId:
                      drug.id,

                    drugName:
                      drug.name,

                    batchNo:
                      drug.batchNo,

                    previousQty,

                    adjustedQty:
                      newQty,

                    type:
                      type as (typeof adjustmentTypes)[number],

                    reason:
                      reason.trim(),

                    adjustedBy:
                      user.name,

                    userId,
                  },
                },
              );

            return adjustment;
          },
        );

      await recordAudit(
        request,
        {
          action:
            "STOCK_ADJUSTMENT_CREATED",
          entity:
            "StockAdjustment",
          entityId:
            result.id,
          details: {
            drugId:
              result.drugId,
            drugName:
              result.drugName,
            batchNo:
              result.batchNo,
            previousQty:
              result.previousQty,
            adjustedQty:
              result.adjustedQty,
            type:
              result.type,
            reason:
              result.reason,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
