import { Router } from "express";

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

const pharmacistOnly = requireRole(
  "ADMIN",
  "PHARMACIST",
);

const getOrganizationId = (
  organizationId: string | undefined,
): string => {
  if (!organizationId) {
    throw new Error(
      "Organization context is required.",
    );
  }

  return organizationId;
};

/**
 * POST /api/stock-receiving
 *
 * Receives new stock for an existing drug.
 *
 * Only Admin and Pharmacist users may receive stock.
 *
 * The drug must belong to the authenticated
 * user's active organization.
 */
router.post(
  "/",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const organizationId =
        getOrganizationId(
          request.auth?.organizationId,
        );

      const {
        drugId,
        qtyReceived,
        invoiceNo,
        buyingPrice,
      } = request.body ?? {};

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

      const parsedQtyReceived =
        Number(qtyReceived);

      if (
        !Number.isInteger(
          parsedQtyReceived,
        ) ||
        parsedQtyReceived <= 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Quantity received must be a positive whole number.",
        });
        return;
      }

      let parsedBuyingPrice:
        | number
        | undefined;

      if (
        buyingPrice !== undefined &&
        buyingPrice !== null &&
        buyingPrice !== ""
      ) {
        parsedBuyingPrice =
          Number(buyingPrice);

        if (
          !Number.isFinite(
            parsedBuyingPrice,
          ) ||
          parsedBuyingPrice < 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Buying price must be a valid non-negative number.",
          });
          return;
        }
      }

      const normalizedInvoiceNo =
        typeof invoiceNo === "string"
          ? invoiceNo.trim()
          : "";

      const result =
        await prisma.$transaction(
          async (database) => {
            const existingDrug =
              await database.drug.findFirst({
                where: {
                  id: drugId.trim(),
                  organizationId,
                },
              });

            if (!existingDrug) {
              throw new Error(
                "Drug could not be found.",
              );
            }

            const existingBuyingPrice =
              Number(
                existingDrug.buyingPrice,
              );

            const existingSellingPrice =
              Number(
                existingDrug.sellingPrice,
              );

            const newQty =
              existingDrug.qty +
              parsedQtyReceived;

            const newBuyingPrice =
              parsedBuyingPrice !==
              undefined
                ? parsedBuyingPrice
                : existingBuyingPrice;

            const markupPercent =
              newBuyingPrice > 0
                ? (
                    (
                      existingSellingPrice -
                      newBuyingPrice
                    ) /
                    newBuyingPrice
                  ) *
                  100
                : Number(
                    existingDrug.markupPercent,
                  );

            let status =
              existingDrug.status;

            if (
              existingDrug.status !==
              "EXPIRED"
            ) {
              if (
                newQty === 0
              ) {
                status =
                  "OUT_OF_STOCK";
              } else if (
                newQty <= 10
              ) {
                status =
                  "LOW_STOCK";
              } else {
                status =
                  "IN_STOCK";
              }
            }

            const updatedDrug =
              await database.drug.update({
                where: {
                  id: existingDrug.id,
                },
                data: {
                  qty: newQty,
                  buyingPrice:
                    newBuyingPrice,
                  markupPercent:
                    Number(
                      markupPercent.toFixed(
                        2,
                      ),
                    ),
                  status,
                  organizationId,
                },
              });

            return {
              existingDrug,
              updatedDrug,
            };
          },
        );

      await recordAudit(
        request,
        {
          action:
            "STOCK_RECEIVED",
          entity:
            "Drug",
          entityId:
            result.updatedDrug.id,
          organizationId,
          details: {
            drugId:
              result.updatedDrug.id,
            drugCode:
              result.updatedDrug.code,
            drugName:
              result.updatedDrug.name,
            batchNo:
              result.updatedDrug.batchNo,
            previousQty:
              result.existingDrug.qty,
            quantityReceived:
              parsedQtyReceived,
            newQty:
              result.updatedDrug.qty,
            previousBuyingPrice:
              Number(
                result.existingDrug
                  .buyingPrice,
              ),
            newBuyingPrice:
              Number(
                result.updatedDrug
                  .buyingPrice,
              ),
            invoiceNo:
              normalizedInvoiceNo ||
              undefined,
          },
        },
      );

      response.status(200).json({
        success: true,
        data: {
          drug: result.updatedDrug,
          receiving: {
            invoiceNo:
              normalizedInvoiceNo,
            quantityReceived:
              parsedQtyReceived,
          },
        },
        message:
          "Stock received successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;