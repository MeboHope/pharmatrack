
import type { PrismaClient } from "@prisma/client";

import { prisma } from "../prisma.js";

/**
 * PharmaTrack SaaS subscription enforcement.
 *
 * This service centralizes subscription validation and resource limits.
 * It does not change the database schema or modify subscription records.
 *
 * Use these checks inside the same database transaction as the operation
 * being protected whenever possible.
 */

type SubscriptionDb = Pick<
  PrismaClient,
  | "organizationSubscription"
  | "organizationMembership"
  | "organizationInvitation"
  | "product"
  | "dispenseTransaction"
>;

export type SubscriptionLimitCode =
  | "SUBSCRIPTION_NOT_FOUND"
  | "SUBSCRIPTION_INACTIVE"
  | "SUBSCRIPTION_LIMIT_REACHED";

export class SubscriptionLimitError extends Error {
  public readonly code: SubscriptionLimitCode;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: SubscriptionLimitCode,
    statusCode = 403,
  ) {
    super(message);
    this.name = "SubscriptionLimitError";
    this.code = code;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface ValidSubscription {
  id: string;
  organizationId: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  plan: {
    id: string;
    name: string;
    maxUsers: number | null;
    maxProducts: number | null;
    maxLocations: number | null;
    maxMonthlyTransactions: number | null;
  };
}

export interface SubscriptionPeriod {
  subscription: ValidSubscription;
  start: Date;
  end: Date;
}

/**
 * Retrieves the organization's latest subscription.
 *
 * The latest record is checked deliberately. An older ACTIVE subscription
 * must not override a newer canceled, expired, or pending subscription.
 */
export async function getValidSubscription(
  db: SubscriptionDb,
  organizationId: string,
  now = new Date(),
): Promise<ValidSubscription> {
  const subscription = await db.organizationSubscription.findFirst({
    where: { organizationId },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          maxUsers: true,
          maxProducts: true,
          maxLocations: true,
          maxMonthlyTransactions: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new SubscriptionLimitError(
      "This organization does not have a subscription. Please contact your administrator.",
      "SUBSCRIPTION_NOT_FOUND",
    );
  }

  if (subscription.status === "ACTIVE") {
    const start = subscription.currentPeriodStart;
    const end = subscription.currentPeriodEnd;

    if (
      subscription.endedAt !== null ||
      !start ||
      !end ||
      now < start ||
      now >= end
    ) {
      throw new SubscriptionLimitError(
        "The organization's subscription is not currently valid. Please review the subscription or contact your administrator.",
        "SUBSCRIPTION_INACTIVE",
      );
    }

    return subscription;
  }

  if (subscription.status === "TRIALING") {
    const start = subscription.trialStartsAt;
    const end = subscription.trialEndsAt;

    if (
      subscription.endedAt !== null ||
      !start ||
      !end ||
      now < start ||
      now >= end
    ) {
      throw new SubscriptionLimitError(
        "The organization's trial is not currently valid. Please contact your administrator to continue using PharmaTrack.",
        "SUBSCRIPTION_INACTIVE",
      );
    }

    return subscription;
  }

  throw new SubscriptionLimitError(
    "The organization's subscription is not active. Please contact your administrator.",
    "SUBSCRIPTION_INACTIVE",
  );
}

/**
 * Returns the period in which monthly dispensing transactions are counted.
 *
 * ACTIVE subscriptions use their current billing period.
 * TRIALING subscriptions use their trial date range.
 *
 * The trial window is used as the quota window because trial subscriptions
 * do not have currentPeriodStart/currentPeriodEnd in the existing design.
 */
export async function getSubscriptionPeriod(
  db: SubscriptionDb,
  organizationId: string,
  now = new Date(),
): Promise<SubscriptionPeriod> {
  const subscription = await getValidSubscription(
    db,
    organizationId,
    now,
  );

  const start =
    subscription.status === "TRIALING"
      ? subscription.trialStartsAt
      : subscription.currentPeriodStart;

  const end =
    subscription.status === "TRIALING"
      ? subscription.trialEndsAt
      : subscription.currentPeriodEnd;

  if (!start || !end) {
    throw new SubscriptionLimitError(
      "The subscription period is not configured correctly. Please contact your administrator.",
      "SUBSCRIPTION_INACTIVE",
    );
  }

  return {
    subscription,
    start,
    end,
  };
}

/**
 * Checks whether another organization user can be added.
 *
 * Pending invitations count toward the user limit so an organization cannot
 * exceed its plan by creating many invitations before they are accepted.
 *
 * When accepting an invitation, pass its ID so that invitation is not
 * counted twice: once as pending and once as a new membership.
 *
 * A null maxUsers value means unlimited users.
 */
export async function assertUserLimit(
  db: SubscriptionDb,
  organizationId: string,
  options: {
    now?: Date;
    excludeInvitationId?: string;
  } = {},
): Promise<void> {
  const now = options.now ?? new Date();

  const subscription = await getValidSubscription(
    db,
    organizationId,
    now,
  );

  const maxUsers = subscription.plan.maxUsers;

  if (maxUsers === null) {
    return;
  }

  const [memberCount, pendingInvitationCount] = await Promise.all([
    db.organizationMembership.count({
      where: { organizationId },
    }),

    db.organizationInvitation.count({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
        ...(options.excludeInvitationId
          ? { id: { not: options.excludeInvitationId } }
          : {}),
      },
    }),
  ]);

  const occupiedSeats = memberCount + pendingInvitationCount;

  if (occupiedSeats >= maxUsers) {
    throw new SubscriptionLimitError(
      `This organization has reached its plan limit of ${maxUsers} users. Upgrade the subscription or remove an unused invitation before adding another user.`,
      "SUBSCRIPTION_LIMIT_REACHED",
      403,
    );
  }
}

/**
 * Checks whether another product can be created.
 *
 * Existing products count toward the limit, regardless of status.
 * A null maxProducts value means unlimited products.
 */
export async function assertProductLimit(
  db: SubscriptionDb,
  organizationId: string,
  now = new Date(),
): Promise<void> {
  const subscription = await getValidSubscription(
    db,
    organizationId,
    now,
  );

  const maxProducts = subscription.plan.maxProducts;

  if (maxProducts === null) {
    return;
  }

  const productCount = await db.product.count({
    where: { organizationId },
  });

  if (productCount >= maxProducts) {
    throw new SubscriptionLimitError(
      `This organization has reached its plan limit of ${maxProducts} products. Upgrade the subscription or remove products that are no longer needed.`,
      "SUBSCRIPTION_LIMIT_REACHED",
      403,
    );
  }
}

/**
 * Checks whether another completed dispensing transaction can be recorded.
 *
 * Only COMPLETED transactions within the current billing period or trial
 * window count toward maxMonthlyTransactions. CANCELLED and PENDING
 * transactions do not consume the quota.
 *
 * Call this inside the same transaction that creates the dispense
 * transaction to reduce the risk of concurrent requests exceeding the cap.
 *
 * A null maxMonthlyTransactions value means unlimited transactions.
 */
export async function assertMonthlyTransactionLimit(
  db: SubscriptionDb,
  organizationId: string,
  now = new Date(),
): Promise<void> {
  const { subscription, start, end } =
    await getSubscriptionPeriod(db, organizationId, now);

  const maxTransactions =
    subscription.plan.maxMonthlyTransactions;

  if (maxTransactions === null) {
    return;
  }

  const completedTransactionCount =
    await db.dispenseTransaction.count({
      where: {
        organizationId,
        status: "COMPLETED",
        date: {
          gte: start,
          lt: end,
        },
      },
    });

  if (completedTransactionCount >= maxTransactions) {
    throw new SubscriptionLimitError(
      `This organization has reached its plan limit of ${maxTransactions} completed dispensing transactions for the current subscription period. Upgrade the subscription to continue.`,
      "SUBSCRIPTION_LIMIT_REACHED",
      403,
    );
  }
}

/**
 * Convenience wrapper for checks that are not already running inside
 * a database transaction.
 *
 * For protected writes, prefer calling the relevant assert function using
 * the existing transaction client so the check and write can be coordinated.
 */
export async function checkOrganizationSubscription(
  organizationId: string,
  now = new Date(),
): Promise<ValidSubscription> {
  return prisma.$transaction((tx) =>
    getValidSubscription(tx, organizationId, now),
  );
}
