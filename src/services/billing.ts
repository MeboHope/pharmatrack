
import { apiGet, apiPost } from "./api";


export type BillingAmount = number | string | null;

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: BillingAmount;
  annualPrice: BillingAmount;
  currency: string;
  maxUsers: number | null;
  maxProducts: number | null;
  maxLocations: number | null;
  maxMonthlyTransactions: number | null;
  features: unknown;
}

export interface SubscriptionPlanDetails {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxLocations: number | null;
  maxMonthlyTransactions: number | null;
  features: unknown;
}

export interface OrganizationSubscription {
  id: string;
  status: string;
  billingInterval: string;
  amount: BillingAmount;
  currency: string;
  startedAt: string | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlanDetails;
}

export interface BillingPayment {
  id: string;
  provider: string | null;
  method: string | null;
  status: string;
  amount: BillingAmount;
  currency: string;
  providerReference: string | null;
  receiptNumber: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: {
    id: string;
    billingInterval: string;
    plan: {
      code: string;
      name: string;
    };
  } | null;
  subscriptionChangeRequest: {
    requestedInterval: string;
    requestedPlan: {
      code: string;
      name: string;
    };
  } | null;
}

export interface BillingUsageMetric {
  used: number;
  limit: number | null;
}

export interface OrganizationBillingUsage {
  subscription: {
    id: string | null;
    status: string | null;
    hasValidUsagePeriod: boolean;
  };
  users: BillingUsageMetric;
  pendingInvitations: {
    used: number;
  };
  seats: BillingUsageMetric;
  products: BillingUsageMetric;
  monthlyTransactions: BillingUsageMetric & {
    periodStart: string | null;
    periodEnd: string | null;
  };
  locations: {
    tracked: boolean;
    used: number | null;
    limit: number | null;
  };
  generatedAt: string;
}

export async function getBillingPlans(): Promise<BillingPlan[]> {
  return apiGet<BillingPlan[]>("/billing/plans");
}

export async function getOrganizationSubscription(): Promise<
  OrganizationSubscription | null
> {
  return apiGet<OrganizationSubscription | null>(
    "/billing/subscription",
  );
}

export async function getBillingPayments(
  limit = 25,
): Promise<BillingPayment[]> {
  const safeLimit = Math.min(
    100,
    Math.max(1, Math.floor(limit)),
  );

  return apiGet<BillingPayment[]>(
    `/billing/payments?limit=${safeLimit}`,
  );
}

export async function getOrganizationBillingUsage(): Promise<
  OrganizationBillingUsage
> {
  return apiGet<OrganizationBillingUsage>("/billing/usage");
}
export type PlanChangeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED";

export interface BillingPlanChangeRequest {
  id: string;
  organizationId: string;
  requestedById: string;
  requestedPlanId: string;
  requestedInterval: "MONTHLY" | "ANNUAL";
  status: PlanChangeRequestStatus;
  requestReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requestedPlan: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    monthlyPrice: BillingAmount;
    annualPrice: BillingAmount;
    currency: string;
  };
}

export interface BillingCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  status: string;
}

export interface BillingPaymentVerificationResult {
  paymentId: string;
  status: string;
  subscriptionId?: string;
  alreadyProcessed?: boolean;
  message?: string;
}

export async function getPlanChangeRequests() {
  return apiGet<BillingPlanChangeRequest[]>(
    "/billing/plan-change-requests",
  );
}

export async function createPlanChangeRequest(input: {
  requestedPlanId: string;
  requestedInterval: "MONTHLY" | "ANNUAL";
  requestReason?: string;
}) {
  return apiPost<BillingPlanChangeRequest>(
    "/billing/plan-change-requests",
    {
      planId: input.requestedPlanId,
      billingInterval: input.requestedInterval,
      ...(input.requestReason
        ? { requestReason: input.requestReason }
        : {}),
    },
  );
}

export async function startPlanChangeCheckout(
  requestId: string,
  method: "MPESA" | "CARD",
) {
  return apiPost<BillingCheckoutResult>(
    `/billing/plan-change-requests/${encodeURIComponent(requestId)}/checkout`,
    { method },
  );
}

export async function verifyBillingPayment(paymentId: string) {
  return apiGet<BillingPaymentVerificationResult>(
    `/billing/payments/${encodeURIComponent(paymentId)}/verify`,
  );
}