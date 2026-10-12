import { Router } from "express";

import { prisma } from "../prisma.js";

import {
  authenticate,
  requireOrganizationContext,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.use(requireOrganizationContext);

/**
 * GET /api/dashboard
 *
 * Returns organization-scoped dashboard statistics.
 *
 * Product and inventory statistics are calculated from
 * Product -> DrugBatch, not the legacy Drug model.
 */
router.get("/", async (request, response, next) => {
  try {
    const organizationId =
      request.auth?.organizationId;

    if (!organizationId) {
      response.status(403).json({
        success: false,
        message: "Organization context is required.",
      });
      return;
    }

    const [
      products,
      totalPatients,
      totalSuppliers,
      totalTransactions,
      recentTransactions,
      recentAdjustments,
      salesAggregate,
      settings,
    ] = await prisma.$transaction([
      prisma.product.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          status: true,
          batches: {
            select: {
              qty: true,
              expiryDate: true,
              buyingPrice: true,
              status: true,
            },
          },
        },
      }),

      prisma.patient.count({
        where: { organizationId },
      }),

      prisma.supplier.count({
        where: { organizationId },
      }),

      prisma.dispenseTransaction.count({
        where: { organizationId },
      }),

      prisma.dispenseTransaction.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { date: "desc" },
        include: {
          PrescriptionItem: true,
          Patient: true,
        },
      }),

      prisma.stockAdjustment.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { date: "desc" },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      }),

      prisma.dispenseTransaction.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          organizationId,
          status: "COMPLETED",
        },
      }),

      prisma.pharmacySettings.findUnique({
        where: { organizationId },
        select: {
          reorderAlertLevel: true,
          expiryAlertDays: true,
        },
      }),
    ]);

    const reorderAlertLevel =
      settings?.reorderAlertLevel ?? 10;

    const expiryAlertDays =
      settings?.expiryAlertDays ?? 90;

    const now = new Date();

    const expiryCutoff = new Date(now);

    expiryCutoff.setDate(
      expiryCutoff.getDate() + expiryAlertDays,
    );

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;
    let inStockCount = 0;

    for (const product of products) {
      if (product.status !== "ACTIVE") {
        continue;
      }

      let usableQuantity = 0;
      let hasExpiredStock = false;
      let hasExpiringStock = false;

      for (const batch of product.batches) {
        if (
          batch.status !== "ACTIVE" ||
          batch.qty <= 0
        ) {
          continue;
        }

        const expiryDate =
          new Date(batch.expiryDate);

        if (
          Number.isNaN(expiryDate.getTime())
        ) {
          continue;
        }

        /*
         * Expired stock is not counted as usable
         * inventory or usable stock value.
         */
        if (expiryDate < now) {
          hasExpiredStock = true;
          continue;
        }

        usableQuantity += batch.qty;

        totalStockValue +=
          batch.qty *
          Number(batch.buyingPrice ?? 0);

        if (expiryDate <= expiryCutoff) {
          hasExpiringStock = true;
        }
      }

      if (hasExpiredStock) {
        expiredCount += 1;
      }

      if (hasExpiringStock) {
        expiringSoonCount += 1;
      }

      if (usableQuantity === 0) {
        outOfStockCount += 1;
      } else if (
        usableQuantity <= reorderAlertLevel
      ) {
        lowStockCount += 1;
      } else {
        inStockCount += 1;
      }
    }

    const totalProducts = products.length;

    response.json({
      success: true,
      data: {
        summary: {
          totalProducts,

          // Compatibility with existing consumers.
          totalDrugs: totalProducts,

          totalStockValue,

          expiredCount,
          expiredDrugs: expiredCount,

          outOfStockCount,
          outOfStockDrugs: outOfStockCount,

          lowStockCount,
          lowStockDrugs: lowStockCount,

          expiringSoonCount,
          inStockCount,

          totalPatients,
          totalSuppliers,
          totalTransactions,

          totalSales:
            salesAggregate._sum.totalAmount ?? 0,
        },

        recentTransactions,
        recentAdjustments,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;