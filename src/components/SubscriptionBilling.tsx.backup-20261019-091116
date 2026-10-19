
import React, { useCallback, useEffect, useState } from "react";

import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  RefreshCw,
  ReceiptText,
  Users,
  MapPin,
  Mail,
} from "lucide-react";

import {
  getBillingPayments,
  getBillingPlans,
  getOrganizationBillingUsage,
  getOrganizationSubscription,
  getPlanChangeRequests,
  createPlanChangeRequest,
  startPlanChangeCheckout,
  verifyBillingPayment,
  type BillingAmount,
  type BillingPayment,
  type BillingPlan,
  type BillingPlanChangeRequest,
  type OrganizationBillingUsage,
  type OrganizationSubscription,
} from "../services/billing";

interface SubscriptionBillingProps {
  organizationName?: string | null;
}

function formatAmount(
  amount: BillingAmount,
  currency = "KES",
): string {
  if (amount === null || amount === undefined || amount === "") {
    return "Not specified";
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${String(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency || "KES",
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toLocaleString("en-KE")}`;
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "Not specified";
  }

  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatLimit(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unlimited";
  }

  return value.toLocaleString("en-KE");
}

function getStatusClasses(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "PAID":
    case "SUCCESS":
    case "SUCCEEDED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "TRIALING":
    case "PENDING":
    case "PROCESSING":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "SUSPENDED":
    case "CANCELED":
    case "CANCELLED":
    case "ENDED":
    case "EXPIRED":
    case "FAILED":
    case "PAST_DUE":
      return "bg-rose-50 text-rose-700 ring-rose-200";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(status)}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function PlanLimits({
  plan,
}: {
  plan: Pick<
    BillingPlan,
    | "maxUsers"
    | "maxProducts"
    | "maxLocations"
    | "maxMonthlyTransactions"
  >;
}) {
  const limits = [
    {
      label: "Users",
      value: formatLimit(plan.maxUsers),
      icon: Users,
    },
    {
      label: "Products",
      value: formatLimit(plan.maxProducts),
      icon: Package,
    },
    {
      label: "Locations",
      value: formatLimit(plan.maxLocations),
      icon: MapPin,
    },
    {
      label: "Monthly transactions",
      value: formatLimit(plan.maxMonthlyTransactions),
      icon: Activity,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {limits.map((limit) => {
        const Icon = limit.icon;

        return (
          <div
            key={limit.label}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-500">
                {limit.label}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {limit.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanFeatures({ features }: { features: unknown }) {
  if (!Array.isArray(features) || features.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No additional features listed.
      </p>
    );
  }

  const readableFeatures = features.filter(
    (feature): feature is string =>
      typeof feature === "string" && feature.trim().length > 0,
  );

  if (readableFeatures.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Feature details are configured for this plan.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {readableFeatures.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-2 text-sm text-slate-600"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function UsageCard({
  title,
  used,
  limit,
  limitLabel = "Unlimited",
  description,
  icon: Icon,
  unavailable = false,
}: {
  title: string;
  used: number | null;
  limit: number | null;
  limitLabel?: string;
  description: string;
  icon: React.ElementType;
  unavailable?: boolean;
}) {
  const hasNumericLimit = limit !== null;
  const percentage =
    used !== null && hasNumericLimit && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : used !== null && hasNumericLimit && limit === 0
        ? 100
        : 0;

  const reachedLimit =
    used !== null && hasNumericLimit && used >= limit;

  const barClass = reachedLimit
    ? "bg-rose-500"
    : percentage >= 80
      ? "bg-amber-500"
      : "bg-sky-600";

  const displayedLimit =
    limit === null
      ? limitLabel
      : limit.toLocaleString("en-KE");

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600">
            {title}
          </p>

          {unavailable || used === null ? (
            <p className="mt-2 text-lg font-bold text-slate-800">
              Not tracked
            </p>
          ) : (
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {used.toLocaleString("en-KE")}
              <span className="ml-1 text-sm font-medium text-slate-500">
                / {displayedLimit}
              </span>
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>

      {!unavailable && used !== null && hasNumericLimit && (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label={`${title} usage`}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={Math.min(used, limit)}
          >
            <div
              className={`h-full rounded-full transition-all ${barClass}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p
            className={`mt-2 text-xs font-medium ${
              reachedLimit
                ? "text-rose-700"
                : percentage >= 80
                  ? "text-amber-700"
                  : "text-slate-500"
            }`}
          >
            {reachedLimit
              ? "Plan limit reached"
              : `${percentage}% of plan limit used`}
          </p>
        </div>
      )}

      {!unavailable && used !== null && !hasNumericLimit && (
        <p className="mt-3 text-xs font-medium text-emerald-700">
          {limitLabel === "Unlimited"
            ? "No numeric limit configured"
            : limitLabel}
        </p>
      )}
    </article>
  );
}

export default function SubscriptionBilling({
  organizationName,
}: SubscriptionBillingProps) {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] =
    useState<OrganizationSubscription | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [usage, setUsage] =
    useState<OrganizationBillingUsage | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [planChangeRequests, setPlanChangeRequests] =
  useState<BillingPlanChangeRequest[]>([]);

const [billingInterval, setBillingInterval] =
  useState<"MONTHLY" | "ANNUAL">("MONTHLY");

const [paymentMethod, setPaymentMethod] =
  useState<"MPESA" | "CARD">("MPESA");

const [billingActionId, setBillingActionId] =
  useState<string | null>(null);

const [billingMessage, setBillingMessage] =
  useState<string | null>(null);

const [billingError, setBillingError] =
  useState<string | null>(null);

  const loadBillingData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrors([]);

      try {
        const results = await Promise.allSettled([
  getBillingPlans(),
  getOrganizationSubscription(),
  getBillingPayments(25),
  getOrganizationBillingUsage(),
  getPlanChangeRequests(),
]);

        const nextErrors: string[] = [];

        if (results[0].status === "fulfilled") {
          setPlans(results[0].value);
        } else {
          nextErrors.push("Available plans could not be loaded.");
        }

        if (results[1].status === "fulfilled") {
          setSubscription(results[1].value);
        } else {
          nextErrors.push(
            "Your subscription details could not be loaded.",
          );
        }

        if (results[2].status === "fulfilled") {
          setPayments(results[2].value);
        } else {
          nextErrors.push("Payment history could not be loaded.");
        }

        if (results[3].status === "fulfilled") {
          setUsage(results[3].value);
        } else {
          nextErrors.push("Live usage information could not be loaded.");
        }
        if (results[4].status === "fulfilled") {
  setPlanChangeRequests(results[4].value);
} else {
  nextErrors.push(
    "Plan-change requests could not be loaded.",
  );
}

        setErrors(nextErrors);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get("billing_payment");

  if (!paymentId) {
    return;
  }

  let cancelled = false;

  const verifyReturnedPayment = async () => {
    setBillingError(null);
    setBillingMessage("Verifying your payment with the payment provider...");

    try {
      const result = await verifyBillingPayment(paymentId);

      if (cancelled) {
        return;
      }

      if (result.status === "SUCCEEDED") {
        setBillingMessage(
          "Payment verified successfully. Your subscription details are being refreshed.",
        );
      } else {
        setBillingMessage(
          `Payment status: ${result.status}. If your payment is still processing, refresh this page shortly.`,
        );
      }

      await loadBillingData(true);
    } catch (error: unknown) {
      if (!cancelled) {
        setBillingError(
          error instanceof Error
            ? error.message
            : "Payment verification failed. Refresh and try again.",
        );
      }
    } finally {
      if (!cancelled) {
        params.delete("billing_payment");

        const query = params.toString();
        const cleanUrl =
          window.location.pathname +
          (query ? `?${query}` : "") +
          window.location.hash;

        window.history.replaceState({}, "", cleanUrl);
      }
    }
  };

  void verifyReturnedPayment();

  return () => {
    cancelled = true;
  };
}, [loadBillingData]);

  const currentPlan = subscription?.plan;
  const usageHasSubscription = Boolean(usage?.subscription.id);
  const usagePeriodIsValid = Boolean(
    usage?.subscription.hasValidUsagePeriod,
  );
  const handleRequestPlanChange = async (plan: BillingPlan) => {
  setBillingError(null);
  setBillingMessage(null);
  setBillingActionId(plan.id);

  try {
    await createPlanChangeRequest({
      requestedPlanId: plan.id,
      requestedInterval: billingInterval,
    });

    setBillingMessage(
      `Your request for the ${plan.name} plan (${billingInterval.toLowerCase()}) was submitted. Payment will be available after approval.`,
    );

    await loadBillingData(true);
  } catch (error: unknown) {
    setBillingError(
      error instanceof Error
        ? error.message
        : "Unable to submit the plan-change request.",
    );
  } finally {
    setBillingActionId(null);
  }
};

const handleStartCheckout = async (request: BillingPlanChangeRequest) => {
  if (request.status !== "APPROVED") {
    setBillingError("This plan-change request has not been approved yet.");
    return;
  }

  setBillingError(null);
  setBillingMessage(null);
  setBillingActionId(request.id);

  try {
    const result = await startPlanChangeCheckout(
      request.id,
      paymentMethod,
    );

    if (!result.checkoutUrl) {
      throw new Error("The payment provider did not return a checkout URL.");
    }

    window.location.assign(result.checkoutUrl);
  } catch (error: unknown) {
    setBillingError(
      error instanceof Error
        ? error.message
        : "Unable to start checkout. Please try again.",
    );
    setBillingActionId(null);
  }
};

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-700">
            Organization account
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Subscription &amp; Billing
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review your organization&apos;s assigned plan, plan limits,
            live usage, configured prices, and recorded payment history.
          </p>

          {organizationName && (
            <p className="mt-2 text-sm font-medium text-slate-700">
              {organizationName}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void loadBillingData(true)}
          disabled={loading || refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {billingMessage && (
  <div
    role="status"
    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
  >
    {billingMessage}
  </div>
)}

{billingError && (
  <div
    role="alert"
    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
  >
    {billingError}
  </div>
)}

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <p className="font-semibold text-amber-900">
                Some billing information could not be loaded
              </p>

              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-amber-800">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => void loadBillingData(true)}
                className="mt-3 text-sm font-semibold text-amber-900 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading subscription and billing information...
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <CreditCard className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Current subscription
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    The plan currently assigned to your organization.
                  </p>
                </div>
              </div>

              {subscription && (
                <StatusBadge status={subscription.status} />
              )}
            </div>

            {subscription && currentPlan ? (
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">
                    Assigned plan
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-slate-900">
                    {currentPlan.name}
                  </h3>

                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    {currentPlan.code}
                  </p>

                  {currentPlan.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {currentPlan.description}
                    </p>
                  )}

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Subscription amount
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {formatAmount(
                        subscription.amount,
                        subscription.currency,
                      )}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatLabel(subscription.billingInterval)} billing
                      interval
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">
                    Subscription dates
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Started</p>
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(subscription.startedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">
                          Current period ends
                        </p>
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    </div>

                    {subscription.trialEndsAt && (
                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">
                            Trial ends
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {formatDate(subscription.trialEndsAt)}
                          </p>
                        </div>
                      </div>
                    )}

                    {subscription.cancelAtPeriodEnd && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Cancellation is scheduled for the end of the current
                        billing period.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <CreditCard className="mx-auto h-8 w-8 text-slate-400" />

                <h3 className="mt-3 font-semibold text-slate-900">
                  No subscription assigned
                </h3>

                <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">
                  There is no subscription record available for this
                  organization. Contact PharmaTrack support to request a plan
                  assignment or review.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Live usage
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Current organization usage compared with the assigned plan.
                </p>
              </div>

              {usage?.subscription.status && (
                <StatusBadge status={usage.subscription.status} />
              )}
            </div>

            {!usage ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  Live usage is unavailable. Refresh the page or confirm
                  that the billing usage API is running.
                </p>
              </div>
            ) : !usageHasSubscription ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900">
                  No subscription record
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Organization counts can still be measured, but plan limits
                  cannot be determined until a subscription is assigned.
                </p>
              </div>
            ) : null}

            {usage && (
              <>
                {usageHasSubscription && !usagePeriodIsValid && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">
                      No valid subscription usage period
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      The subscription does not currently have a valid active
                      billing period or trial period. Monthly transaction
                      usage is not counted for a period here. The server
                      independently determines whether dispensing is allowed.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <UsageCard
                    title="User seats"
                    used={usage.seats.used}
                    limit={usageHasSubscription ? usage.seats.limit : null}
                    limitLabel={usageHasSubscription ? "Unlimited" : "No plan"}
                    description={`${usage.users.used} current member(s) and ${usage.pendingInvitations.used} pending invitation(s). Pending invitations count toward the seat limit.`}
                    icon={Users}
                  />

                  <UsageCard
                    title="Products"
                    used={usage.products.used}
                    limit={usageHasSubscription ? usage.products.limit : null}
                    limitLabel={usageHasSubscription ? "Unlimited" : "No plan"}
                    description="Products recorded for this organization."
                    icon={Package}
                  />

                  <UsageCard
                    title="Completed monthly transactions"
                    used={usage.monthlyTransactions.used}
                    limit={
                      usageHasSubscription
                        ? usage.monthlyTransactions.limit
                        : null
                    }
                    limitLabel={usageHasSubscription ? "Unlimited" : "No plan"}
                    description="Completed dispensing transactions within the current subscription or trial period."
                    icon={Activity}
                  />

                  <UsageCard
                    title="Current members"
                    used={usage.users.used}
                    limit={usageHasSubscription ? usage.users.limit : null}
                    limitLabel={usageHasSubscription ? "Unlimited" : "No plan"}
                    description="Organization memberships, excluding pending invitations."
                    icon={Users}
                  />

                  <UsageCard
                    title="Pending invitations"
                    used={usage.pendingInvitations.used}
                    limit={null}
                    limitLabel="Included in seats"
                    description="Valid invitations that have not been accepted or revoked. They count toward the user-seat limit."
                    icon={Mail}
                  />

                  <UsageCard
                    title="Locations"
                    used={usage.locations.tracked ? usage.locations.used : null}
                    limit={
                      usageHasSubscription ? usage.locations.limit : null
                    }
                    limitLabel={usageHasSubscription ? "Unlimited" : "No plan"}
                    description={
                      usage.locations.tracked
                        ? "Locations recorded for this organization."
                        : "Location usage is not tracked because a location data model has not yet been confirmed."
                    }
                    icon={MapPin}
                    unavailable={!usage.locations.tracked}
                  />
                </div>

                {usage.monthlyTransactions.periodStart &&
                  usage.monthlyTransactions.periodEnd && (
                    <p className="mt-4 text-xs text-slate-500">
                      Transaction usage period:{" "}
                      {formatDate(usage.monthlyTransactions.periodStart)}
                      {" – "}
                      {formatDate(usage.monthlyTransactions.periodEnd)}
                    </p>
                  )}

                <p className="mt-2 text-xs text-slate-400">
                  Last usage refresh: {formatDate(usage.generatedAt)}
                </p>
              </>
            )}
          </section>

          {subscription && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Your plan limits
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configured limits for the assigned subscription. Live
                  consumption is displayed separately above.
                </p>
              </div>

              <PlanLimits plan={subscription.plan} />
            </section>
          )}

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Available plans
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review the plans configured by PharmaTrack. Prices shown here
                are informational; selecting a plan does not create a
                subscription or initiate payment.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
  <label
    htmlFor="billing-interval"
    className="text-sm font-semibold text-slate-700"
  >
    Billing interval
  </label>

  <select
    id="billing-interval"
    value={billingInterval}
    onChange={(event) =>
      setBillingInterval(event.target.value as "MONTHLY" | "ANNUAL")
    }
    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
  >
    <option value="MONTHLY">Monthly</option>
    <option value="ANNUAL">Annual</option>
  </select>
</div>

            {plans.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-400" />

                <p className="mt-3 font-semibold text-slate-800">
                  No available plans found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Available plans will appear here once they are configured.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan?.id === plan.id;

                  return (
                    <article
                      key={plan.id}
                      className={`rounded-2xl border bg-white p-5 shadow-sm ${
                        isCurrentPlan
                          ? "border-sky-300 ring-1 ring-sky-200"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {plan.name}
                          </h3>

                          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                            {plan.code}
                          </p>
                        </div>

                        {isCurrentPlan && (
                          <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            Current plan
                          </span>
                        )}
                      </div>

                      {plan.description && (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {plan.description}
                        </p>
                      )}

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Monthly</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {formatAmount(plan.monthlyPrice, plan.currency)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Annual</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {formatAmount(plan.annualPrice, plan.currency)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <h4 className="mb-3 text-sm font-semibold text-slate-800">
                          Plan limits
                        </h4>
                        <PlanLimits plan={plan} />
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <h4 className="mb-3 text-sm font-semibold text-slate-800">
                          Included features
                        </h4>
                        <PlanFeatures features={plan.features} />
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
  <button
    type="button"
    onClick={() => void handleRequestPlanChange(plan)}
    disabled={
      billingActionId !== null ||
      (isCurrentPlan &&
        subscription?.billingInterval === billingInterval)
    }
    className="w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {billingActionId === plan.id
      ? "Submitting request..."
      : isCurrentPlan &&
          subscription?.billingInterval === billingInterval
        ? "Current plan"
        : `Request ${billingInterval === "MONTHLY" ? "monthly" : "annual"} plan`}
  </button>

  <p className="mt-2 text-xs leading-5 text-slate-500">
    Your request must be approved before payment can begin.
  </p>
</div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 p-5 sm:p-6">
    <h2 className="text-lg font-bold text-slate-900">
      Plan-change requests
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Track requests and continue to payment after approval.
    </p>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label
        htmlFor="payment-method"
        className="text-sm font-semibold text-slate-700"
      >
        Payment method
      </label>

      <select
        id="payment-method"
        value={paymentMethod}
        onChange={(event) =>
          setPaymentMethod(event.target.value as "MPESA" | "CARD")
        }
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
      >
        <option value="MPESA">M-Pesa</option>
        <option value="CARD">Card</option>
      </select>
    </div>
  </div>

  {planChangeRequests.length === 0 ? (
    <p className="p-6 text-sm text-slate-500">
      You have not submitted any plan-change requests yet.
    </p>
  ) : (
    <div className="divide-y divide-slate-100">
      {planChangeRequests.map((request) => (
        <div
          key={request.id}
          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-slate-900">
              {request.requestedPlan.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {request.requestedInterval === "MONTHLY"
                ? "Monthly billing"
                : "Annual billing"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Submitted {formatDate(request.createdAt)}
            </p>

            {request.decisionReason && (
              <p className="mt-2 text-sm text-slate-600">
                Review note: {request.decisionReason}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <StatusBadge status={request.status} />

            {request.status === "APPROVED" && (
              <button
                type="button"
                onClick={() => void handleStartCheckout(request)}
                disabled={billingActionId !== null}
                className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingActionId === request.id
                  ? "Starting checkout..."
                  : `Pay with ${paymentMethod === "MPESA" ? "M-Pesa" : "card"}`}
              </button>
            )}

            {request.status === "PENDING" && (
              <p className="text-xs text-amber-700">
                Awaiting Super Admin approval
              </p>
            )}

            {request.status === "REJECTED" && (
              <p className="text-xs text-red-600">
                This request was not approved.
              </p>
            )}

            {request.status === "APPLIED" && (
              <p className="text-xs text-emerald-700">
                This request has been applied.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 p-5 sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <ReceiptText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Payment history
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Recorded billing payments for your organization.
                </p>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center">
                <ReceiptText className="mx-auto h-8 w-8 text-slate-400" />

                <p className="mt-3 font-semibold text-slate-800">
                  No payment records found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Payments will appear here when billing transactions have
                  been recorded in PharmaTrack.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Plan</th>
                      <th className="px-5 py-3 font-semibold">Method</th>
                      <th className="px-5 py-3 font-semibold">Amount</th>
                      <th className="px-5 py-3 font-semibold">
                        Receipt / Reference
                      </th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="align-top hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(payment.paidAt ?? payment.createdAt)}
                        </td>

                        <td className="px-5 py-4">
  <p className="font-medium text-slate-800">
    {payment.subscription?.plan?.name ??
      payment.subscriptionChangeRequest?.requestedPlan?.name ??
      "Not specified"}
  </p>

  <p className="mt-1 text-xs text-slate-500">
    {formatLabel(
      payment.subscription?.billingInterval ??
        payment.subscriptionChangeRequest?.requestedInterval,
    )}
  </p>
</td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatLabel(payment.method ?? payment.provider)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                          {formatAmount(payment.amount, payment.currency)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {payment.receiptNumber ??
                            payment.providerReference ??
                            "Not available"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={payment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />

              <div>
                <p className="font-semibold text-sky-900">
                  Need to change your plan?
                </p>

                <p className="mt-1 text-sm leading-6 text-sky-800">
                  Online plan selection and checkout are not enabled on this
                  page. Contact PharmaTrack support to request a subscription
                  change. A plan change or payment must be confirmed through
                  the appropriate billing process.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
