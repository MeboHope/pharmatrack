import { Router } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import {
  requireAdmin,
  requirePharmacist,
} from "../middleware/roles";
import { recordAudit } from "../middleware/audit";

const router = Router();

router.use(authenticate);

const parseDate = (
  value: unknown,
): Date | undefined => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

const parsePositiveInteger = (
  value: unknown,
): number | undefined => {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < 0
  ) {
    return undefined;
  }

  return number;
};

const parseMoney = (
  value: unknown,
): Prisma.Decimal | undefined => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return undefined;
  }

  return new Prisma.Decimal(
    number.toFixed(2),
  );
};

const calculateStatus = (
  qty: number,
  expiryDate: Date,
): "IN_STOCK" | "LOW_STOCK" | "EXPIRED" | "OUT_OF_STOCK" => {
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
};

/**
 * GET /api/drugs
 *
 * ADMIN + PHARMACIST
 */
router.get(
  "/",
  requirePharmacist,
  async (request, response, next) => {
    try {
      const drugs =
        await prisma.drug.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });

      response.json({
        success: true,
        data: drugs,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/drugs/:id
 *
 * ADMIN + PHARMACIST
 */
router.get(
  "/:id",
  requirePharmacist,
  async (request, response, next) => {
    try {
      const drug =
        await prisma.drug.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!drug) {
        response.status(404).json({
          success: false,
          message: "Drug not found.",
        });
        return;
      }

      response.json({
        success: true,
        data: drug,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/drugs
 *
 * ADMIN + PHARMACIST
 */
router.post(
  "/",
  requirePharmacist,
  async (request, response, next) => {
    try {
      const body =
        request.body ?? {};

      const {
        code,
        name,
        genericName,
        category,
        formulation,
        batchNo,
        manufactureDate,
        expiryDate,
        qty,
        unit,
        buyingPrice,
        sellingPrice,
        markupPercent,
        notes,
      } = body;

      if (
        typeof code !== "string" ||
        !code.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Drug code is required.",
        });
        return;
      }

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Drug name is required.",
        });
        return;
      }

      if (
        typeof genericName !==
          "string" ||
        !genericName.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Generic name is required.",
        });
        return;
      }

      if (
        typeof category !== "string" ||
        !category.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Drug category is required.",
        });
        return;
      }

      if (
        typeof formulation !==
          "string" ||
        !formulation.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Drug formulation is required.",
        });
        return;
      }

      if (
        typeof batchNo !== "string" ||
        !batchNo.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Batch number is required.",
        });
        return;
      }

      const parsedExpiryDate =
        parseDate(expiryDate);

      if (!parsedExpiryDate) {
        response.status(400).json({
          success: false,
          message:
            "A valid expiry date is required.",
        });
        return;
      }

      const parsedQty =
        parsePositiveInteger(qty);

      if (parsedQty === undefined) {
        response.status(400).json({
          success: false,
          message:
            "Quantity must be a non-negative whole number.",
        });
        return;
      }

      const parsedBuyingPrice =
        parseMoney(buyingPrice);

      const parsedSellingPrice =
        parseMoney(sellingPrice);

      if (
        !parsedBuyingPrice ||
        !parsedSellingPrice
      ) {
        response.status(400).json({
          success: false,
          message:
            "Buying price and selling price are required and must be valid amounts.",
        });
        return;
      }

      const parsedManufactureDate =
        parseDate(manufactureDate);

      const calculatedMarkup =
        parsedBuyingPrice.gt(0)
          ? parsedSellingPrice
              .minus(parsedBuyingPrice)
              .div(parsedBuyingPrice)
              .mul(100)
          : new Prisma.Decimal(0);

      const parsedMarkup =
        markupPercent !== undefined
          ? parseMoney(markupPercent)
          : calculatedMarkup;

      if (!parsedMarkup) {
        response.status(400).json({
          success: false,
          message:
            "Markup percentage must be a valid amount.",
        });
        return;
      }

      const status =
        calculateStatus(
          parsedQty,
          parsedExpiryDate,
        );

      const drug =
        await prisma.drug.create({
          data: {
            code: code.trim(),
            name: name.trim(),
            genericName:
              genericName.trim(),
            category: category.trim(),
            formulation:
              formulation.trim(),
            batchNo: batchNo.trim(),
            manufactureDate:
              parsedManufactureDate,
            expiryDate:
              parsedExpiryDate,
            qty: parsedQty,
            unit:
              typeof unit === "string" &&
              unit.trim()
                ? unit.trim()
                : "Tablets",
            buyingPrice:
              parsedBuyingPrice,
            sellingPrice:
              parsedSellingPrice,
            markupPercent:
              parsedMarkup,
            status,
            notes:
              typeof notes === "string" &&
              notes.trim()
                ? notes.trim()
                : null,
          },
        });

      await recordAudit(
        request,
        {
          action: "CREATE",
          entity: "Drug",
          entityId: drug.id,
          details: {
            code: drug.code,
            name: drug.name,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: drug,
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          response.status(409).json({
            success: false,
            message:
              "A drug with this code already exists.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * PUT /api/drugs/:id
 *
 * ADMIN + PHARMACIST
 */
router.put(
  "/:id",
  requirePharmacist,
  async (request, response, next) => {
    try {
      const existing =
        await prisma.drug.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message: "Drug not found.",
        });
        return;
      }

      const body =
        request.body ?? {};

      const data:
        Prisma.DrugUpdateInput = {};

      if (
        typeof body.code === "string" &&
        body.code.trim()
      ) {
        data.code =
          body.code.trim();
      }

      if (
        typeof body.name === "string" &&
        body.name.trim()
      ) {
        data.name =
          body.name.trim();
      }

      if (
        typeof body.genericName ===
          "string" &&
        body.genericName.trim()
      ) {
        data.genericName =
          body.genericName.trim();
      }

      if (
        typeof body.category ===
          "string" &&
        body.category.trim()
      ) {
        data.category =
          body.category.trim();
      }

      if (
        typeof body.formulation ===
          "string" &&
        body.formulation.trim()
      ) {
        data.formulation =
          body.formulation.trim();
      }

      if (
        typeof body.batchNo === "string" &&
        body.batchNo.trim()
      ) {
        data.batchNo =
          body.batchNo.trim();
      }

      if (body.unit !== undefined) {
        if (
          typeof body.unit !== "string" ||
          !body.unit.trim()
        ) {
          response.status(400).json({
            success: false,
            message:
              "Unit must be a non-empty string.",
          });
          return;
        }

        data.unit =
          body.unit.trim();
      }

      if (body.notes !== undefined) {
        data.notes =
          typeof body.notes === "string" &&
          body.notes.trim()
            ? body.notes.trim()
            : null;
      }

      if (
        body.manufactureDate !==
        undefined
      ) {
        const date =
          parseDate(
            body.manufactureDate,
          );

        if (
          body.manufactureDate &&
          !date
        ) {
          response.status(400).json({
            success: false,
            message:
              "Invalid manufacture date.",
          });
          return;
        }

        data.manufactureDate =
          date ?? null;
      }

      let nextExpiryDate =
        existing.expiryDate;

      if (
        body.expiryDate !== undefined
      ) {
        const date =
          parseDate(
            body.expiryDate,
          );

        if (!date) {
          response.status(400).json({
            success: false,
            message:
              "Invalid expiry date.",
          });
          return;
        }

        nextExpiryDate = date;
        data.expiryDate = date;
      }

      let nextQty =
        existing.qty;

      if (body.qty !== undefined) {
        const qty =
          parsePositiveInteger(
            body.qty,
          );

        if (qty === undefined) {
          response.status(400).json({
            success: false,
            message:
              "Quantity must be a non-negative whole number.",
          });
          return;
        }

        nextQty = qty;
        data.qty = qty;
      }

      let nextBuyingPrice =
        existing.buyingPrice;

      if (
        body.buyingPrice !==
        undefined
      ) {
        const price =
          parseMoney(
            body.buyingPrice,
          );

        if (!price) {
          response.status(400).json({
            success: false,
            message:
              "Buying price must be a valid amount.",
          });
          return;
        }

        nextBuyingPrice =
          price;
        data.buyingPrice =
          price;
      }

      let nextSellingPrice =
        existing.sellingPrice;

      if (
        body.sellingPrice !==
        undefined
      ) {
        const price =
          parseMoney(
            body.sellingPrice,
          );

        if (!price) {
          response.status(400).json({
            success: false,
            message:
              "Selling price must be a valid amount.",
          });
          return;
        }

        nextSellingPrice =
          price;
        data.sellingPrice =
          price;
      }

      if (
        body.markupPercent !==
        undefined
      ) {
        const markup =
          parseMoney(
            body.markupPercent,
          );

        if (!markup) {
          response.status(400).json({
            success: false,
            message:
              "Markup percentage must be a valid amount.",
          });
          return;
        }

        data.markupPercent =
          markup;
      } else if (
        nextBuyingPrice.gt(0)
      ) {
        data.markupPercent =
          nextSellingPrice
            .minus(
              nextBuyingPrice,
            )
            .div(
              nextBuyingPrice,
            )
            .mul(100);
      }

      data.status =
        calculateStatus(
          nextQty,
          nextExpiryDate,
        );

      const drug =
        await prisma.drug.update({
          where: {
            id: request.params.id,
          },
          data,
        });

      await recordAudit(
        request,
        {
          action: "UPDATE",
          entity: "Drug",
          entityId: drug.id,
          details: {
            code: drug.code,
            name: drug.name,
          },
        },
      );

      response.json({
        success: true,
        data: drug,
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          response.status(409).json({
            success: false,
            message:
              "A drug with this code already exists.",
          });
          return;
        }

        if (error.code === "P2025") {
          response.status(404).json({
            success: false,
            message: "Drug not found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * DELETE /api/drugs/:id
 *
 * ADMIN ONLY
 */
router.delete(
  "/:id",
  requireAdmin,
  async (request, response, next) => {
    try {
      const existing =
        await prisma.drug.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message: "Drug not found.",
        });
        return;
      }

      await prisma.drug.delete({
        where: {
          id: request.params.id,
        },
      });

      await recordAudit(
        request,
        {
          action: "DELETE",
          entity: "Drug",
          entityId:
            existing.id,
          details: {
            code:
              existing.code,
            name:
              existing.name,
          },
        },
      );

      response.json({
        success: true,
        message:
          "Drug deleted successfully.",
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2003") {
          response.status(409).json({
            success: false,
            message:
              "This drug cannot be deleted because it is referenced by existing transactions.",
          });
          return;
        }

        if (error.code === "P2025") {
          response.status(404).json({
            success: false,
            message: "Drug not found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

export default router;