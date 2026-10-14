
import express from "express";

import { prisma } from "../prisma.js";
import {
  authenticate,
  requireOrganizationContext,
  requireRole,
} from "../middleware/auth.js";

const router = express.Router();

/*
 * Billing information is restricted to organization ADMINs.
 * The organization context is derived from verified membership.
 */
router.use(authenticate);
router.use(requireOrganizationContext);
router.use(requireRole("ADMIN"));

/* GET /api/billing/plans */
router.get("/plans", async (_request, response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        monthlyPrice: true,
        annualPrice: true,
        currency: true,
        maxUsers: true,
        maxProducts: true,
        maxLocations: true,
        maxMonthlyTransactions: true,
        features: true,
      },
    });

    response.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Failed to fetch available subscription plans:", error);

    response.status(500).json({
      success: false,
      message: "Failed to fetch available subscription plans.",
    });
  }
});

/* GET /api/billing/subscription */
router.get("/subscription", async (request, response) => {
  try {
    const organizationId = request.auth?.organizationId;

    if (!organizationId) {
      response.status(403).json({
        success: false,
        message: "Organization context is required.",
      });
      return;
    }

    const subscription =
      await prisma.organizationSubscription.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          billingInterval: true,
          amount: true,
          currency: true,
          startedAt: true,
          trialStartsAt: true,
          trialEndsAt: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          canceledAt: true,
          endedAt: true,
          createdAt: true,
          updatedAt: true,
          plan: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              maxUsers: true,
              maxProducts: true,
              maxLocations: true,
              maxMonthlyTransactions: true,
              features: true,
            },
          },
        },
      });

    response.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Failed to fetch organization subscription:", error);

    response.status(500).json({
      success: false,
      message: "Failed to fetch organization subscription.",
    });
  }
});

/* GET /api/billing/payments */
router.get("/payments", async (request, response) => {
  try {
    const organizationId = request.auth?.organizationId;

    if (!organizationId) {
      response.status(403).json({
        success: false,
        message: "Organization context is required.",
      });
      return;
    }

    const parsedLimit = Number(request.query.limit ?? 25);
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 25;

    const payments = await prisma.billingPayment.findMany({
      where: {
        subscription: {
          is: { organizationId },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        provider: true,
        method: true,
        status: true,
        amount: true,
        currency: true,
        providerReference: true,
        receiptNumber: true,
        failureCode: true,
        failureMessage: true,
        initiatedAt: true,
        paidAt: true,
        failedAt: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            id: true,
            billingInterval: true,
            plan: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    response.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Failed to fetch organization billing payments:", error);

    response.status(500).json({
      success: false,
      message: "Failed to fetch organization billing payments.",
    });
  }
});

export default router;
