
import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * POST /api/stock-receiving
 *
 * Receives new stock for an existing drug.
 *
 * Body:
 * {
 *   drugId: string;
 *   qtyReceived: number;
 *   invoiceNo?: string;
 *   buyingPrice?: number;
 * }
 *
 * The database is the source of truth.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      drugId,
      qtyReceived,
      invoiceNo,
      buyingPrice,
    } = req.body;

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!drugId || typeof drugId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Drug ID is required.",
      });
    }

    if (
      typeof qtyReceived !== "number" ||
      !Number.isInteger(qtyReceived) ||
      qtyReceived <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity received must be a positive whole number.",
      });
    }

    if (
      buyingPrice !== undefined &&
      (typeof buyingPrice !== "number" ||
        !Number.isFinite(buyingPrice) ||
        buyingPrice < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Buying price must be a valid positive number.",
      });
    }

    // -------------------------------------------------------
    // FIND DRUG
    // -------------------------------------------------------

    const existingDrug = await prisma.drug.findUnique({
      where: {
        id: drugId,
      },
    });

    if (!existingDrug) {
      return res.status(404).json({
        success: false,
        message: "Drug could not be found.",
      });
    }

    // -------------------------------------------------------
    // CALCULATE NEW VALUES
    // -------------------------------------------------------

    const newQty =
      existingDrug.qty + qtyReceived;

    const newBuyingPrice =
      buyingPrice !== undefined
        ? buyingPrice
        : Number(existingDrug.buyingPrice);

    const sellingPrice =
      Number(existingDrug.sellingPrice);

    const markupPercent =
      newBuyingPrice > 0
        ? ((sellingPrice - newBuyingPrice) /
            newBuyingPrice) *
          100
        : Number(existingDrug.markupPercent);

    let status:
      | "IN_STOCK"
      | "LOW_STOCK"
      | "OUT_OF_STOCK"
      | "EXPIRED";

    if (
      existingDrug.status === "EXPIRED"
    ) {
      status = "EXPIRED";
    } else if (newQty === 0) {
      status = "OUT_OF_STOCK";
    } else if (newQty <= 10) {
      status = "LOW_STOCK";
    } else {
      status = "IN_STOCK";
    }

    // -------------------------------------------------------
    // UPDATE DATABASE
    // -------------------------------------------------------

    const updatedDrug =
      await prisma.drug.update({
        where: {
          id: drugId,
        },
        data: {
          qty: newQty,
          buyingPrice: newBuyingPrice,
          markupPercent:
            Number(markupPercent.toFixed(2)),
          status,
        },
      });

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return res.status(200).json({
      success: true,
      data: {
        drug: updatedDrug,
        receiving: {
          invoiceNo:
            typeof invoiceNo === "string"
              ? invoiceNo.trim()
              : "",
          quantityReceived: qtyReceived,
        },
      },
      message: "Stock received successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to receive stock:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to receive stock.",
    });
  }
});

export default router;
