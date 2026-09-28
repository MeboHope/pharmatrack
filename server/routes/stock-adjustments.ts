import { Router } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../prisma.js";
import {
  authenticate,
  requireOrganizationContext,
  requireRole,
} from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";

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

const validAdjustmentTypes = [
  "LOSS_DAMAGE",
  "EXPIRY_REMOVAL",
  "AUDIT_RECONCILIATION",
  "RETURN_TO_SUPPLIER",
] as const;

type AdjustmentType =
  (typeof validAdjustmentTypes)[number];

const adjustmentMovementType: Record<
  AdjustmentType,
  "ADJUSTMENT" |
    "LOSS_DAMAGE" |
    "EXPIRY_REMOVAL" |
    "RETURN_TO_SUPPLIER"
> = {
  LOSS_DAMAGE: "LOSS_DAMAGE",
  EXPIRY_REMOVAL: "EXPIRY_REMOVAL",
  AUDIT_RECONCILIATION: "ADJUSTMENT",
  RETURN_TO_SUPPLIER: "RETURN_TO_SUPPLIER",
};

/**
 * GET /api/stock-adjustments
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Returns stock adjustments belonging only to
 * the authenticated organization.
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
          include: {
            Product: {
              select: {
                id: true,
                code: true,
                name: true,
                genericName: true,
                unit: true,
              },
            },
            Batch: {
              select: {
                id: true,
                batchNo: true,
                expiryDate: true,
                qty: true,
                buyingPrice: true,
                sellingPrice: true,
                status: true,
              },
            },
            User: {
              select: {
                id: true,
                name: true,
                email: true,
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

/**
 * GET /api/stock-adjustments/:id
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Returns one organization-scoped adjustment.
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
          include: {
            Product: {
              select: {
                id: true,
                code: true,
                name: true,
                genericName: true,
                unit: true,
              },
            },
            Batch: {
              select: {
                id: true,
                batchNo: true,
                expiryDate: true,
                qty: true,
                buyingPrice: true,
                sellingPrice: true,
                status: true,
              },
            },
            User: {
              select: {
                id: true,
                name: true,
                email: true,
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

/**
 * POST /api/stock-adjustments
 *
 * ADMIN + PHARMACIST
 *
 * Creates a batch-level stock adjustment.
 *
 * Required:
 *   productId
 *   batchId
 *   quantityDelta
 *   type
 *   reason
 *
 * quantityDelta is signed:
 *   -20 = remove 20 units
 *   +20 = add 20 units
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
        productId,
        batchId,
        quantityDelta,
        type,
        reason,
        notes,
        referenceType,
        referenceId,
      } = body;

      /**
       * Validate product ID.
       */
      if (
        typeof productId !== "string" ||
        !productId.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Product ID is required.",
        });
        return;
      }

      /**
       * Validate batch ID.
       */
      if (
        typeof batchId !== "string" ||
        !batchId.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Batch ID is required.",
        });
        return;
      }

      /**
       * Validate adjustment type.
       */
      if (
        typeof type !== "string" ||
        !validAdjustmentTypes.includes(
          type as AdjustmentType,
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invalid stock adjustment type.",
        });
        return;
      }

      const adjustmentType =
        type as AdjustmentType;

      /**
       * Validate reason.
       */
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

      const trimmedReason =
        reason.trim();

      if (trimmedReason.length > 500) {
        response.status(400).json({
          success: false,
          message:
            "Adjustment reason cannot exceed 500 characters.",
        });
        return;
      }

      /**
       * quantityDelta must be a signed whole number
       * and cannot be zero.
       */
      const parsedQuantityDelta =
        Number(quantityDelta);

      if (
        !Number.isInteger(
          parsedQuantityDelta,
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "Quantity adjustment must be a whole number.",
        });
        return;
      }

      if (
        parsedQuantityDelta === 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Quantity adjustment cannot be zero.",
        });
        return;
      }

      /**
       * Operational adjustment types that represent
       * stock removal cannot increase stock.
       *
       * Audit reconciliation is allowed to move in
       * either direction.
       */
      if (
        adjustmentType !==
          "AUDIT_RECONCILIATION" &&
        parsedQuantityDelta > 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "This adjustment type can only decrease stock.",
        });
        return;
      }

      /**
       * Optional notes.
       */
      let trimmedNotes:
        | string
        | undefined;

      if (
        notes !== undefined &&
        notes !== null
      ) {
        if (
          typeof notes !== "string"
        ) {
          response.status(400).json({
            success: false,
            message:
              "Notes must be text.",
          });
          return;
        }

        trimmedNotes =
          notes.trim();

        if (
          trimmedNotes.length > 1000
        ) {
          response.status(400).json({
            success: false,
            message:
              "Notes cannot exceed 1000 characters.",
          });
          return;
        }

        if (
          trimmedNotes.length === 0
        ) {
          trimmedNotes =
            undefined;
        }
      }

      /**
       * Optional reference information.
       */
      let trimmedReferenceType:
        | string
        | undefined;

      let trimmedReferenceId:
        | string
        | undefined;

      if (
        referenceType !== undefined &&
        referenceType !== null
      ) {
        if (
          typeof referenceType !==
          "string"
        ) {
          response.status(400).json({
            success: false,
            message:
              "Reference type must be text.",
          });
          return;
        }

        trimmedReferenceType =
          referenceType.trim();

        if (
          trimmedReferenceType.length >
          100
        ) {
          response.status(400).json({
            success: false,
            message:
              "Reference type cannot exceed 100 characters.",
          });
          return;
        }

        if (
          trimmedReferenceType.length ===
          0
        ) {
          trimmedReferenceType =
            undefined;
        }
      }

      if (
        referenceId !== undefined &&
        referenceId !== null
      ) {
        if (
          typeof referenceId !==
          "string"
        ) {
          response.status(400).json({
            success: false,
            message:
              "Reference ID must be text.",
          });
          return;
        }

        trimmedReferenceId =
          referenceId.trim();

        if (
          trimmedReferenceId.length >
          200
        ) {
          response.status(400).json({
            success: false,
            message:
              "Reference ID cannot exceed 200 characters.",
          });
          return;
        }

        if (
          trimmedReferenceId.length ===
          0
        ) {
          trimmedReferenceId =
            undefined;
        }
      }

      /**
       * Execute the complete stock adjustment as
       * one database transaction.
       */
      const result =
        await prisma.$transaction(
          async (tx) => {
            /**
             * Confirm authenticated user is a member
             * of the current organization.
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
                    role: true,
                  },
                },
              );

            if (!membership) {
              throw new Error(
                "USER_NOT_IN_ORGANIZATION",
              );
            }

            /**
             * Retrieve the product within the current
             * organization.
             */
            const product =
              await tx.product.findFirst({
                where: {
                  id:
                    productId.trim(),
                  organizationId,
                },
                select: {
                  id: true,
                  code: true,
                  name: true,
                  genericName: true,
                  unit: true,
                },
              });

            if (!product) {
              throw new Error(
                "PRODUCT_NOT_FOUND",
              );
            }

            /**
             * Retrieve the selected batch and make sure
             * it belongs to both the organization and
             * selected product.
             */
            const batch =
              await tx.drugBatch.findFirst({
                where: {
                  id:
                    batchId.trim(),
                  organizationId,
                  productId:
                    product.id,
                },
                select: {
                  id: true,
                  productId: true,
                  batchNo: true,
                  expiryDate: true,
                  qty: true,
                  buyingPrice: true,
                  sellingPrice: true,
                  status: true,
                },
              });

            if (!batch) {
              throw new Error(
                "BATCH_NOT_FOUND",
              );
            }

            const previousQty =
              batch.qty;

            const resultingQty =
              previousQty +
              parsedQuantityDelta;

            /**
             * Never allow inventory to become negative.
             */
            if (
              resultingQty < 0
            ) {
              throw new Error(
                "INSUFFICIENT_STOCK",
              );
            }

            /**
             * Update the selected batch.
             *
             * The resulting quantity is calculated
             * server-side from the current database
             * quantity rather than trusting a client-
             * supplied "new quantity".
             */
            const updatedBatch =
              await tx.drugBatch.update({
                where: {
                  id: batch.id,
                },
                data: {
                  qty: resultingQty,
                },
                select: {
                  id: true,
                  productId: true,
                  batchNo: true,
                  expiryDate: true,
                  qty: true,
                  buyingPrice: true,
                  sellingPrice: true,
                  status: true,
                },
              });

            /**
             * Create an immutable stock movement ledger
             * entry for every adjustment.
             */
            const movement =
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  productId:
                    product.id,
                  batchId:
                    batch.id,
                  type:
                    adjustmentMovementType[
                      adjustmentType
                    ],
                  quantityDelta:
                    parsedQuantityDelta,
                  previousQty,
                  resultingQty,
                  referenceType:
                    trimmedReferenceType,
                  referenceId:
                    trimmedReferenceId,
                  reason:
                    trimmedReason,
                  notes:
                    trimmedNotes,
                  userId:
                    authenticatedUserId,
                },
              });

            /**
             * Create the human-readable adjustment record.
             */
            const adjustment =
              await tx.stockAdjustment.create({
                data: {
                  id:
                    typeof id ===
                      "string" &&
                    id.trim()
                      ? id.trim()
                      : undefined,

                  /**
                   * Legacy fields are populated for
                   * compatibility with existing history
                   * consumers.
                   */
                  drugName:
                    product.name,
                  batchNo:
                    batch.batchNo,

                  /**
                   * New batch architecture.
                   */
                  productId:
                    product.id,
                  batchId:
                    batch.id,

                  previousQty,
                  adjustedQty:
                    resultingQty,
                  quantityDelta:
                    parsedQuantityDelta,

                  type:
                    adjustmentType,
                  reason:
                    trimmedReason,
                  notes:
                    trimmedNotes,

                  /**
                   * adjustedBy is always taken from the
                   * authenticated user rather than trusted
                   * from the browser.
                   */
                  adjustedBy:
                    authenticatedUserId,

                  userId:
                    authenticatedUserId,

                  organizationId,

                  referenceType:
                    trimmedReferenceType,
                  referenceId:
                    trimmedReferenceId,
                },
                include: {
                  Product: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      genericName: true,
                      unit: true,
                    },
                  },
                  Batch: {
                    select: {
                      id: true,
                      batchNo: true,
                      expiryDate: true,
                      qty: true,
                      buyingPrice: true,
                      sellingPrice: true,
                      status: true,
                    },
                  },
                  User: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              });

            return {
              adjustment,
              batch: updatedBatch,
              movement,
              product,
            };
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        );

      /**
       * Record the platform audit event after the
       * inventory transaction succeeds.
       */
      await recordAudit(
        request,
        {
          action: "CREATE",
          entity:
            "StockAdjustment",
          entityId:
            result.adjustment.id,
          details: {
            productId:
              result.product.id,
            productCode:
              result.product.code,
            productName:
              result.product.name,
            batchId:
              result.batch.id,
            batchNo:
              result.batch.batchNo,
            previousQty:
              result.adjustment.previousQty,
            quantityDelta:
              result.adjustment.quantityDelta,
            adjustedQty:
              result.adjustment.adjustedQty,
            type:
              result.adjustment.type,
            reason:
              result.adjustment.reason,
            movementId:
              result.movement.id,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: result.adjustment,
        product: result.product,
        batch: result.batch,
        movement: result.movement,
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
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

        if (
          error.message ===
          "PRODUCT_NOT_FOUND"
        ) {
          response.status(404).json({
            success: false,
            message:
              "Product not found in the current organization.",
          });
          return;
        }

        if (
          error.message ===
          "BATCH_NOT_FOUND"
        ) {
          response.status(404).json({
            success: false,
            message:
              "The selected batch was not found for this product and organization.",
          });
          return;
        }

        if (
          error.message ===
          "INSUFFICIENT_STOCK"
        ) {
          response.status(409).json({
            success: false,
            message:
              "The adjustment would make stock negative. Please check the current batch quantity.",
          });
          return;
        }
      }

      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (
          error.code ===
          "P2002"
        ) {
          response.status(409).json({
            success: false,
            message:
              "A stock adjustment with this identifier already exists.",
          });
          return;
        }

        if (
          error.code ===
          "P2025"
        ) {
          response.status(404).json({
            success: false,
            message:
              "The referenced inventory record could not be found.",
          });
          return;
        }

        /**
         * Serializable transactions can fail when
         * another transaction modifies the same records
         * concurrently.
         */
        if (
          error.code ===
          "P2034"
        ) {
          response.status(409).json({
            success: false,
            message:
              "The stock was changed by another operation. Please refresh the inventory and try again.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

export default router;