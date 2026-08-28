import React, { useState } from "react";

import {
  Search,
  Upload,
  Plus,
  Edit3,
  CheckCircle2,
  PackageCheck,
  Filter,
} from "lucide-react";

import {
  Drug,
  PharmacySettings,
} from "../types";

import { exportToExcel } from "../utils/exportExcel";

interface InventoryProps {
  drugs: Drug[];
  settings: PharmacySettings;
  onAddDrug: () => void;
  onEditDrug: (drug: Drug) => void;

  onReceiveStockSubmit: (
    drugId: string,
    qty: number,
    invoiceNo: string,
    buyingPrice?: number,
  ) => Promise<void>;
}

export const Inventory: React.FC<
  InventoryProps
> = ({
  drugs,
  settings,
  onAddDrug,
  onEditDrug,
  onReceiveStockSubmit,
}) => {
  const [
    activeSubTab,
    setActiveSubTab,
  ] = useState<
    "database" | "receive"
  >("database");

  // Search and filters
  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    sortField,
    setSortField,
  ] = useState<keyof Drug | "">("");

  const [
    sortOrder,
    setSortOrder,
  ] = useState<
    "asc" | "desc"
  >("asc");

  // Receive stock
  const [
    receiveSearch,
    setReceiveSearch,
  ] = useState("");

  const [
    selectedDrug,
    setSelectedDrug,
  ] = useState<Drug | null>(
    null,
  );

  const [
    receiveQty,
    setReceiveQty,
  ] = useState("");

  const [
    invoiceNo,
    setInvoiceNo,
  ] = useState("");

  const [
    receiveBuyingPrice,
    setReceiveBuyingPrice,
  ] = useState("");

  const [
    receiveSuccess,
    setReceiveSuccess,
  ] = useState<string | null>(
    null,
  );

  const [
    receiveError,
    setReceiveError,
  ] = useState<string | null>(
    null,
  );

  const [
    isReceiving,
    setIsReceiving,
  ] = useState(false);

  // Filter database
  const filteredDrugs =
    drugs.filter((drug) => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      const matchesSearch =
        !query ||
        drug.name
          .toLowerCase()
          .includes(query) ||
        drug.code
          .toLowerCase()
          .includes(query) ||
        drug.genericName
          .toLowerCase()
          .includes(query) ||
        drug.batchNo
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        categoryFilter === "all" ||
        drug.category ===
          categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        drug.status ===
          statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });

  // Sorting
  const handleSort = (
    field: keyof Drug,
  ) => {
    if (
      sortField === field
    ) {
      setSortOrder(
        (previous) =>
          previous === "asc"
            ? "desc"
            : "asc",
      );
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedDrugs =
    [...filteredDrugs].sort(
      (a, b) => {
        if (!sortField) {
          return 0;
        }

        const aValue =
          a[sortField];

        const bValue =
          b[sortField];

        if (
          aValue === undefined ||
          bValue === undefined
        ) {
          return 0;
        }

        if (
          aValue < bValue
        ) {
          return sortOrder ===
            "asc"
            ? -1
            : 1;
        }

        if (
          aValue > bValue
        ) {
          return sortOrder ===
            "asc"
            ? 1
            : -1;
        }

        return 0;
      },
    );

  // Receive-stock search
  const receiveMatchingDrugs =
    drugs.filter((drug) => {
      const query =
        receiveSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return false;
      }

      return (
        drug.name
          .toLowerCase()
          .includes(query) ||
        drug.code
          .toLowerCase()
          .includes(query) ||
        drug.genericName
          .toLowerCase()
          .includes(query)
      );
    });

  // Excel export
  const handleExportExcel =
    () => {
      const exportData =
        filteredDrugs.map(
          (drug) => ({
            Code: drug.code,
            "Drug Name":
              drug.name,
            "Generic Name":
              drug.genericName,
            Category:
              drug.category,
            Formulation:
              drug.formulation,
            "Batch No":
              drug.batchNo,
            "Expiry Date":
              drug.expiryDate,
            "Qty in Stock":
              drug.qty,
            Unit: drug.unit,
            "Buying Price":
              drug.buyingPrice,
            "Selling Price":
              drug.sellingPrice,
            Status:
              drug.status,
          }),
        );

      exportToExcel(
        exportData,
        `PharmaTrack_Inventory_${new Date()
          .toISOString()
          .slice(0, 10)}`,
        "Inventory",
      );
    };

  // Process stock reception
  const handleProcessReception =
    async (
      e: React.FormEvent,
    ) => {
      e.preventDefault();

      setReceiveError(null);
      setReceiveSuccess(null);

      if (!selectedDrug) {
        setReceiveError(
          "Please select a drug.",
        );
        return;
      }

      const quantity =
        Number(receiveQty);

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity <= 0
      ) {
        setReceiveError(
          "Quantity received must be a positive whole number.",
        );
        return;
      }

      let buyingPrice:
        | number
        | undefined;

      if (
        receiveBuyingPrice.trim()
      ) {
        buyingPrice = Number(
          receiveBuyingPrice,
        );

        if (
          !Number.isFinite(
            buyingPrice,
          ) ||
          buyingPrice < 0
        ) {
          setReceiveError(
            "Please enter a valid buying price.",
          );
          return;
        }
      }

      try {
        setIsReceiving(true);

        await onReceiveStockSubmit(
          selectedDrug.id,
          quantity,
          invoiceNo.trim() ||
            "INV-UNSPECIFIED",
          buyingPrice,
        );

        setReceiveSuccess(
          `Successfully received ${quantity} units of ${selectedDrug.name}.`,
        );

        setSelectedDrug(null);
        setReceiveSearch("");
        setReceiveQty("");
        setInvoiceNo("");
        setReceiveBuyingPrice("");
      } catch (error) {
        console.error(
          "Receive stock:",
          error,
        );

        setReceiveError(
          error instanceof Error
            ? error.message
            : "Failed to receive stock. Please try again.",
        );
      } finally {
        setIsReceiving(false);
      }
    };

  const totalInStock =
    drugs.filter(
      (drug) =>
        drug.qty > 0,
    ).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Management
          </h1>

          <p className="text-sm text-slate-500 font-medium mt-1">
            {drugs.length} drugs
            {" • "}
            {totalInStock} in
            stock
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-drug-database"
            type="button"
            onClick={() =>
              setActiveSubTab(
                "database",
              )
            }
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeSubTab ===
              "database"
                ? "bg-[#0D8065]/10 text-[#0D8065] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Drug Database
          </button>

          <button
            id="tab-receive-stock"
            type="button"
            onClick={() =>
              setActiveSubTab(
                "receive",
              )
            }
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeSubTab ===
              "receive"
                ? "bg-[#0D8065]/10 text-[#0D8065] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Receive Stock
          </button>
        </div>
      </div>

      {/* DATABASE */}
      {activeSubTab ===
        "database" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                id="search-drug-input"
                placeholder="Search drugs by name, code, generic, batch..."
                value={
                  searchQuery
                }
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value,
                  )
                }
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#22577A] focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />

                <select
                  value={
                    categoryFilter
                  }
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value,
                    )
                  }
                  className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                >
                  <option value="all">
                    All Categories
                  </option>
                  <option value="Antibiotics">
                    Antibiotics
                  </option>
                  <option value="Analgesics">
                    Analgesics
                  </option>
                  <option value="Antidiabetics">
                    Antidiabetics
                  </option>
                  <option value="Antihypertensives">
                    Antihypertensives
                  </option>
                  <option value="Antihistamines">
                    Antihistamines
                  </option>
                  <option value="Respiratory">
                    Respiratory
                  </option>
                  <option value="Gastrointestinal">
                    Gastrointestinal
                  </option>
                  <option value="Antimalarials">
                    Antimalarials
                  </option>
                  <option value="Antiretrovirals">
                    Antiretrovirals
                  </option>
                  <option value="Dermatological">
                    Dermatological
                  </option>
                  <option value="Ophthalmic">
                    Ophthalmic
                  </option>
                  <option value="Vitamins & Supplements">
                    Vitamins & Supplements
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value,
                  )
                }
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
              >
                <option value="all">
                  All Statuses
                </option>
                <option value="In Stock">
                  In Stock
                </option>
                <option value="Low Stock">
                  Low Stock
                </option>
                <option value="Expired">
                  Expired
                </option>
                <option value="Out of Stock">
                  Out of Stock
                </option>
              </select>

              <button
                id="btn-export-excel"
                type="button"
                onClick={
                  handleExportExcel
                }
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Export to Excel
              </button>

              <button
                id="btn-add-drug-main"
                type="button"
                onClick={
                  onAddDrug
                }
                className="px-4 py-2 text-xs font-bold text-white bg-[#0d8065] hover:bg-[#0a6d56] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Add Drug
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th
                    onClick={() =>
                      handleSort(
                        "code",
                      )
                    }
                    className="py-2.5 px-2.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Code{" "}
                    <span className="text-slate-400 font-normal">
                      {sortField ===
                      "code"
                        ? sortOrder ===
                          "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th
                    onClick={() =>
                      handleSort(
                        "name",
                      )
                    }
                    className="py-2.5 pl-2.5 pr-1 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Drug Name{" "}
                    <span className="text-slate-400 font-normal">
                      {sortField ===
                      "name"
                        ? sortOrder ===
                          "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th
                    onClick={() =>
                      handleSort(
                        "category",
                      )
                    }
                    className="py-2.5 pl-1 pr-2 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Category{" "}
                    <span className="text-slate-400 font-normal">
                      {sortField ===
                      "category"
                        ? sortOrder ===
                          "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th
                    onClick={() =>
                      handleSort(
                        "expiryDate",
                      )
                    }
                    className="py-2.5 px-2 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Expiry Date{" "}
                    <span className="text-slate-400 font-normal">
                      {sortField ===
                      "expiryDate"
                        ? sortOrder ===
                          "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th
                    onClick={() =>
                      handleSort(
                        "qty",
                      )
                    }
                    className="py-2.5 px-2 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Qty{" "}
                    <span className="text-slate-400 font-normal">
                      {sortField ===
                      "qty"
                        ? sortOrder ===
                          "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th
                    onClick={() =>
                      handleSort(
                        "sellingPrice",
                      )
                    }
                    className="py-2.5 px-2 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Price{" "}
                    <span className="text-slate-400 font-normal">
                      {sortField ===
                      "sellingPrice"
                        ? sortOrder ===
                          "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th
                    onClick={() =>
                      handleSort(
                        "status",
                      )
                    }
                    className="py-2.5 px-2 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Status{" "}
                    <span className="text-slate-400 font-normal">
                      {sortField ===
                      "status"
                        ? sortOrder ===
                          "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th className="py-2.5 px-2 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {sortedDrugs.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-400"
                    >
                      No drugs found matching your search.
                    </td>
                  </tr>
                ) : (
                  sortedDrugs.map(
                    (drug) => {
                      const isExpired =
                        drug.status ===
                        "Expired";

                      return (
                        <tr
                          key={
                            drug.id
                          }
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-2 text-xs font-semibold text-[#22577A] whitespace-nowrap">
                            {drug.code}
                          </td>

                          <td className="py-2.5 pl-2 pr-1 max-w-[170px] min-w-[120px]">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm whitespace-normal leading-snug break-words">
                              {
                                drug.name
                              }
                            </div>

                            <div className="text-[11px] text-slate-400 font-normal whitespace-normal leading-tight break-words">
                              {
                                drug.genericName
                              }
                            </div>
                          </td>

                          <td className="py-2.5 pl-1 pr-2 text-xs text-slate-600 whitespace-nowrap">
                            {
                              drug.category
                            }
                          </td>

                          <td className="py-2.5 px-2 text-xs font-semibold whitespace-nowrap">
                            {isExpired ? (
                              <span
                                className="px-1.5 py-0.5 rounded-md text-white text-[11px] inline-block font-semibold"
                                style={{
                                  backgroundColor:
                                    "#D71D2D",
                                }}
                              >
                                {
                                  drug.expiryDate
                                }
                              </span>
                            ) : (
                              <span className="text-slate-600 font-medium">
                                {
                                  drug.expiryDate
                                }
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <span className="font-semibold text-xs sm:text-sm">
                              {
                                drug.qty
                              }
                            </span>

                            <span className="text-xs text-slate-400 ml-1">
                              {
                                drug.unit
                              }
                            </span>
                          </td>

                          <td className="py-2.5 px-2 font-semibold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                            {settings.currency}{" "}
                            {Number(
                              drug.sellingPrice,
                            ).toFixed(
                              2,
                            )}
                          </td>

                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {drug.status ===
                              "Expired" && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                style={{
                                  backgroundColor:
                                    "#D71D2D",
                                }}
                              >
                                Expired
                              </span>
                            )}

                            {drug.status ===
                              "In Stock" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                In Stock
                              </span>
                            )}

                            {drug.status ===
                              "Low Stock" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                                Low Stock
                              </span>
                            )}

                            {drug.status ===
                              "Out of Stock" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                Out of Stock
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <button
                              id={`btn-edit-drug-${drug.id}`}
                              type="button"
                              onClick={() =>
                                onEditDrug(
                                  drug,
                                )
                              }
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-white bg-slate-100 hover:bg-[#22577A] cursor-pointer rounded-lg transition-colors flex items-center gap-1 inline-flex"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECEIVE STOCK */}
      {activeSubTab ===
        "receive" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Receive New Stock
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Log incoming inventory batches. Search existing drugs or add a new drug definition.
            </p>

            <p className="text-[11px] text-slate-500 font-normal mt-1">
              Fields marked with{" "}
              <span className="text-red-500 font-bold">
                *
              </span>{" "}
              are required
            </p>
          </div>

          {receiveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />

              <span>
                {
                  receiveSuccess
                }
              </span>
            </div>
          )}

          {receiveError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium rounded-xl">
              {receiveError}
            </div>
          )}

          <form
            onSubmit={
              handleProcessReception
            }
            className="space-y-5"
          >
            {/* Drug selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Drug{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search drug by name or code..."
                  value={
                    selectedDrug
                      ? selectedDrug.name
                      : receiveSearch
                  }
                  disabled={
                    isReceiving
                  }
                  onChange={(e) => {
                    setSelectedDrug(
                      null,
                    );

                    setReceiveSearch(
                      e.target
                        .value,
                    );

                    setReceiveError(
                      null,
                    );
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                />

                {!selectedDrug &&
                  receiveSearch.trim()
                    .length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {receiveMatchingDrugs.length ===
                      0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          No drugs found. Use{" "}
                          <button
                            type="button"
                            onClick={
                              onAddDrug
                            }
                            className="text-[#22577A] font-bold underline"
                          >
                            Add Drug
                          </button>{" "}
                          for a new item.
                        </div>
                      ) : (
                        receiveMatchingDrugs.map(
                          (
                            drug,
                          ) => (
                            <button
                              key={
                                drug.id
                              }
                              type="button"
                              onClick={() => {
                                setSelectedDrug(
                                  drug,
                                );

                                setReceiveSearch(
                                  "",
                                );

                                setReceiveError(
                                  null,
                                );
                              }}
                              className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between text-sm"
                            >
                              <div>
                                <span className="font-bold text-slate-900">
                                  {
                                    drug.name
                                  }
                                </span>

                                <span className="text-xs text-slate-400 ml-2">
                                  (
                                  {
                                    drug.category
                                  }
                                  )
                                </span>
                              </div>

                              <div className="text-xs font-semibold text-[#22577A]">
                                {
                                  drug.code
                                }{" "}
                                • Stock:{" "}
                                {
                                  drug.qty
                                }
                              </div>
                            </button>
                          ),
                        )
                      )}
                    </div>
                  )}
              </div>

              {selectedDrug && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">
                    Selected:{" "}
                    <strong>
                      {
                        selectedDrug.name
                      }
                    </strong>{" "}
                    (
                    {
                      selectedDrug.code
                    }
                    ) - Current Stock:{" "}
                    {
                      selectedDrug.qty
                    }
                  </span>

                  <button
                    type="button"
                    disabled={
                      isReceiving
                    }
                    onClick={() =>
                      setSelectedDrug(
                        null,
                      )
                    }
                    className="text-slate-400 hover:text-slate-600 underline disabled:opacity-50"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Quantity and invoice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Received{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  disabled={
                    isReceiving
                  }
                  placeholder="e.g. 100"
                  value={
                    receiveQty
                  }
                  onChange={(e) =>
                    setReceiveQty(
                      e.target
                        .value,
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice / LPO Number
                </label>

                <input
                  type="text"
                  disabled={
                    isReceiving
                  }
                  placeholder="e.g. INV-2026-001"
                  value={
                    invoiceNo
                  }
                  onChange={(e) =>
                    setInvoiceNo(
                      e.target
                        .value,
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Buying price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Buying Price (KES,
                optional)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                disabled={
                  isReceiving
                }
                placeholder="Leave blank to keep existing"
                value={
                  receiveBuyingPrice
                }
                onChange={(e) =>
                  setReceiveBuyingPrice(
                    e.target
                      .value,
                  )
                }
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                id="btn-process-reception"
                disabled={
                  isReceiving
                }
                className="w-full py-3 px-6 text-sm font-bold text-white bg-[#0d8065] hover:bg-[#0a6d56] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <PackageCheck className="w-5 h-5" />

                {isReceiving
                  ? "Processing..."
                  : "Process Reception"}
              </button>
            </div>
          </form>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
            <strong>
              Note:
            </strong>{" "}
            The search drug by name displays as you type from the current drug database. For a new drug, use the{" "}
            <button
              type="button"
              onClick={
                onAddDrug
              }
              className="text-[#22577A] font-bold underline"
            >
              Add Drug
            </button>{" "}
            button.
          </div>
        </div>
      )}
    </div>
  );
};