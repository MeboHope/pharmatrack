
import React, { useCallback, useEffect, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  superAdminService,
  type AssignOrganizationSubscriptionInput,
  type BillingInterval,
  type Organization,
  type OrganizationSubscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "../services/superAdmin";

const STATUS_OPTIONS: SubscriptionStatus[] = [
  "PENDING",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "EXPIRED",
];

const INITIAL_FORM = {
  organizationId: "",
  planId: "",
  billingInterval: "MONTHLY" as BillingInterval,
  status: "PENDING" as "PENDING" | "ACTIVE" | "TRIALING",
  trialDays: "14",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(
  amount: number | string,
  currency: string,
): string {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${currency} ${String(amount)}`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function statusClasses(status: SubscriptionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "TRIALING":
      return "bg-blue-50 text-blue-700";
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "PAST_DUE":
      return "bg-orange-50 text-orange-700";
    case "CANCELED":
    case "EXPIRED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function SuperAdminSubscriptions() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    OrganizationSubscription[]
  >([]);

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [organizationData, planData, subscriptionData] =
        await Promise.all([
          superAdminService.getOrganizations(),
          superAdminService.getSubscriptionPlans(),
          superAdminService.getOrganizationSubscriptions(),
        ]);

      setOrganizations(organizationData);
      setPlans(planData);
      setSubscriptions(subscriptionData);

      setForm((current) => ({
        ...current,
        organizationId:
          current.organizationId ||
          organizationData.find((item) => item.status === "ACTIVE")?.id ||
          organizationData[0]?.id ||
          "",
        planId:
          current.planId ||
          planData.find((item) => item.isActive)?.id ||
          "",
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load organization subscriptions.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activePlans = plans.filter((plan) => plan.isActive);
  const selectedPlan = activePlans.find((plan) => plan.id === form.planId);

  const selectedPrice =
    selectedPlan == null
      ? null
      : form.billingInterval === "MONTHLY"
        ? selectedPlan.monthlyPrice
        : selectedPlan.annualPrice;

  const handleAssign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.organizationId || !form.planId) {
      setError("Choose an organization and an active subscription plan.");
      return;
    }

    const input: AssignOrganizationSubscriptionInput = {
      planId: form.planId,
      billingInterval: form.billingInterval,
      status: form.status,
    };

    if (form.status === "TRIALING") {
      const trialDays = Number(form.trialDays);

      if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90) {
        setError("Trial length must be a whole number from 1 to 90 days.");
        return;
      }

      input.trialDays = trialDays;
    }

    setSubmitting(true);

    try {
      await superAdminService.assignOrganizationSubscription(
        form.organizationId,
        input,
      );

      setNotice(
        "Subscription assigned successfully. The previous subscription, if any, was handled by the server.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to assign this subscription.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    subscription: OrganizationSubscription,
    nextStatus: SubscriptionStatus,
  ) => {
    if (nextStatus === subscription.status) return;

    const confirmed = window.confirm(
      `Change ${subscription.organization.name}'s subscription status from ${subscription.status} to ${nextStatus}?`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setUpdatingId(subscription.id);

    try {
      await superAdminService.updateOrganizationSubscriptionStatus(
        subscription.id,
        nextStatus,
      );

      setNotice(
        `Subscription status changed to ${nextStatus}.`,
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update subscription status.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Organization Subscriptions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign plans, configure billing intervals, and manage subscription
            status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <ShieldCheck size={21} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              Assign a subscription
            </h3>
            <p className="text-sm text-slate-500">
              The server determines the subscription amount from the selected
              plan.
            </p>
          </div>
        </div>

        <form onSubmit={handleAssign} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Organization
              <select
                value={form.organizationId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    organizationId: event.target.value,
                  }))
                }
                required
                disabled={loading || submitting}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select organization</option>
                {organizations.map((organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                    disabled={organization.status !== "ACTIVE"}
                  >
                    {organization.name} ({organization.type})
                    {organization.status !== "ACTIVE" ? " — Suspended" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Subscription plan
              <select
                value={form.planId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    planId: event.target.value,
                  }))
                }
                required
                disabled={loading || submitting}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select active plan</option>
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.code})
                  </option>
                ))}
              </select>
              {activePlans.length === 0 && !loading && (
                <span className="mt-1 block text-xs text-amber-700">
                  Create and activate a plan before assigning a subscription.
                </span>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Billing interval
              <select
                value={form.billingInterval}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    billingInterval: event.target.value as BillingInterval,
                  }))
                }
                disabled={loading || submitting}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Initial status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as
                      | "PENDING"
                      | "ACTIVE"
                      | "TRIALING",
                  }))
                }
                disabled={loading || submitting}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIALING">Trial</option>
              </select>
            </label>

            {form.status === "TRIALING" && (
              <label className="block text-sm font-medium text-slate-700">
                Trial length (days)
                <input
                  type="number"
                  min={1}
                  max={90}
                  step={1}
                  value={form.trialDays}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      trialDays: event.target.value,
                    }))
                  }
                  required
                  disabled={submitting}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            )}
          </div>

          {selectedPlan && selectedPrice !== null && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-800">
                {selectedPlan.name}
              </p>
              <p className="mt-1 text-slate-600">
                {formatMoney(selectedPrice, selectedPlan.currency)} per{" "}
                {form.billingInterval === "MONTHLY" ? "month" : "year"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This assignment does not record a payment or charge the
                organization.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                loading ||
                submitting ||
                !form.organizationId ||
                !form.planId ||
                organizations.length === 0 ||
                activePlans.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <RefreshCw size={16} className="animate-spin" />
              )}
              {submitting ? "Assigning…" : "Assign subscription"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-slate-900">
              Subscription records
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {subscriptions.length} record
              {subscriptions.length === 1 ? "" : "s"} returned by the server.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <RefreshCw size={17} className="animate-spin" />
            Loading subscriptions…
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-800">
              No subscription records yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Assign a plan above to create the first subscription.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Organization</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Billing</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Period ends</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 font-semibold">Change status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {subscription.organization?.name ?? "Unknown organization"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {subscription.organizationId}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {subscription.plan?.name ?? "Unknown plan"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {subscription.plan?.code ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {subscription.billingInterval === "ANNUAL" ? "Annual" : "Monthly"}
                      {subscription.status === "TRIALING" && (
                        <p className="mt-1 text-xs text-blue-700">
                          Trial ends {formatDate(subscription.trialEndsAt)}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      {formatMoney(subscription.amount, subscription.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(subscription.status)}`}
                      >
                        {subscription.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(subscription.currentPeriodEnd)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(subscription.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={subscription.status}
                        disabled={updatingId === subscription.id}
                        onChange={(event) =>
                          void handleStatusChange(
                            subscription,
                            event.target.value as SubscriptionStatus,
                          )
                        }
                        aria-label={`Change status for ${subscription.organization?.name ?? "organization"} subscription`}
                        className="w-40 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      {updatingId === subscription.id && (
                        <p className="mt-1 text-xs text-slate-500">
                          Updating…
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
