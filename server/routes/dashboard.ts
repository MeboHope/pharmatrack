
import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * GET /api/dashboard
 *
 * Provides the aggregated information required by
 * the PharmaTrack dashboard.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
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
      prisma.drug.count(),

      prisma.drug.count({
        where: {
          status: "LOW_STOCK",
        },
      }),

      prisma.drug.count({
        where: {
          status: "OUT_OF_STOCK",
        },
      }),

      prisma.drug.count({
        where: {
          status: "EXPIRED",
        },
      }),

      prisma.patient.count(),

      prisma.supplier.count(),

      prisma.dispenseTransaction.count(),

      prisma.dispenseTransaction.findMany({
        take: 5,
        orderBy: {
          date: "desc",
        },
        include: {
          items: true,
          patient: true,
        },
      }),

      prisma.stockAdjustment.findMany({
        take: 5,
        orderBy: {
          date: "desc",
        },
        include: {
          user: {
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
          status: "COMPLETED",
        },
      }),
    ]);

    return res.json({
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
            salesAggregate._sum.totalAmount || 0,
        },

        recentTransactions,

        recentAdjustments,
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch dashboard data:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
});

export default router;