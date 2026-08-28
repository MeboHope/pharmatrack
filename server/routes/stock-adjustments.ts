import { Router } from "express";

import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import {
  pharmacistOnly,
  pharmacyStaff,
} from "../middleware/authorize";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  pharmacyStaff,
  async (_request, response) => {
    try {
      const adjustments =
        await prisma.stockAdjustment.findMany({
          orderBy: {
            date: "desc",
          },
        });

      response.json({
        success: true,
        data: adjustments,
      });
    } catch (error) {
      console.error(
        "Failed to fetch stock adjustments:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch stock adjustments.",
      });
    }
  },
);

router.get(
  "/:id",
  pharmacyStaff,
  async (request, response) => {
    try {
      const adjustment =
        await prisma.stockAdjustment.findUnique({
          where: {
            id: request.params.id,
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
      console.error(
        "Failed to fetch stock adjustment:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch stock adjustment.",
      });
    }
  },
);

router.post(
  "/",
  pharmacistOnly,
  async (request, response) => {
    try {
      const {
        drugId,
        adjustedQty,
        type,
        reason,
      } = request.body;

      if (
        !drugId ||
        adjustedQty === undefined ||
        !type ||
        !reason
      ) {
        response.status(400).json({
          success: false,
          message:
            "Drug, adjusted quantity, adjustment type and reason are required.",
        });
        return;
      }

      if (
        Number(adjustedQty) < 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Adjusted quantity cannot be negative.",
        });
        return;
      }

      const result =
        await prisma.$transaction(
          async (database) => {
            const drug =
              await database.drug.findUnique({
                where: {
                  id: String(drugId),
                },
              });

            if (!drug) {
              throw new Error(
                "Drug not found.",
              );
            }

            const previousQty =
              drug.qty;

            const newQty =
              Number(adjustedQty);

            const newStatus =
              newQty === 0
                ? "OUT_OF_STOCK"
                : newQty <= 10
                  ? "LOW_STOCK"
                  : "IN_STOCK";

            await database.drug.update(
              {
                where: {
                  id: drug.id,
                },
                data: {
                  qty: newQty,
                  status: newStatus,
                },
              },
            );

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
                    type,
                    reason:
                      String(
                        reason,
                      ).trim(),
                    adjustedBy:
                      request.user
                        ?.name ||
                      "Unknown User",
                    userId:
                      request.user
                        ?.id,
                  },
                },
              );

            return adjustment;
          },
        );

      response.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(
        "Failed to create stock adjustment:",
        error,
      );

      response.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create stock adjustment.",
      });
    }
  },
);

export default router;