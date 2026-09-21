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
 * Provides the aggregated information required by
 * the PharmaTrack dashboard.
 *
 * Authentication and organization context are required.
 *
 * All organization-owned data is restricted to the
 * authenticated user's active organization.
 */
router.get("/", async (request, response, next) => {
  try {
    const organizationId =
      request.auth?.organizationId;

    if (!organizationId) {
      response.status(403).json({
        success: false,
        message:
          "Organization context is required.",
      });
      return;
    }

    const [
      totalDrugs,
      lowStockDrugs,
      outOfStockDrugs,
      expiredDrugs,
      totalPatients,
      totalSuppliers,
      totalTransactions,
      recentTransactions,
      recentAdjustments,
      salesAggregate,
    ] = await prisma.$transaction([
      prisma.drug.count({
        where: {
          organizationId,
        },
      }),

      prisma.drug.count({
        where: {
          organizationId,
          status: "LOW_STOCK",
        },
      }),

      prisma.drug.count({
        where: {
          organizationId,
          status: "OUT_OF_STOCK",
        },
      }),

      prisma.drug.count({
        where: {
          organizationId,
          status: "EXPIRED",
        },
      }),

      prisma.patient.count({
        where: {
          organizationId,
        },
      }),

      prisma.supplier.count({
        where: {
          organizationId,
        },
      }),

      prisma.dispenseTransaction.count({
        where: {
          organizationId,
        },
      }),

      prisma.dispenseTransaction.findMany({
        where: {
          organizationId,
        },
        take: 5,
        orderBy: {
          date: "desc",
        },
        include: {
          PrescriptionItem: true,
          Patient: true,
        },
      }),

      prisma.stockAdjustment.findMany({
        where: {
          organizationId,
        },
        take: 5,
        orderBy: {
          date: "desc",
        },
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
    ]);

    response.json({
      success: true,
      data: {
        summary: {
          totalDrugs,
          lowStockDrugs,
          outOfStockDrugs,
          expiredDrugs,
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