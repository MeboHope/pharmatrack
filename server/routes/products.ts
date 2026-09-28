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

const viewProducts = requireRole(
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
);

const manageProducts = requireRole(
  "ADMIN",
  "PHARMACIST",
);

const adminOnly = requireRole("ADMIN");

const cleanString = (
  value: unknown,
  maxLength = 255,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  if (!cleaned || cleaned.length > maxLength) {
    return undefined;
  }

  return cleaned;
};

const cleanOptionalString = (
  value: unknown,
  maxLength = 2000,
): string | null | undefined => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.length > maxLength) {
    return undefined;
  }

  return cleaned;
};

const normalizeCode = (
  value: unknown,
): string | undefined => {
  const cleaned = cleanString(value, 100);

  if (!cleaned) {
    return undefined;
  }

  return cleaned.toUpperCase();
};

const normalizeProductStatus = (
  value: unknown,
):
  | "ACTIVE"
  | "INACTIVE"
  | undefined => {
  if (
    value === "ACTIVE" ||
    value === "INACTIVE"
  ) {
    return value;
  }

  return undefined;
};

/**
 * GET /api/products
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Returns only products belonging to the authenticated
 * user's active organization.
 *
 * Batch information is summarized so the frontend can
 * display current inventory without exposing a second
 * product query for every row.
 */
router.get(
  "/",
  viewProducts,
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

      const products =
        await prisma.product.findMany({
          where: {
            organizationId,
          },
          include: {
            batches: {
              where: {
                status: "ACTIVE",
              },
              orderBy: {
                expiryDate: "asc",
              },
              select: {
                id: true,
                batchNo: true,
                manufactureDate: true,
                expiryDate: true,
                initialQty: true,
                qty: true,
                buyingPrice: true,
                sellingPrice: true,
                status: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                batches: true,
                movements: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      const now = new Date();

      const data = products.map(
        (product) => {
          const activeBatches =
            product.batches;

          const availableBatches =
            activeBatches.filter(
              (batch) =>
                batch.qty > 0 &&
                batch.expiryDate >= now,
            );

          const totalQuantity =
            activeBatches.reduce(
              (total, batch) =>
                total + batch.qty,
              0,
            );

          const earliestExpiry =
            availableBatches.length > 0
              ? availableBatches[0]
                  .expiryDate
              : null;

          return {
            id: product.id,
            organizationId:
              product.organizationId,
            code: product.code,
            name: product.name,
            genericName:
              product.genericName,
            category:
              product.category,
            formulation:
              product.formulation,
            unit: product.unit,
            notes: product.notes,
            status: product.status,
            createdAt:
              product.createdAt,
            updatedAt:
              product.updatedAt,

            totalQuantity,
            activeBatchCount:
              product._count.batches,
            movementCount:
              product._count.movements,
            earliestExpiry,

            batches:
              activeBatches,
          };
        },
      );

      response.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/products/:id
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Returns one organization-scoped product
 * together with its active batches.
 */
router.get(
  "/:id",
  viewProducts,
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

      const product =
        await prisma.product.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
          include: {
            batches: {
              orderBy: {
                expiryDate: "asc",
              },
              select: {
                id: true,
                batchNo: true,
                manufactureDate: true,
                expiryDate: true,
                initialQty: true,
                qty: true,
                buyingPrice: true,
                sellingPrice: true,
                status: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            _count: {
              select: {
                batches: true,
                movements: true,
              },
            },
          },
        });

      if (!product) {
        response.status(404).json({
          success: false,
          message: "Product not found.",
        });
        return;
      }

      response.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/products
 *
 * ADMIN + PHARMACIST
 *
 * Creates the medicine/product definition.
 *
 * IMPORTANT:
 * This endpoint does NOT create stock.
 * Stock must enter the system through the receiving
 * endpoint, which will create a DrugBatch and StockMovement.
 */
router.post(
  "/",
  manageProducts,
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

      const body =
        request.body ?? {};

      const code =
        normalizeCode(body.code);

      const name =
        cleanString(body.name, 255);

      const genericName =
        cleanString(
          body.genericName,
          255,
        );

      const category =
        cleanString(
          body.category,
          150,
        );

      const formulation =
        cleanString(
          body.formulation,
          150,
        );

      const unit =
        cleanString(
          body.unit,
          100,
        ) ?? "Tablets";

      const notes =
        cleanOptionalString(
          body.notes,
        );

      if (!code) {
        response.status(400).json({
          success: false,
          message:
            "Product code is required.",
        });
        return;
      }

      if (!name) {
        response.status(400).json({
          success: false,
          message:
            "Product name is required.",
        });
        return;
      }

      if (!genericName) {
        response.status(400).json({
          success: false,
          message:
            "Generic name is required.",
        });
        return;
      }

      if (!category) {
        response.status(400).json({
          success: false,
          message:
            "Product category is required.",
        });
        return;
      }

      if (!formulation) {
        response.status(400).json({
          success: false,
          message:
            "Product formulation is required.",
        });
        return;
      }

      if (
        body.notes !== undefined &&
        notes === undefined
      ) {
        response.status(400).json({
          success: false,
          message:
            "Notes are invalid or too long.",
        });
        return;
      }

      const existing =
        await prisma.product.findUnique({
          where: {
            organizationId_code: {
              organizationId,
              code,
            },
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        response.status(409).json({
          success: false,
          message:
            "A product with this code already exists in this organization.",
        });
        return;
      }

      const product =
        await prisma.product.create({
          data: {
            organizationId,
            code,
            name,
            genericName,
            category,
            formulation,
            unit,
            notes:
              notes ?? null,
            status: "ACTIVE",
          },
        });

      await recordAudit(
        request,
        {
          action: "CREATE",
          entity: "Product",
          entityId: product.id,
          details: {
            code: product.code,
            name: product.name,
            genericName:
              product.genericName,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: product,
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
              "A product with this code already exists in this organization.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * PUT /api/products/:id
 *
 * ADMIN + PHARMACIST
 *
 * Updates product/master-data fields only.
 *
 * Stock quantity, batch number, expiry date, buying price,
 * and selling price are deliberately NOT accepted here.
 * Those belong to DrugBatch/inventory operations.
 */
router.put(
  "/:id",
  manageProducts,
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

      const existing =
        await prisma.product.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message: "Product not found.",
        });
        return;
      }

      const body =
        request.body ?? {};

      const data:
        Prisma.ProductUpdateInput = {};

      if (body.code !== undefined) {
        const code =
          normalizeCode(body.code);

        if (!code) {
          response.status(400).json({
            success: false,
            message:
              "Product code must be a non-empty value.",
          });
          return;
        }

        data.code = code;
      }

      if (body.name !== undefined) {
        const name =
          cleanString(body.name, 255);

        if (!name) {
          response.status(400).json({
            success: false,
            message:
              "Product name must be a non-empty value.",
          });
          return;
        }

        data.name = name;
      }

      if (
        body.genericName !==
        undefined
      ) {
        const genericName =
          cleanString(
            body.genericName,
            255,
          );

        if (!genericName) {
          response.status(400).json({
            success: false,
            message:
              "Generic name must be a non-empty value.",
          });
          return;
        }

        data.genericName =
          genericName;
      }

      if (body.category !== undefined) {
        const category =
          cleanString(
            body.category,
            150,
          );

        if (!category) {
          response.status(400).json({
            success: false,
            message:
              "Category must be a non-empty value.",
          });
          return;
        }

        data.category = category;
      }

      if (
        body.formulation !==
        undefined
      ) {
        const formulation =
          cleanString(
            body.formulation,
            150,
          );

        if (!formulation) {
          response.status(400).json({
            success: false,
            message:
              "Formulation must be a non-empty value.",
          });
          return;
        }

        data.formulation =
          formulation;
      }

      if (body.unit !== undefined) {
        const unit =
          cleanString(body.unit, 100);

        if (!unit) {
          response.status(400).json({
            success: false,
            message:
              "Unit must be a non-empty value.",
          });
          return;
        }

        data.unit = unit;
      }

      if (body.notes !== undefined) {
        const notes =
          cleanOptionalString(
            body.notes,
          );

        if (
          notes === undefined
        ) {
          response.status(400).json({
            success: false,
            message:
              "Notes are invalid or too long.",
          });
          return;
        }

        data.notes = notes;
      }

      if (body.status !== undefined) {
        const status =
          normalizeProductStatus(
            body.status,
          );

        if (!status) {
          response.status(400).json({
            success: false,
            message:
              "Product status must be ACTIVE or INACTIVE.",
          });
          return;
        }

        data.status = status;
      }

      const product =
        await prisma.product.update({
          where: {
            id: existing.id,
          },
          data,
        });

      await recordAudit(
        request,
        {
          action: "UPDATE",
          entity: "Product",
          entityId: product.id,
          details: {
            code: product.code,
            name: product.name,
            status: product.status,
          },
        },
      );

      response.json({
        success: true,
        data: product,
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
              "A product with this code already exists in this organization.",
          });
          return;
        }

        if (error.code === "P2025") {
          response.status(404).json({
            success: false,
            message:
              "Product not found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * DELETE /api/products/:id
 *
 * ADMIN ONLY
 *
 * Products are archived rather than physically deleted.
 *
 * This protects inventory history and prevents a product
 * referenced by batches or movements from disappearing.
 */
router.delete(
  "/:id",
  adminOnly,
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

      const product =
        await prisma.product.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
          include: {
            _count: {
              select: {
                batches: true,
                movements: true,
              },
            },
          },
        });

      if (!product) {
        response.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
        return;
      }

      const updated =
        await prisma.product.update({
          where: {
            id: product.id,
          },
          data: {
            status: "INACTIVE",
          },
        });

      await recordAudit(
        request,
        {
          action: "ARCHIVE",
          entity: "Product",
          entityId: product.id,
          details: {
            code: product.code,
            name: product.name,
            previousStatus:
              product.status,
            batchCount:
              product._count.batches,
            movementCount:
              product._count.movements,
          },
        },
      );

      response.json({
        success: true,
        message:
          "Product archived successfully.",
        data: updated,
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2025") {
          response.status(404).json({
            success: false,
            message:
              "Product not found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

export default router;