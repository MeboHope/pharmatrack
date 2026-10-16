import React, { useCallback, useEffect, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import {
  superAdminService,
  type SubscriptionChangeRequest,
  type SubscriptionChangeRequestStatus,
} from "../services/superAdmin";

type StatusFilter = "" | SubscriptionChangeRequestStatus;

const STATUS_OPTIONS: StatusFilter[] = [
  "",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "APPLIED",
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function statusClasses(status: SubscriptionChangeRequestStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "APPROVED":
      return "bg-blue-50 text-blue-700";
    case "APPLIED":
      return "bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatStatus(status: SubscriptionChangeRequestStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function SuperAdminPlanChangeRequests() {
  const [requests, setRequests] = useState<SubscriptionChangeRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await superAdminService.getSubscriptionChangeRequests(
        statusFilter || undefined,
      );

      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load plan-change requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleReview = async (
    item: SubscriptionChangeRequest,
    decision: "APPROVE" | "REJECT",
  ) => {
    let reason: string | undefined;

    if (decision === "REJECT") {
      const enteredReason = window.prompt(
        `Enter the reason for rejecting the plan-change request from ${item.organization.name}:`,
      );

      if (enteredReason === null) return;

      reason = enteredReason.trim();

      if (!reason) {
        setError("A reason is required when rejecting a request.");
        return;
      }
    }

    const action = decision === "APPROVE" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} the request from ${item.organization.name} for the ${item.requestedPlan.name} plan? ${
        decision === "APPROVE"
          ? "Approval will not change the organization's current subscription. You must apply it separately."
          : "This will reject the request."
      }`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setUpdatingId(item.id);

    try {
      await superAdminService.reviewSubscriptionChangeRequest(item.id, {
        decision,
        ...(reason ? { reason } : {}),
      });

      setNotice(
        decision === "APPROVE"
          ? `Request approved for ${item.organization.name}. The current subscription has not been changed.`
          : `Request rejected for ${item.organization.name}.`,
      );

      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${action} this request.`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApply = async (item: SubscriptionChangeRequest) => {
    const price =
      item.requestedInterval === "MONTHLY"
        ? item.requestedPlan.monthlyPrice
        : item.requestedPlan.annualPrice;

    const confirmed = window.confirm(
      `MANUAL SUBSCRIPTION ACTIVATION\n\n` +
        `Organization: ${item.organization.name}\n` +
        `Plan: ${item.requestedPlan.name}\n` +
        `Billing interval: ${item.requestedInterval}\n` +
        `Plan price: ${formatMoney(price, item.requestedPlan.currency)}\n\n` +
        `This will activate the requested subscription and mark the request as APPLIED.\n\n` +
        `IMPORTANT: This action does not verify, collect, or record payment. Confirm only if you are authorized to activate this subscription manually.\n\n` +
        `Continue?`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setUpdatingId(item.id);

    try {
      await superAdminService.applySubscriptionChangeRequest(item.id);

      setNotice(
        `The ${item.requestedPlan.name} subscription was manually activated for ${item.organization.name}. No payment was verified or recorded.`,
      );

      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to apply this plan-change request.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = requests.filter(
    (item) => item.status === "PENDING",
  ).length;

  const approvedCount = requests.filter(
    (item) => item.status === "APPROVED",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="text-[#22577A]" size={27} />
            <h1 className="text-2xl font-bold text-slate-900">
              Plan Change Requests
            </h1>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review organizations&apos; requests to change subscription plans.
            Approval and subscription activation are separate operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRequests()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert
            size={21}
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <div>
            <h2 className="text-sm font-bold text-amber-900">
              Manual activation — payment is not verified
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Approving a request does not change a subscription. Applying an
              approved request manually activates the plan, but does not
              confirm payment or create a payment record. Do not treat this
              action as proof of payment.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              Pending requests
            </span>
            <Clock size={20} className="text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "—" : pendingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Awaiting Super Admin review in the current result set
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              Approved, not applied
            </span>
            <CheckCircle2 size={20} className="text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "—" : approvedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Approved requests awaiting manual activation
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Request history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review, approve, reject, or apply eligible requests.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/20"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status || "ALL"} value={status}>
                  {status ? formatStatus(status) : "All statuses"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
            <RefreshCw size={18} className="animate-spin" />
            Loading plan-change requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck
              size={36}
              className="mx-auto text-slate-300"
            />
            <h3 className="mt-3 font-semibold text-slate-800">
              No requests found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              There are no plan-change requests matching this filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((item) => {
              const price =
                item.requestedInterval === "MONTHLY"
                  ? item.requestedPlan.monthlyPrice
                  : item.requestedPlan.annualPrice;

              const busy = updatingId === item.id;

              return (
                <article key={item.id} className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {item.organization.name}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                        >
                          {formatStatus(item.status)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {item.organization.type}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Requested plan
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {item.requestedPlan.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {item.requestedPlan.code}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Billing interval
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {item.requestedInterval === "MONTHLY"
                              ? "Monthly"
                              : "Annual"}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatMoney(price, item.requestedPlan.currency)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Requested by
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {item.requestedBy.name}
                          </p>
                          <p className="break-all text-sm text-slate-500">
                            {item.requestedBy.email}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Request reason
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {item.requestReason || "No reason provided."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Submitted: {formatDate(item.createdAt)}</span>
                        {item.reviewedAt && (
                          <span>Reviewed: {formatDate(item.reviewedAt)}</span>
                        )}
                        {item.reviewedBy && (
                          <span>
                            Reviewer: {item.reviewedBy.name}
                          </span>
                        )}
                        {item.appliedAt && (
                          <span>Applied: {formatDate(item.appliedAt)}</span>
                        )}
                      </div>

                      {item.decisionReason && (
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Review note
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                            {item.decisionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-64 xl:justify-end">
                      {item.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleReview(item, "APPROVE")}
                            disabled={busy || updatingId !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleReview(item, "REJECT")}
                            disabled={busy || updatingId !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </>
                      )}

                      {item.status === "APPROVED" && (
                        <button
                          type="button"
                          onClick={() => void handleApply(item)}
                          disabled={busy || updatingId !== null}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22577A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#193F59] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} />
                          Apply Approved Plan
                        </button>
                      )}

                      {busy && (
                        <span className="inline-flex items-center gap-2 px-2 py-2 text-xs text-slate-500">
                          <RefreshCw size={14} className="animate-spin" />
                          Processing…
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}