import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Package,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import type {
  Drug,
  PharmacySettings,
  StockAdjustment,
} from "../types";

import {
  stockAdjustmentsService,
  type CreateStockAdjustmentInput,
} from "../services/stockAdjustments";

interface StockAdjustmentBatch {
  id: string;
  batchNo: string;
  expiryDate: string;
  qty: number;
  buyingPrice?: number;
  sellingPrice?: number;
  status?: string;
}

interface StockAdjustmentProduct {
  id: string;
  code: string;
  name: string;
  genericName?: string;
  unit?: string;
  category?: string;
  formulation?: string;
  status?: string;

  // InventoryProduct makes batches optional.
  // Keep it optional here so the existing Inventory architecture
  // can be passed directly into this component.
  batches?: StockAdjustmentBatch[];
}

interface StockAdjustmentsProps {
  products?: StockAdjustmentProduct[];
  drugs?: Drug[];
  adjustments?: StockAdjustment[];
  settings: PharmacySettings;
  readOnly?: boolean;
  onAddAdjustment?: (
    adjustment: StockAdjustment,
  ) => void;
}

type AdjustmentType =
  | "Loss / Damage"
  | "Expiry Removal"
  | "Audit Reconciliation"
  | "Return to Supplier";

interface FormState {
  productId: string;
  batchId: string;
  type: AdjustmentType;
  direction: "DECREASE" | "INCREASE";
  quantity: string;
  reason: string;
  notes: string;
  referenceType: string;
  referenceId: string;
}

const emptyForm: FormState = {
  productId: "",
  batchId: "",
  type: "Loss / Damage",
  direction: "DECREASE",
  quantity: "",
  reason: "",
  notes: "",
  referenceType: "",
  referenceId: "",
};

const adjustmentTypes: AdjustmentType[] = [
  "Loss / Damage",
  "Expiry Removal",
  "Audit Reconciliation",
  "Return to Supplier",
];

const getTypeDescription = (
  type: AdjustmentType,
): string => {
  switch (type) {
    case "Loss / Damage":
      return "Remove stock that has been damaged, lost or otherwise become unusable.";

    case "Expiry Removal":
      return "Remove stock that has reached or passed its expiry date.";

    case "Audit Reconciliation":
      return "Correct a physical stock-count difference discovered during reconciliation.";

    case "Return to Supplier":
      return "Remove stock that is being returned to the supplier.";

    default:
      return "";
  }
};

const formatNumber = (
  value: number,
): string => {
  return new Intl.NumberFormat(
    "en-GB",
  ).format(value);
};

const formatDate = (
  value: string,
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

const formatDateTime = (
  value: string,
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
};

const getTypeBadgeClasses = (
  type: AdjustmentType,
): string => {
  switch (type) {
    case "Loss / Damage":
      return "bg-rose-50 text-rose-700 border-rose-200";

    case "Expiry Removal":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Audit Reconciliation":
      return "bg-sky-50 text-sky-700 border-sky-200";

    case "Return to Supplier":
      return "bg-violet-50 text-violet-700 border-violet-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export function StockAdjustments({
  products = [],
  drugs: _drugs = [],
  adjustments = [],
  settings: _settings,
  readOnly = false,
  onAddAdjustment,
}: StockAdjustmentsProps) {
  const [items, setItems] =
    useState<StockAdjustment[]>(
      adjustments,
    );

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [form, setForm] =
    useState<FormState>(
      emptyForm,
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    setItems(adjustments);
  }, [adjustments]);

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            product.id ===
            form.productId,
        ) ?? null,
      [products, form.productId],
    );

  const selectedBatch =
    useMemo(
      () =>
        selectedProduct?.batches?.find(
          (batch) =>
            batch.id ===
            form.batchId,
        ) ?? null,
      [
        selectedProduct,
        form.batchId,
      ],
    );

  const availableBatches =
    selectedProduct?.batches ?? [];

  const quantityValue =
    Number(form.quantity);

  const validQuantity =
    Number.isInteger(
      quantityValue,
    ) &&
    quantityValue > 0;

  const quantityDelta =
    validQuantity
      ? form.direction ===
        "DECREASE"
        ? -quantityValue
        : quantityValue
      : 0;

  const resultingQuantity =
    selectedBatch
      ? selectedBatch.qty +
        quantityDelta
      : null;

  const canIncrease =
    form.type ===
    "Audit Reconciliation";

  const isInsufficientStock =
    selectedBatch !== null &&
    form.direction ===
      "DECREASE" &&
    validQuantity &&
    quantityValue >
      selectedBatch.qty;

  const hasNegativeResult =
    resultingQuantity !== null &&
    resultingQuantity < 0;

  const sortedItems =
    useMemo(
      () =>
        [...items].sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime(),
        ),
      [items],
    );

  const updateForm = <
    K extends keyof FormState,
  >(
    field: K,
    value: FormState[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setSuccess("");
  };

  const handleOpenModal = () => {
    if (readOnly) {
      return;
    }

    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleProductChange = (
    productId: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      productId,
      batchId: "",
    }));
  };

  const handleTypeChange = (
    type: AdjustmentType,
  ) => {
    setForm((previous) => ({
      ...previous,
      type,
      direction:
        type ===
        "Audit Reconciliation"
          ? previous.direction
          : "DECREASE",
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (readOnly) {
      setError(
        "You have read-only access to stock adjustment history.",
      );
      return;
    }

    if (!form.productId) {
      setError(
        "Please select a product.",
      );
      return;
    }

    if (!form.batchId) {
      setError(
        "Please select a batch.",
      );
      return;
    }

    if (!selectedProduct) {
      setError(
        "The selected product could not be found.",
      );
      return;
    }

    if (!selectedBatch) {
      setError(
        "The selected batch could not be found.",
      );
      return;
    }

    if (!validQuantity) {
      setError(
        "Quantity must be a positive whole number.",
      );
      return;
    }

    if (
      !form.reason.trim()
    ) {
      setError(
        "Please provide a reason for the adjustment.",
      );
      return;
    }

    if (
      isInsufficientStock ||
      hasNegativeResult
    ) {
      setError(
        "The adjustment would reduce the batch below zero. Please enter a smaller quantity.",
      );
      return;
    }

    if (
      form.direction ===
        "INCREASE" &&
      !canIncrease
    ) {
      setError(
        "Only Audit Reconciliation adjustments can increase stock.",
      );
      return;
    }

    setSaving(true);

    try {
      const input: CreateStockAdjustmentInput =
        {
          productId:
            form.productId,
          batchId:
            form.batchId,
          quantityDelta,
          type:
            form.type,
          reason:
            form.reason.trim(),
          notes:
            form.notes.trim() ||
            undefined,
          referenceType:
            form.referenceType.trim() ||
            undefined,
          referenceId:
            form.referenceId.trim() ||
            undefined,
        };

      const created =
        await stockAdjustmentsService.create(
          input,
        );

      setItems(
        (previous) => [
          created,
          ...previous.filter(
            (item) =>
              item.id !==
              created.id,
          ),
        ],
      );

      if (onAddAdjustment) {
        onAddAdjustment(
          created,
        );
      }

      setSuccess(
        "Stock adjustment recorded successfully.",
      );

      setForm(emptyForm);

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess("");
      }, 900);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to record stock adjustment.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Boxes
                  size={21}
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Stock Adjustments
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Correct batch-level stock quantities with a complete audit trail.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 sm:block">
              Server-controlled records
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={
                  handleOpenModal
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus
                  size={17}
                />
                Record Adjustment
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Boxes
                  size={19}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Adjustments
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatNumber(
                    items.length,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <ArrowDown
                  size={19}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Stock Decreases
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatNumber(
                    items.filter(
                      (item) =>
                        (item.quantityDelta ??
                          item.adjustedQty -
                            item.previousQty) <
                        0,
                    ).length,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <ArrowUp
                  size={19}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reconciliations
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatNumber(
                    items.filter(
                      (item) =>
                        item.type ===
                        "Audit Reconciliation",
                    ).length,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Adjustment History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Every record reflects a server-side batch quantity change.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <RefreshCw
                size={13}
              />
              Stock Ledger
            </div>
          </div>

          {sortedItems.length ===
          0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package
                  size={25}
                />
              </div>

              <h3 className="font-semibold text-slate-800">
                No stock adjustments yet
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Batch-level stock corrections will appear here once an adjustment is recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Log ID
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Product
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Batch
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Previous → New
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Change
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Type
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Reason
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Adjusted By
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedItems.map(
                    (item) => {
                      const delta =
                        item.quantityDelta ??
                        item.adjustedQty -
                          item.previousQty;

                      return (
                        <tr
                          key={
                            item.id
                          }
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-semibold text-slate-500">
                              {item.id}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDateTime(
                              item.date,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800">
                              {item.productName ||
                                item.drugName ||
                                "Unknown Product"}
                            </div>

                            {item.productId && (
                              <div className="mt-1 font-mono text-xs text-slate-400">
                                {item.productId}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                              {item.batchNo ||
                                "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-800">
                              {formatNumber(
                                item.previousQty,
                              )}
                              {" → "}
                              {formatNumber(
                                item.adjustedQty,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                                delta <
                                0
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {delta <
                              0 ? (
                                <ArrowDown
                                  size={
                                    13
                                  }
                                />
                              ) : (
                                <ArrowUp
                                  size={
                                    13
                                  }
                                />
                              )}

                              {delta >
                              0
                                ? "+"
                                : ""}
                              {formatNumber(
                                delta,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold ${getTypeBadgeClasses(
                                item.type,
                              )}`}
                            >
                              {
                                item.type
                              }
                            </span>
                          </td>

                          <td className="max-w-xs px-5 py-4">
                            <div className="truncate text-sm font-medium text-slate-700">
                              {
                                item.reason
                              }
                            </div>

                            {item.notes && (
                              <div className="mt-1 truncate text-xs text-slate-400">
                                {
                                  item.notes
                                }
                              </div>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-600">
                            {
                              item.adjustedBy
                            }
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Boxes
                      size={19}
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Record Stock Adjustment
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Adjust one physical inventory batch without directly overwriting stock.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  handleCloseModal
                }
                disabled={
                  saving
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >
              {error && (
                <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {error}
                  </span>
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {success}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Product
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <select
                  required
                  value={
                    form.productId
                  }
                  onChange={(
                    event,
                  ) =>
                    handleProductChange(
                      event
                        .target
                        .value,
                    )
                  }
                  disabled={
                    saving
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="">
                    Select a product
                  </option>

                  {products.map(
                    (product) => (
                      <option
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                      >
                        {product.name}
                        {product.code
                          ? ` (${product.code})`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Batch
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <select
                  required
                  value={
                    form.batchId
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "batchId",
                      event
                        .target
                        .value,
                    )
                  }
                  disabled={
                    saving ||
                    !selectedProduct
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="">
                    {!selectedProduct
                      ? "Select a product first"
                      : availableBatches.length ===
                          0
                        ? "No batches available"
                        : "Select a batch"}
                  </option>

                  {availableBatches.map(
                    (batch) => (
                      <option
                        key={
                          batch.id
                        }
                        value={
                          batch.id
                        }
                      >
                        {batch.batchNo}
                        {" — Qty: "}
                        {formatNumber(
                          batch.qty,
                        )}
                        {" — Exp: "}
                        {formatDate(
                          batch.expiryDate,
                        )}
                      </option>
                    ),
                  )}
                </select>

                {selectedBatch && (
                  <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    Current batch quantity:{" "}
                    <strong className="text-slate-900">
                      {formatNumber(
                        selectedBatch.qty,
                      )}
                    </strong>
                    {selectedProduct?.unit && (
                      <>
                        {" "}
                        {
                          selectedProduct.unit
                        }
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Adjustment Type
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <select
                  required
                  value={
                    form.type
                  }
                  onChange={(
                    event,
                  ) =>
                    handleTypeChange(
                      event
                        .target
                        .value as AdjustmentType,
                    )
                  }
                  disabled={
                    saving
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                >
                  {adjustmentTypes.map(
                    (type) => (
                      <option
                        key={
                          type
                        }
                        value={
                          type
                        }
                      >
                        {
                          type
                        }
                      </option>
                    ),
                  )}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {getTypeDescription(
                    form.type,
                  )}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Direction
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateForm(
                        "direction",
                        "DECREASE",
                      )
                    }
                    disabled={
                      saving
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      form.direction ===
                      "DECREASE"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <ArrowDown
                      size={17}
                    />
                    Decrease Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        canIncrease
                      ) {
                        updateForm(
                          "direction",
                          "INCREASE",
                        );
                      }
                    }}
                    disabled={
                      saving ||
                      !canIncrease
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      form.direction ===
                      "INCREASE"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : canIncrease
                          ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    }`}
                  >
                    <ArrowUp
                      size={17}
                    />
                    Increase Stock
                  </button>
                </div>

                {!canIncrease && (
                  <p className="mt-2 text-xs text-slate-400">
                    Stock increases are restricted to Audit Reconciliation.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Quantity
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={
                    form.quantity
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "quantity",
                      event
                        .target
                        .value,
                    )
                  }
                  disabled={
                    saving
                  }
                  placeholder="e.g. 20"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                />
              </div>

              {selectedBatch &&
                validQuantity && (
                  <div
                    className={`rounded-xl border px-4 py-4 ${
                      isInsufficientStock ||
                      hasNegativeResult
                        ? "border-rose-200 bg-rose-50"
                        : "border-sky-200 bg-sky-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-slate-700">
                        Resulting batch quantity
                      </span>

                      <span
                        className={`text-lg font-bold ${
                          isInsufficientStock ||
                          hasNegativeResult
                            ? "text-rose-700"
                            : "text-slate-900"
                        }`}
                      >
                        {formatNumber(
                          resultingQuantity ??
                            0,
                        )}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      Current{" "}
                      {formatNumber(
                        selectedBatch.qty,
                      )}
                      {" "}
                      {selectedProduct?.unit ||
                        "units"}
                      {" + "}
                      {quantityDelta >
                      0
                        ? "+"
                        : ""}
                      {formatNumber(
                        quantityDelta,
                      )}
                    </div>

                    {(isInsufficientStock ||
                      hasNegativeResult) && (
                      <p className="mt-2 text-xs font-semibold text-rose-700">
                        The resulting quantity cannot be negative.
                      </p>
                    )}
                  </div>
                )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  required
                  maxLength={
                    500
                  }
                  value={
                    form.reason
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "reason",
                      event
                        .target
                        .value,
                    )
                  }
                  disabled={
                    saving
                  }
                  placeholder="e.g. 20 tablets damaged during handling"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea
                  rows={3}
                  maxLength={
                    2000
                  }
                  value={
                    form.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "notes",
                      event
                        .target
                        .value,
                    )
                  }
                  disabled={
                    saving
                  }
                  placeholder="Additional details about the adjustment..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reference Type
                  </label>

                  <input
                    type="text"
                    maxLength={
                      100
                    }
                    value={
                      form.referenceType
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "referenceType",
                        event
                          .target
                          .value,
                      )
                    }
                    disabled={
                      saving
                    }
                    placeholder="e.g. STOCKTAKE"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reference ID
                  </label>

                  <input
                    type="text"
                    maxLength={
                      200
                    }
                    value={
                      form.referenceId
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "referenceId",
                        event
                          .target
                          .value,
                      )
                    }
                    disabled={
                      saving
                    }
                    placeholder="e.g. ST-2026-001"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex gap-3">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <p className="text-xs leading-5 text-amber-800">
                    This action changes the selected batch quantity and creates an immutable stock movement and audit record. Please verify the product, batch and quantity before saving.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    handleCloseModal
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !selectedProduct ||
                    !selectedBatch ||
                    !validQuantity ||
                    isInsufficientStock ||
                    hasNegativeResult
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={16}
                      />
                      Record Adjustment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default StockAdjustments;