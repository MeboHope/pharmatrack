import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { superAdminService } from "../services/superAdmin";
import type {
  SubscriptionPlan,
  SubscriptionPlanInput,
} from "../services/superAdmin";

const emptyForm: SubscriptionPlanInput = {
  code: "",
  name: "",
  description: "",
  monthlyPrice: 0,
  annualPrice: 0,
  currency: "KES",
  maxUsers: null,
  maxProducts: null,
  maxLocations: null,
  maxMonthlyTransactions: null,
  features: [],
  sortOrder: 0,
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/15";

const labelClass = "block text-sm font-medium text-slate-700";

function formatMoney(value: number | string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${currency} ${value}`;
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatLimit(value: number | null | undefined) {
  return value == null ? "Unlimited" : value.toLocaleString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getFeatureList(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features.filter(
      (feature): feature is string => typeof feature === "string",
    );
  }

  if (
    features &&
    typeof features === "object" &&
    "items" in features &&
    Array.isArray((features as { items: unknown }).items)
  ) {
    return (features as { items: unknown[] }).items.filter(
      (feature): feature is string => typeof feature === "string",
    );
  }

  return [];
}

function toForm(plan: SubscriptionPlan): SubscriptionPlanInput {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? "",
    monthlyPrice: Number(plan.monthlyPrice),
    annualPrice: Number(plan.annualPrice),
    currency: plan.currency,
    maxUsers: plan.maxUsers ?? null,
    maxProducts: plan.maxProducts ?? null,
    maxLocations: plan.maxLocations ?? null,
    maxMonthlyTransactions: plan.maxMonthlyTransactions ?? null,
    features: getFeatureList(plan.features),
    sortOrder: plan.sortOrder,
  };
}

function parseOptionalLimit(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function SuperAdminBillingPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<SubscriptionPlanInput>(emptyForm);
  const [featureText, setFeatureText] = useState("");
  const [limitErrors, setLimitErrors] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await superAdminService.getSubscriptionPlans();
      setPlans(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openCreateForm = () => {
    setEditingPlan(null);
    setForm({ ...emptyForm, features: [] });
    setFeatureText("");
    setLimitErrors("");
    setError("");
    setNotice("");
    setEditorOpen(true);
  };

  const openEditForm = (plan: SubscriptionPlan) => {
    const nextForm = toForm(plan);

    setEditingPlan(plan);
    setForm(nextForm);
    setFeatureText(getFeatureList(plan.features).join("\n"));
    setLimitErrors("");
    setError("");
    setNotice("");
    setEditorOpen(true);
  };

  const closeForm = () => {
    if (saving) return;

    setEditorOpen(false);
    setEditingPlan(null);
    setForm(emptyForm);
    setFeatureText("");
    setLimitErrors("");
  };

  const updateField = <K extends keyof SubscriptionPlanInput>(
    key: K,
    value: SubscriptionPlanInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleLimitChange = (
    key:
      | "maxUsers"
      | "maxProducts"
      | "maxLocations"
      | "maxMonthlyTransactions",
    value: string,
  ) => {
    if (value.trim() === "") {
      updateField(key, null);
      return;
    }

    const parsed = Number(value);

    if (Number.isSafeInteger(parsed) && parsed >= 0) {
      updateField(key, parsed);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setNotice("");
    setLimitErrors("");

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const currency = form.currency.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) {
      setError(
        "Plan code must contain 2–40 letters, numbers, underscores or hyphens.",
      );
      return;
    }

    if (!name || name.length > 100) {
      setError("Enter a plan name of no more than 100 characters.");
      return;
    }

    if (
      !Number.isFinite(Number(form.monthlyPrice)) ||
      !Number.isFinite(Number(form.annualPrice)) ||
      Number(form.monthlyPrice) < 0 ||
      Number(form.annualPrice) < 0 ||
      Math.round(Number(form.monthlyPrice) * 100) !==
        Number(form.monthlyPrice) * 100 ||
      Math.round(Number(form.annualPrice) * 100) !==
        Number(form.annualPrice) * 100
    ) {
      setError(
        "Prices must be non-negative amounts with no more than two decimal places.",
      );
      return;
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      setError("Currency must be a three-letter code, such as KES.");
      return;
    }

    if (
      !Number.isSafeInteger(Number(form.sortOrder)) ||
      Number(form.sortOrder) < 0
    ) {
      setError("Display order must be a non-negative whole number.");
      return;
    }

    const limits = [
      ["Maximum users", form.maxUsers],
      ["Maximum products", form.maxProducts],
      ["Maximum locations", form.maxLocations],
      ["Maximum monthly transactions", form.maxMonthlyTransactions],
    ] as const;

    const invalidLimit = limits.find(
      ([, value]) =>
        value !== null &&
        (!Number.isSafeInteger(Number(value)) || Number(value) < 0),
    );

    if (invalidLimit) {
      setLimitErrors(
        `${invalidLimit[0]} must be a non-negative whole number or unlimited.`,
      );
      return;
    }

    const payload: SubscriptionPlanInput = {
      ...form,
      code,
      name,
      description: form.description?.trim() || null,
      monthlyPrice: Number(form.monthlyPrice),
      annualPrice: Number(form.annualPrice),
      currency,
      sortOrder: Number(form.sortOrder),
      features: featureText
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
    };

    setSaving(true);

    try {
      if (editingPlan) {
        await superAdminService.updateSubscriptionPlan(
          editingPlan.id,
          payload,
        );
        setNotice("Subscription plan updated successfully.");
      } else {
        await superAdminService.createSubscriptionPlan(payload);
        setNotice("Subscription plan created successfully.");
      }

      setEditorOpen(false);
      setEditingPlan(null);
      await loadPlans();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (plan: SubscriptionPlan) => {
    const action = plan.isActive ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${plan.name}"? This changes plan availability, not the status of existing pharmacies or clinics.`,
      )
    ) {
      return;
    }

    setStatusUpdating(plan.id);
    setError("");
    setNotice("");

    try {
      await superAdminService.setSubscriptionPlanStatus(
        plan.id,
        !plan.isActive,
      );

      setNotice(
        `"${plan.name}" has been ${plan.isActive ? "deactivated" : "activated"}.`,
      );

      await loadPlans();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setStatusUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-3 text-[#22577A]">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Subscription Plans
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure SaaS pricing, usage limits and plan availability.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadPlans()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865]"
          >
            <Plus size={17} />
            Create plan
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total plans</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {plans.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Active plans</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {plans.filter((plan) => plan.isActive).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Inactive plans</p>
          <p className="mt-2 text-3xl font-bold text-slate-600">
            {plans.filter((plan) => !plan.isActive).length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-900">All plans</h3>
          <p className="mt-1 text-sm text-slate-500">
            Plans are ordered by display order. Existing subscriptions are
            retained when a plan is deactivated.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Loading subscription plans…
          </div>
        ) : plans.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-500">
              <CreditCard size={28} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              No subscription plans yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Create your first plan to define the pricing and usage limits
              available to your pharmacy and clinic customers.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865]"
            >
              <Plus size={17} />
              Create first plan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Monthly</th>
                  <th className="px-5 py-4">Annual</th>
                  <th className="px-5 py-4">Usage limits</th>
                  <th className="px-5 py-4">Subscriptions</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {plan.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {plan.code}
                      </p>
                      {plan.description && (
                        <p className="mt-2 max-w-xs text-xs text-slate-500">
                          {plan.description}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                      {formatMoney(plan.monthlyPrice, plan.currency)}
                      <span className="block text-xs font-normal text-slate-500">
                        per month
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                      {formatMoney(plan.annualPrice, plan.currency)}
                      <span className="block text-xs font-normal text-slate-500">
                        per year
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <p>Users: {formatLimit(plan.maxUsers)}</p>
                      <p className="mt-1">
                        Products: {formatLimit(plan.maxProducts)}
                      </p>
                      <p className="mt-1">
                        Locations: {formatLimit(plan.maxLocations)}
                      </p>
                      <p className="mt-1">
                        Transactions/month:{" "}
                        {formatLimit(plan.maxMonthlyTransactions)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {plan._count?.subscriptions ?? 0}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          plan.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(plan)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusToggle(plan)}
                          disabled={statusUpdating === plan.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                        >
                          {statusUpdating === plan.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : plan.isActive ? (
                            <ToggleRight size={15} />
                          ) : (
                            <ToggleLeft size={15} />
                          )}
                          {plan.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-6"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-editor-title"
            className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h3
                  id="plan-editor-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingPlan ? "Edit subscription plan" : "Create subscription plan"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Configure pricing, limits and included features.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <label className={labelClass}>
                  Plan code *
                  <input
                    required
                    minLength={2}
                    maxLength={40}
                    pattern="[A-Za-z0-9_-]{2,40}"
                    value={form.code}
                    onChange={(event) => updateField("code", event.target.value)}
                    placeholder="STARTER"
                    className={inputClass}
                    autoComplete="off"
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    2–40 letters, numbers, underscores or hyphens.
                  </span>
                </label>

                <label className={labelClass}>
                  Plan name *
                  <input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Starter"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Monthly price *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthlyPrice}
                    onChange={(event) =>
                      updateField("monthlyPrice", Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Annual price *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.annualPrice}
                    onChange={(event) =>
                      updateField("annualPrice", Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Currency *
                  <input
                    required
                    minLength={3}
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    value={form.currency}
                    onChange={(event) =>
                      updateField("currency", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Display order *
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.sortOrder}
                    onChange={(event) =>
                      updateField("sortOrder", Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Description
                  <textarea
                    rows={2}
                    value={form.description ?? ""}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Describe who this plan is suitable for."
                    className={inputClass}
                  />
                </label>

                <div className="sm:col-span-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Usage limits
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Leave a limit blank to mean unlimited. Enter zero to allow
                    zero usage.
                  </p>
                </div>

                <label className={labelClass}>
                  Maximum users
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxUsers ?? ""}
                    onChange={(event) =>
                      handleLimitChange("maxUsers", event.target.value)
                    }
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Maximum products
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxProducts ?? ""}
                    onChange={(event) =>
                      handleLimitChange("maxProducts", event.target.value)
                    }
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Maximum locations
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxLocations ?? ""}
                    onChange={(event) =>
                      handleLimitChange("maxLocations", event.target.value)
                    }
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Maximum monthly transactions
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxMonthlyTransactions ?? ""}
                    onChange={(event) =>
                      handleLimitChange(
                        "maxMonthlyTransactions",
                        event.target.value,
                      )
                    }
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Included features
                  <textarea
                    rows={5}
                    value={featureText}
                    onChange={(event) => setFeatureText(event.target.value)}
                    placeholder={
                      "Inventory management\nReports and analytics\nMultiple staff accounts"
                    }
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Enter one feature per line. Features are saved as a JSON
                    array of strings.
                  </span>
                </label>

                {limitErrors && (
                  <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {limitErrors}
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="sm:col-span-2 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                  >
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving
                    ? "Saving…"
                    : editingPlan
                      ? "Save changes"
                      : "Create plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminBillingPlans;