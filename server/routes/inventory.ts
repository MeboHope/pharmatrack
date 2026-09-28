import { Router } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../prisma.js";
import {
  authenticate,
  requireOrganizationContext,
  requireRole,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.use(requireOrganizationContext);

const canReceiveStock = requireRole("ADMIN", "PHARMACIST");

function parsePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${fieldName} must be a positive whole number.`,
    );
  }

  return parsed;
}

function parseNonNegativeMoney(
  value: unknown,
  fieldName: string,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `${fieldName} must be a valid non-negative amount.`,
    );
  }

  return Math.round(parsed * 100) / 100;
}

function parseDate(
  value: unknown,
  fieldName: string,
): Date {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${fieldName} is required.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `${fieldName} must be a valid date.`,
    );
  }

  return date;
}

function optionalDate(
  value: unknown,
  fieldName: string,
): Date | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return parseDate(value, fieldName);
}

/**
 * =========================================================
 * RECEIVE STOCK
 * =========================================================
 *
 * POST /api/inventory/receive
 *
 * Receives stock into a product batch.
 *
 * IMPORTANT:
 * - Does NOT modify the legacy Drug table.
 * - A DrugBatch represents a physical stock batch.
 * - Every receipt creates an immutable StockMovement.
 * - Existing batches receive additional quantity.
 * - New batches create new DrugBatch records.
 */
router.post(
  "/receive",
  canReceiveStock,
  async (request, response) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      /*
       * JwtPayload uses "sub" as the authenticated
       * user's ID. Do not use request.auth.userId.
       */
      const userId =
        request.auth?.sub;

      if (
        !organizationId ||
        !userId
      ) {
        return response.status(401).json({
          success: false,
          message:
            "Organization context is required.",
        });
      }

      const {
        productId,
        batchNo,
        manufactureDate,
        expiryDate,
        quantity,
        buyingPrice,
        sellingPrice,
        notes,
        referenceType,
        referenceId,
      } = request.body ?? {};

      if (
        typeof productId !== "string" ||
        !productId.trim()
      ) {
        return response.status(400).json({
          success: false,
          message:
            "productId is required.",
        });
      }

      if (
        typeof batchNo !== "string" ||
        !batchNo.trim()
      ) {
        return response.status(400).json({
          success: false,
          message:
            "batchNo is required.",
        });
      }

      let parsedQuantity: number;
      let parsedBuyingPrice: number;
      let parsedSellingPrice: number;
      let parsedExpiryDate: Date;
      let parsedManufactureDate:
        | Date
        | null;

      try {
        parsedQuantity =
          parsePositiveInteger(
            quantity,
            "quantity",
          );

        parsedBuyingPrice =
          parseNonNegativeMoney(
            buyingPrice,
            "buyingPrice",
          );

        parsedSellingPrice =
          parseNonNegativeMoney(
            sellingPrice,
            "sellingPrice",
          );

        parsedExpiryDate =
          parseDate(
            expiryDate,
            "expiryDate",
          );

        parsedManufactureDate =
          optionalDate(
            manufactureDate,
            "manufactureDate",
          );
      } catch (error) {
        return response.status(400).json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Invalid inventory data.",
        });
      }

      const now = new Date();

      if (
        parsedExpiryDate <= now
      ) {
        return response.status(400).json({
          success: false,
          message:
            "Stock with an expired expiry date cannot be received.",
        });
      }

      if (
        parsedManufactureDate &&
        parsedManufactureDate >
          parsedExpiryDate
      ) {
        return response.status(400).json({
          success: false,
          message:
            "Manufacture date cannot be later than the expiry date.",
        });
      }

      if (
        parsedSellingPrice <
        parsedBuyingPrice
      ) {
        return response.status(400).json({
          success: false,
          message:
            "Selling price cannot be lower than the buying price.",
        });
      }

      const normalizedBatchNo =
        batchNo.trim();

      const result =
        await prisma.$transaction(
          async (transaction) => {
            /*
             * Resolve the product inside the current
             * organization.
             *
             * This prevents a user from receiving stock
             * against another organization's product.
             */
            const product =
              await transaction.product.findFirst(
                {
                  where: {
                    id: productId.trim(),
                    organizationId,
                  },
                  select: {
                    id: true,
                    organizationId: true,
                    code: true,
                    name: true,
                    status: true,
                  },
                },
              );

            if (!product) {
              throw new Error(
                "Product not found.",
              );
            }

            if (
              product.status !==
              "ACTIVE"
            ) {
              throw new Error(
                "Stock cannot be received for an inactive product.",
              );
            }

            /*
             * A batch is uniquely identified by:
             *
             * organization + product + batch number
             */
            const existingBatch =
              await transaction.drugBatch.findUnique(
                {
                  where: {
                    organizationId_productId_batchNo:
                      {
                        organizationId,
                        productId:
                          product.id,
                        batchNo:
                          normalizedBatchNo,
                      },
                  },
                },
              );

            let batch;

            if (existingBatch) {
              /*
               * An existing physical batch should not
               * silently have its expiry date changed.
               */
              const expiryChanged =
                existingBatch.expiryDate.getTime() !==
                parsedExpiryDate.getTime();

              if (expiryChanged) {
                throw new Error(
                  "This batch already exists with a different expiry date. Check the batch number before receiving stock.",
                );
              }

              const newQuantity =
                existingBatch.qty +
                parsedQuantity;

              batch =
                await transaction.drugBatch.update(
                  {
                    where: {
                      id: existingBatch.id,
                    },
                    data: {
                      qty: newQuantity,
                      status: "ACTIVE",
                      notes:
                        typeof notes ===
                          "string" &&
                        notes.trim()
                          ? notes.trim()
                          : existingBatch.notes,
                    },
                  },
                );

              /*
               * Record the additional receipt as a
               * separate immutable movement.
               */
              await transaction.stockMovement.create(
                {
                  data: {
                    organizationId,
                    productId:
                      product.id,
                    batchId:
                      batch.id,
                    type: "RECEIPT",
                    quantityDelta:
                      parsedQuantity,
                    previousQty:
                      existingBatch.qty,
                    resultingQty:
                      newQuantity,
                    referenceType:
                      typeof referenceType ===
                        "string" &&
                      referenceType.trim()
                        ? referenceType.trim()
                        : "STOCK_RECEIPT",
                    referenceId:
                      typeof referenceId ===
                        "string" &&
                      referenceId.trim()
                        ? referenceId.trim()
                        : null,
                    reason: null,
                    notes:
                      typeof notes ===
                        "string" &&
                      notes.trim()
                        ? notes.trim()
                        : null,
                    userId,
                  },
                },
              );
            } else {
              /*
               * Create a new physical batch.
               */
              batch =
                await transaction.drugBatch.create(
                  {
                    data: {
                      organizationId,
                      productId:
                        product.id,
                      batchNo:
                        normalizedBatchNo,
                      manufactureDate:
                        parsedManufactureDate,
                      expiryDate:
                        parsedExpiryDate,
                      initialQty:
                        parsedQuantity,
                      qty:
                        parsedQuantity,
                      buyingPrice:
                        new Prisma.Decimal(
                          parsedBuyingPrice,
                        ),
                      sellingPrice:
                        new Prisma.Decimal(
                          parsedSellingPrice,
                        ),
                      status: "ACTIVE",
                      notes:
                        typeof notes ===
                          "string" &&
                        notes.trim()
                          ? notes.trim()
                          : null,
                    },
                  },
                );

              /*
               * Opening receipt movement.
               */
              await transaction.stockMovement.create(
                {
                  data: {
                    organizationId,
                    productId:
                      product.id,
                    batchId:
                      batch.id,
                    type: "RECEIPT",
                    quantityDelta:
                      parsedQuantity,
                    previousQty: 0,
                    resultingQty:
                      parsedQuantity,
                    referenceType:
                      typeof referenceType ===
                        "string" &&
                      referenceType.trim()
                        ? referenceType.trim()
                        : "STOCK_RECEIPT",
                    referenceId:
                      typeof referenceId ===
                        "string" &&
                      referenceId.trim()
                        ? referenceId.trim()
                        : null,
                    reason: null,
                    notes:
                      typeof notes ===
                        "string" &&
                      notes.trim()
                        ? notes.trim()
                        : null,
                    userId,
                  },
                },
              );
            }

            return {
              product,
              batch,
            };
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        );

      return response.status(201).json({
        success: true,
        message:
          "Stock received successfully.",
        data: {
          product: result.product,
          batch: result.batch,
          quantityReceived:
            parsedQuantity,
        },
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (
          error.code === "P2002"
        ) {
          return response.status(409).json({
            success: false,
            message:
              "This product batch already exists. Refresh the inventory and try again.",
          });
        }

        if (
          error.code === "P2025"
        ) {
          return response.status(404).json({
            success: false,
            message:
              "The requested inventory record was not found.",
          });
        }

        if (
          error.code === "P2034"
        ) {
          return response.status(409).json({
            success: false,
            message:
              "The inventory was updated by another user. Please refresh and try again.",
          });
        }
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to receive stock.";

      if (
        message ===
          "Product not found." ||
        message.startsWith(
          "Stock cannot be received",
        ) ||
        message.startsWith(
          "This batch already exists with a different expiry date",
        )
      ) {
        return response.status(400).json({
          success: false,
          message,
        });
      }

      console.error(
        "Inventory receiving error:",
        error,
      );

      return response.status(500).json({
        success: false,
        message:
          "Failed to receive stock.",
      });
    }
  },
);

/**
 * =========================================================
 * PRODUCT BATCHES
 * =========================================================
 *
 * GET /api/inventory/batches/:productId
 *
 * Returns all batches belonging to the current
 * organization and product.
 *
 * Batches are ordered by expiry date so that the API
 * naturally exposes FEFO order.
 */
router.get(
  "/batches/:productId",
  async (request, response) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return response.status(401).json({
          success: false,
          message:
            "Organization context is required.",
        });
      }

      const productId =
        request.params.productId;

      const product =
        await prisma.product.findFirst(
          {
            where: {
              id: productId,
              organizationId,
            },
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
            },
          },
        );

      if (!product) {
        return response.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      const batches =
        await prisma.drugBatch.findMany(
          {
            where: {
              organizationId,
              productId,
            },
            orderBy: [
              {
                expiryDate: "asc",
              },
              {
                batchNo: "asc",
              },
            ],
          },
        );

      return response.json({
        success: true,
        data: {
          product,
          batches,
        },
      });
    } catch (error) {
      console.error(
        "Inventory batch lookup error:",
        error,
      );

      return response.status(500).json({
        success: false,
        message:
          "Failed to retrieve inventory batches.",
      });
    }
  },
);

/**
 * =========================================================
 * STOCK MOVEMENT HISTORY
 * =========================================================
 *
 * GET /api/inventory/movements/:productId
 *
 * Returns the immutable stock movement history for
 * a product.
 */
router.get(
  "/movements/:productId",
  async (request, response) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return response.status(401).json({
          success: false,
          message:
            "Organization context is required.",
        });
      }

      const productId =
        request.params.productId;

      const product =
        await prisma.product.findFirst(
          {
            where: {
              id: productId,
              organizationId,
            },
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        );

      if (!product) {
        return response.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      const movements =
        await prisma.stockMovement.findMany(
          {
            where: {
              organizationId,
              productId,
            },
            include: {
              batch: {
                select: {
                  id: true,
                  batchNo: true,
                  expiryDate: true,
                },
              },
              user: {
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
          },
        );

      return response.json({
        success: true,
        data: {
          product,
          movements,
        },
      });
    } catch (error) {
      console.error(
        "Inventory movement lookup error:",
        error,
      );

      return response.status(500).json({
        success: false,
        message:
          "Failed to retrieve stock movements.",
      });
    }
  },
);

export default router;