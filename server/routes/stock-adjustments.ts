import { Router } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../prisma";
import {
  authenticate,
  requireOrganizationContext,
  requireRole,
} from "../middleware/auth";
import { recordAudit } from "../middleware/audit";

const router = Router();

router.use(authenticate);
router.use(requireOrganizationContext);

const pharmacyStaff = requireRole(
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
);

const pharmacistOnly = requireRole(
  "ADMIN",
  "PHARMACIST",
);

/**
 * GET /api/stock-adjustments
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Only stock adjustments belonging to the
 * authenticated organization are returned.
 */
router.get(
  "/",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      const adjustments =
        await prisma.stockAdjustment.findMany({
          where: {
            organizationId,
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

/**
 * GET /api/stock-adjustments/:id
 *
 * ADMIN + PHARMACIST + CLINICIAN
 */
router.get(
  "/:id",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      const adjustment =
        await prisma.stockAdjustment.findFirst({
          where: {
            id: request.params.id,
            organizationId,
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

/**
 * POST /api/stock-adjustments
 *
 * ADMIN + PHARMACIST
 *
 * The selected drug must belong to the current
 * organization.
 */
router.post(
  "/",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      const authenticatedUserId =
  request.auth?.sub;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      if (!authenticatedUserId) {
        response.status(401).json({
          success: false,
          message:
            "Authenticated user information is required.",
        });
        return;
      }

      const body =
        request.body ?? {};

      const {
        id,
        drugId,
        type,
        reason,
        adjustedQty,
        quantity,
        adjustedBy,
        date,
      } = body;

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

      const validAdjustmentTypes = [
        "LOSS_DAMAGE",
        "EXPIRY_REMOVAL",
        "AUDIT_RECONCILIATION",
        "RETURN_TO_SUPPLIER",
      ] as const;

      if (
        !validAdjustmentTypes.includes(
          type,
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invalid stock adjustment type.",
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
            "A reason for the adjustment is required.",
        });
        return;
      }

      const requestedAdjustedQty =
        adjustedQty !== undefined
          ? adjustedQty
          : quantity;

      const parsedAdjustedQty =
        Number(
          requestedAdjustedQty,
        );

      if (
        !Number.isInteger(
          parsedAdjustedQty,
        ) ||
        parsedAdjustedQty < 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Adjusted quantity must be a non-negative whole number.",
        });
        return;
      }

      const adjustmentDate =
        date !== undefined
          ? new Date(date)
          : new Date();

      if (
        Number.isNaN(
          adjustmentDate.getTime(),
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invalid adjustment date.",
        });
        return;
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            /**
             * IMPORTANT:
             * The drug lookup is organization-scoped.
             * A user cannot adjust stock belonging to
             * another pharmacy or clinic.
             */
            const drug =
              await tx.drug.findFirst({
                where: {
                  id: drugId.trim(),
                  organizationId,
                },
              });

            if (!drug) {
              throw new Error(
                "DRUG_NOT_FOUND",
              );
            }

            /**
             * Confirm the authenticated user is a member
             * of this organization.
             */
            const membership =
              await tx.organizationMembership.findFirst(
                {
                  where: {
                    organizationId,
                    userId:
                      authenticatedUserId,
                  },
                  select: {
                    id: true,
                  },
                },
              );

            if (!membership) {
              throw new Error(
                "USER_NOT_IN_ORGANIZATION",
              );
            }

            const previousQty =
              drug.qty;

            /**
             * adjustedQty represents the resulting stock
             * quantity after the adjustment.
             */
            const updatedDrug =
              await tx.drug.update({
                where: {
                  id: drug.id,
                },
                data: {
                  qty:
                    parsedAdjustedQty,
                  status:
                    calculateDrugStatus(
                      parsedAdjustedQty,
                      drug.expiryDate,
                    ),
                },
              });

            const adjustment =
              await tx.stockAdjustment.create(
                {
                  data: {
                    id:
                      typeof id ===
                          "string" &&
                      id.trim()
                        ? id.trim()
                        : undefined,
                    date:
                      adjustmentDate,
                    drugId:
                      drug.id,
                    drugName:
                      drug.name,
                    batchNo:
                      drug.batchNo,
                    previousQty,
                    adjustedQty:
                      parsedAdjustedQty,
                    type,
                    reason:
                      reason.trim(),
                    adjustedBy:
                      typeof adjustedBy ===
                          "string" &&
                      adjustedBy.trim()
                        ? adjustedBy.trim()
                        : authenticatedUserId,
                    userId:
                      authenticatedUserId,
                    organizationId,
                  },
                },
              );

            return {
              adjustment,
              drug: updatedDrug,
            };
          },
        );

      await recordAudit(
        request,
        {
          action: "CREATE",
          entity:
            "StockAdjustment",
          entityId:
            result.adjustment.id,
          details: {
            drugId:
              result.adjustment.drugId,
            drugName:
              result.adjustment.drugName,
            previousQty:
              result.adjustment.previousQty,
            adjustedQty:
              result.adjustment.adjustedQty,
            type:
              result.adjustment.type,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: result.adjustment,
        drug: result.drug,
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
        if (
          error.message ===
          "DRUG_NOT_FOUND"
        ) {
          response.status(404).json({
            success: false,
            message:
              "Drug not found in the current organization.",
          });
          return;
        }

        if (
          error.message ===
          "USER_NOT_IN_ORGANIZATION"
        ) {
          response.status(403).json({
            success: false,
            message:
              "The authenticated user does not belong to this organization.",
          });
          return;
        }
      }

      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (
          error.code === "P2002"
        ) {
          response.status(409).json({
            success: false,
            message:
              "A stock adjustment with this identifier already exists.",
          });
          return;
        }

        if (
          error.code === "P2025"
        ) {
          response.status(404).json({
            success: false,
            message:
              "The referenced record could not be found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

function calculateDrugStatus(
  qty: number,
  expiryDate: Date,
):
  | "IN_STOCK"
  | "LOW_STOCK"
  | "EXPIRED"
  | "OUT_OF_STOCK" {
  const now = new Date();

  if (expiryDate < now) {
    return "EXPIRED";
  }

  if (qty <= 0) {
    return "OUT_OF_STOCK";
  }

  if (qty <= 10) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

export default router;
