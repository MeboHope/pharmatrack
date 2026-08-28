
import React, { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";

import type {
  Drug,
  PharmacySettings,
  StockAdjustment,
} from "../types";

import {
  stockAdjustmentsService,
} from "../services/stockAdjustments";

interface StockAdjustmentsProps {
  drugs: Drug[];
  adjustments?: StockAdjustment[];
  settings: PharmacySettings;
  onAddAdjustment?: (
    adjustment: StockAdjustment,
  ) => void;
}

export const StockAdjustments: React.FC<
  StockAdjustmentsProps
> = ({
  drugs = [],
  adjustments = [],
  settings,
  onAddAdjustment,
}) => {
  const [items, setItems] =
    useState<StockAdjustment[]>(adjustments);

  const [showModal, setShowModal] =
    useState(false);

  const [selectedDrugId, setSelectedDrugId] =
    useState("");

  const [adjustedQty, setAdjustedQty] =
    useState(0);

  const [adjType, setAdjType] =
    useState<StockAdjustment["type"]>(
      "Expiry Removal",
    );

  const [reason, setReason] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");

  const selectedDrug = drugs.find(
    (drug) => drug.id === selectedDrugId,
  );

  const loadAdjustments = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data =
        await stockAdjustmentsService.list();

      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load stock adjustments.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdjustments();
  }, []);

  const resetForm = () => {
    setSelectedDrugId("");
    setAdjustedQty(0);
    setAdjType("Expiry Removal");
    setReason("");
  };

  const closeModal = () => {
    if (isSaving) return;

    setShowModal(false);
    resetForm();
  };

  const handleDrugChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const drugId = event.target.value;

    setSelectedDrugId(drugId);

    const drug = drugs.find(
      (item) => item.id === drugId,
    );

    if (drug) {
      setAdjustedQty(drug.qty);
    } else {
      setAdjustedQty(0);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedDrug) {
      setError("Please select a drug.");
      return;
    }

    if (adjustedQty < 0) {
      setError(
        "Adjusted quantity cannot be negative.",
      );
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const created =
        await stockAdjustmentsService.create({
          drugId: selectedDrug.id,
          adjustedQty,
          type: adjType,
          reason: reason.trim(),
        });

      setItems((previous) => [
        created,
        ...previous,
      ]);

      onAddAdjustment?.(created);

      closeModal();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the stock adjustment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Stock Adjustments & Audit Logs
          </h1>

          <p className="text-sm text-slate-500 font-medium mt-1">
            Reconcile inventory, record damaged stock,
            or quarantine expired batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAdjustments()}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm flex items-center gap-1.5"
            style={{
              backgroundColor: "#0d8065",
            }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />

            Record Adjustment
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />

          <div>
            <strong>Operation failed</strong>

            <p className="mt-0.5">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        {isLoading && items.length === 0 ? (
          <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />

            Loading adjustment records...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No stock adjustments have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3.5 whitespace-nowrap">
                    Log ID
                  </th>

                  <th className="py-3 px-3.5 whitespace-nowrap">
                    Date & Time
                  </th>

                  <th className="py-3 px-3.5 whitespace-nowrap">
                    Drug Item
                  </th>

                  <th className="py-3 px-3.5 whitespace-nowrap">
                    Batch No
                  </th>

                  <th className="py-3 px-3.5 whitespace-nowrap">
                    Prev Qty → New Qty
                  </th>

                  <th className="py-3 px-3.5 whitespace-nowrap">
                    Adjustment Type
                  </th>

                  <th className="py-3 px-3.5">
                    Reason Note
                  </th>

                  <th className="py-3 px-3.5 whitespace-nowrap">
                    Adjusted By
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {items.map((adjustment) => (
                  <tr
                    key={adjustment.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-[#22577A] text-xs whitespace-nowrap">
                      {adjustment.id}
                    </td>

                    <td className="py-3 px-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {adjustment.date}
                    </td>

                    <td className="py-3 px-3.5 font-bold text-slate-900 text-xs whitespace-nowrap">
                      {adjustment.drugName}
                    </td>

                    <td className="py-3 px-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {adjustment.batchNo}
                    </td>

                    <td className="py-3 px-3.5 text-xs font-bold whitespace-nowrap">
                      <span className="text-slate-400">
                        {adjustment.previousQty}
                      </span>

                      <span className="mx-1.5 text-slate-400">
                        →
                      </span>

                      <span className="text-emerald-700">
                        {adjustment.adjustedQty}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {adjustment.type}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-xs text-slate-600 max-w-xs truncate">
                      {adjustment.reason}
                    </td>

                    <td className="py-3 px-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {adjustment.adjustedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Record Stock Adjustment
                </h2>

                <p className="text-[11px] text-slate-500 mt-0.5">
                  Changes are saved to the server database.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Select Drug Item{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <select
                  required
                  value={selectedDrugId}
                  onChange={handleDrugChange}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                >
                  <option value="">
                    Select drug to adjust...
                  </option>

                  {drugs.map((drug) => (
                    <option
                      key={drug.id}
                      value={drug.id}
                    >
                      {drug.name} ({drug.code}) -
                      Current Stock: {drug.qty}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDrug && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                  <div>
                    <strong>Batch:</strong>{" "}
                    {selectedDrug.batchNo}
                  </div>

                  <div>
                    <strong>Current Stock:</strong>{" "}
                    {selectedDrug.qty}{" "}
                    {selectedDrug.unit}
                  </div>

                  <div>
                    <strong>Adjusted By:</strong>{" "}
                    {settings.clinicianName ||
                      "Pharmacist"}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">
                  New Adjusted Qty{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  required
                  value={adjustedQty}
                  onChange={(event) =>
                    setAdjustedQty(
                      Number(event.target.value),
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold focus:border-[#22577A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Adjustment Type{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <select
                  value={adjType}
                  onChange={(event) =>
                    setAdjType(
                      event.target.value as StockAdjustment["type"],
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                >
                  <option value="Expiry Removal">
                    Expiry Removal
                  </option>

                  <option value="Loss / Damage">
                    Loss / Damage
                  </option>

                  <option value="Audit Reconciliation">
                    Audit Reconciliation
                  </option>

                  <option value="Return to Supplier">
                    Return to Supplier
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Reason / Notes{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <textarea
                  rows={3}
                  required
                  placeholder="Explain why stock count was adjusted..."
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    backgroundColor: "#0d8065",
                  }}
                >
                  {isSaving && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}

                  {isSaving
                    ? "Saving..."
                    : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAdjustments;
