import { prisma } from "../prisma.js";
import auditService from "./audit.js";

const PROVIDER = "INTASEND";

const ACTIVE_SUBSCRIPTION_STATUSES = [
  "PENDING",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
] as const;

export interface VerifiedIntaSendPayment {
  invoiceId: string;
  apiRef: string;
  state: string;
  amount: number | string;
  currency: string;
  providerReference?: string | null;
}

export class BillingPaymentActivationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "BillingPaymentActivationError";
  }
}

function toMinorUnits(value: number | string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new BillingPaymentActivationError(
      "The payment provider returned an invalid amount.",
      "INVALID_PAYMENT_AMOUNT",
    );
  }

  return Math.round(amount * 100);
}

function addBillingPeriod(
  start: Date,
  interval: string,
): Date {
  const end = new Date(start);

  if (interval === "MONTHLY") {
    end.setUTCMonth(end.getUTCMonth() + 1);
    return end;
  }

  if (interval === "ANNUAL") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return end;
  }

  throw new BillingPaymentActivationError(
    "The billing interval is invalid.",
    "INVALID_BILLING_INTERVAL",
  );
}

/**
 * Activates a subscription only after a caller has verified the
 * payment directly against IntaSend's status API.
 *
 * The caller must supply the actual provider status response values,
 * not values supplied by the browser.
 *
 * Checkout must use the BillingPayment.id as IntaSend's api_ref.
 */
export async function activateVerifiedIntaSendPayment(
  paymentId: string,
  verified: VerifiedIntaSendPayment,
): Promise<{
  alreadyProcessed: boolean;
  subscriptionId: string;
}> {
  if (
    !paymentId.trim() ||
    !verified.invoiceId.trim() ||
    !verified.apiRef.trim()
  ) {
    throw new BillingPaymentActivationError(
      "Required payment verification details are missing.",
      "PAYMENT_DETAILS_MISSING",
    );
  }

  if (verified.state.trim().toUpperCase() !== "COMPLETE") {
    throw new BillingPaymentActivationError(
      "IntaSend has not confirmed that this payment is complete.",
      "PAYMENT_NOT_COMPLETE",
    );
  }

  if (verified.apiRef !== paymentId) {
    throw new BillingPaymentActivationError(
      "The provider reference does not match this payment.",
      "PAYMENT_REFERENCE_MISMATCH",
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const initialPayment =
        await tx.billingPayment.findUnique({
          where: { id: paymentId },
          select: {
            id: true,
            provider: true,
            amount: true,
            currency: true,
            status: true,
            providerReference: true,
            subscriptionId: true,
            subscriptionChangeRequestId: true,
          },
        });

      if (!initialPayment) {
        throw new BillingPaymentActivationError(
          "The payment record was not found.",
          "PAYMENT_NOT_FOUND",
        );
      }

      if (initialPayment.provider !== PROVIDER) {
        throw new BillingPaymentActivationError(
          "The payment does not belong to IntaSend.",
          "PAYMENT_PROVIDER_MISMATCH",
        );
      }

      if (!initialPayment.subscriptionChangeRequestId) {
        throw new BillingPaymentActivationError(
          "The payment is not linked to a plan-change request.",
          "PLAN_CHANGE_REQUEST_MISSING",
        );
      }

      if (
        toMinorUnits(initialPayment.amount.toString()) !==
        toMinorUnits(verified.amount)
      ) {
        throw new BillingPaymentActivationError(
          "The verified payment amount does not match the recorded amount.",
          "PAYMENT_AMOUNT_MISMATCH",
        );
      }

      if (
        initialPayment.currency.trim().toUpperCase() !==
        verified.currency.trim().toUpperCase()
      ) {
        throw new BillingPaymentActivationError(
          "The verified payment currency does not match the recorded currency.",
          "PAYMENT_CURRENCY_MISMATCH",
        );
      }

      /*
       * Lock the organization row so concurrent callbacks or status
       * checks cannot activate competing subscriptions simultaneously.
       */
      const changeRequest =
        await tx.subscriptionChangeRequest.findUnique({
          where: {
            id: initialPayment.subscriptionChangeRequestId,
          },
          select: {
            id: true,
            organizationId: true,
            requestedPlanId: true,
            requestedInterval: true,
            status: true,
            appliedAt: true,
            requestedPlan: {
              select: {
                id: true,
                code: true,
                name: true,
                currency: true,
                monthlyPrice: true,
                annualPrice: true,
                isActive: true,
              },
            },
          },
        });

      if (!changeRequest) {
        throw new BillingPaymentActivationError(
          "The associated plan-change request was not found.",
          "PLAN_CHANGE_REQUEST_NOT_FOUND",
        );
      }

      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Organization"
        WHERE "id" = ${changeRequest.organizationId}
        FOR UPDATE
      `;

      /*
       * Re-read after acquiring the organization lock. This protects
       * against a concurrent manual activation or duplicate callback.
       */
      const payment = await tx.billingPayment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          provider: true,
          amount: true,
          currency: true,
          status: true,
          providerReference: true,
          subscriptionId: true,
          subscriptionChangeRequestId: true,
        },
      });

      if (!payment) {
        throw new BillingPaymentActivationError(
          "The payment record no longer exists.",
          "PAYMENT_NOT_FOUND",
        );
      }

      if (payment.status === "SUCCEEDED" && payment.subscriptionId) {
        return {
          alreadyProcessed: true,
          subscriptionId: payment.subscriptionId,
        };
      }

      const currentRequest =
        await tx.subscriptionChangeRequest.findUnique({
          where: { id: changeRequest.id },
          select: {
            status: true,
            appliedAt: true,
          },
        });

      if (!currentRequest) {
        throw new BillingPaymentActivationError(
          "The plan-change request could not be reloaded.",
          "PLAN_CHANGE_REQUEST_NOT_FOUND",
        );
      }

      /*
       * APPLIED requests may have been manually activated by a Super
       * Admin. Never replace that subscription because a late payment
       * notification arrived.
       */
      if (currentRequest.status === "APPLIED") {
        throw new BillingPaymentActivationError(
          "This plan-change request has already been applied.",
          "REQUEST_ALREADY_APPLIED",
        );
      }

      if (currentRequest.status !== "APPROVED") {
        throw new BillingPaymentActivationError(
          "The plan-change request is not approved for activation.",
          "REQUEST_NOT_APPROVED",
        );
      }

      if (!changeRequest.requestedPlan.isActive) {
        throw new BillingPaymentActivationError(
          "The requested subscription plan is no longer active.",
          "PLAN_INACTIVE",
        );
      }

      const plan = changeRequest.requestedPlan;
      const interval = changeRequest.requestedInterval;

      const expectedAmount =
        interval === "MONTHLY"
          ? plan.monthlyPrice
          : interval === "ANNUAL"
            ? plan.annualPrice
            : null;

      if (expectedAmount === null) {
        throw new BillingPaymentActivationError(
          "The requested billing interval is invalid.",
          "INVALID_BILLING_INTERVAL",
        );
      }

      /*
       * Confirm that the amount recorded for checkout is also the
       * configured price of the approved plan. This prevents changing
       * a payment record to another plan or price.
       */
      if (
        toMinorUnits(payment.amount.toString()) !==
        toMinorUnits(expectedAmount.toString())
      ) {
        throw new BillingPaymentActivationError(
          "The recorded payment amount does not match the approved plan price.",
          "PLAN_PRICE_MISMATCH",
        );
      }

      if (
        payment.currency.toUpperCase() !==
        plan.currency.toUpperCase()
      ) {
        throw new BillingPaymentActivationError(
          "The recorded payment currency does not match the approved plan.",
          "PLAN_CURRENCY_MISMATCH",
        );
      }

      /*
       * Retain history while closing any current or pending
       * subscription. All changes below occur in this transaction.
       */
      const now = new Date();

      await tx.organizationSubscription.updateMany({
        where: {
          organizationId: changeRequest.organizationId,
          status: {
            in: [...ACTIVE_SUBSCRIPTION_STATUSES],
          },
        },
        data: {
          status: "EXPIRED",
          endedAt: now,
          cancelAtPeriodEnd: false,
        },
      });

      const subscription =
        await tx.organizationSubscription.create({
          data: {
            organizationId: changeRequest.organizationId,
            planId: plan.id,
            status: "ACTIVE",
            billingInterval: interval,
            amount: expectedAmount,
            currency: plan.currency,
            paymentProvider: PROVIDER,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: addBillingPeriod(now, interval),
            cancelAtPeriodEnd: false,
          },
          select: {
            id: true,
          },
        });

      await tx.billingPayment.update({
        where: { id: paymentId },
        data: {
          status: "SUCCEEDED",
          subscriptionId: subscription.id,
          providerReference: verified.invoiceId,
          receiptNumber: verified.providerReference ?? null,
          paidAt: now,
          failedAt: null,
          failureCode: null,
          failureMessage: null,
        },
      });

      await tx.subscriptionChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: "APPLIED",
          appliedAt: now,
        },
      });

      return {
        alreadyProcessed: false,
        subscriptionId: subscription.id,
        organizationId: changeRequest.organizationId,
        planId: plan.id,
        planCode: plan.code,
        billingInterval: interval,
        amount: expectedAmount.toString(),
        currency: plan.currency,
      };
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
    },
  );

  if (!result.alreadyProcessed) {
    await auditService.log({
      action: "SUBSCRIPTION_ACTIVATED_AFTER_PAYMENT",
      entity: "OrganizationSubscription",
      entityId: result.subscriptionId,
      details: JSON.stringify({
        paymentId,
        organizationId: result.organizationId,
        planId: result.planId,
        planCode: result.planCode,
        billingInterval: result.billingInterval,
        amount: result.amount,
        currency: result.currency,
        provider: PROVIDER,
        invoiceId: verified.invoiceId,
      }),
    });
  }

  return {
    alreadyProcessed: result.alreadyProcessed,
    subscriptionId: result.subscriptionId,
  };
}