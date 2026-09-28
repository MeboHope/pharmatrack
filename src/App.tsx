import React, {
  useEffect,
  useState,
} from "react";

import {
  useRoutes,
} from "react-router-dom";

import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import {
  Inventory,
  type InventoryProduct,
  type ReceiveStockInput,
} from "./components/Inventory";
import { AuthModal } from "./components/AuthModal";
import { LandingScreen } from "./components/LandingScreen";
import { LogoutModal } from "./components/LogoutModal";
import { Dispensing } from "./components/Dispensing";
import { Suppliers } from "./components/Suppliers";
import { Patients } from "./components/Patients";
import { Reports } from "./components/Reports";
import { StockAdjustments } from "./components/StockAdjustments";
import { Settings } from "./components/Settings";
import { UserManagement } from "./components/UserManagement";
import AuditLogs from "./components/AuditLogs";
import FeatureDetails from "./components/FeatureDetails";
import { PharmaTrackLogo } from "./components/PharmaTrackLogo";

import type {
  DispenseTransaction,
  Drug,
  PatientRecord,
  PharmacySettings,
  StockAdjustment,
  Supplier,
  TabType,
  UserAccount,
} from "./types";

import {
  initialDrugs,
  initialTransactions,
  initialPatients,
  initialSuppliers,
  initialAdjustments,
  initialSettings,
} from "./data/mockData";

import { useAuth } from "./hooks/useAuth";

import {
  api,
  type ApiResponse,
} from "./services/api";

interface ProductFormState {
  code: string;
  name: string;
  genericName: string;
  category: string;
  formulation: string;
  unit: string;
  notes: string;
  status: "ACTIVE" | "INACTIVE";
}

interface ProductModalProps {
  isOpen: boolean;
  editingProduct: InventoryProduct | null;
  onClose: () => void;
  onSave: (
    product: ProductFormState,
    editingProduct: InventoryProduct | null,
  ) => Promise<void>;
  isSaving: boolean;
  error: string;
}

const emptyProductForm: ProductFormState = {
  code: "",
  name: "",
  genericName: "",
  category: "",
  formulation: "",
  unit: "Tablets",
  notes: "",
  status: "ACTIVE",
};

function ProductModal({
  isOpen,
  editingProduct,
  onClose,
  onSave,
  isSaving,
  error,
}: ProductModalProps) {
  const [form, setForm] =
    useState<ProductFormState>(
      emptyProductForm,
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingProduct) {
      setForm({
        code: editingProduct.code ?? "",
        name: editingProduct.name ?? "",
        genericName:
          editingProduct.genericName ?? "",
        category:
          editingProduct.category ?? "",
        formulation:
          editingProduct.formulation ?? "",
        unit:
          editingProduct.unit ||
          "Tablets",
        notes:
          editingProduct.notes ?? "",
        status:
          editingProduct.status ===
          "INACTIVE"
            ? "INACTIVE"
            : "ACTIVE",
      });
    } else {
      setForm(emptyProductForm);
    }
  }, [
    isOpen,
    editingProduct,
  ]);

  if (!isOpen) {
    return null;
  }

  const updateField = <
    K extends keyof ProductFormState,
  >(
    field: K,
    value: ProductFormState[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    await onSave(
      {
        code:
          form.code.trim(),
        name:
          form.name.trim(),
        genericName:
          form.genericName.trim(),
        category:
          form.category.trim(),
        formulation:
          form.formulation.trim(),
        unit:
          form.unit.trim() ||
          "Tablets",
        notes:
          form.notes.trim(),
        status:
          form.status,
      },
      editingProduct,
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {editingProduct
                  ? "Edit Product"
                  : "Add Product"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingProduct
                  ? "Update product master information. Stock and batches are managed separately."
                  : "Create the medicine/product master record before receiving physical stock."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Product Code
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                required
                value={form.code}
                onChange={(event) =>
                  updateField(
                    "code",
                    event.target.value.toUpperCase(),
                  )
                }
                placeholder="e.g. PCM500"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-400"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Must be unique within this organization.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Product Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                required
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="e.g. Paracetamol 500mg"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Generic Name
              </label>

              <input
                type="text"
                value={form.genericName}
                onChange={(event) =>
                  updateField(
                    "genericName",
                    event.target.value,
                  )
                }
                placeholder="e.g. Paracetamol"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Category
              </label>

              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value,
                  )
                }
                placeholder="e.g. Analgesics"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Formulation
              </label>

              <input
                type="text"
                value={form.formulation}
                onChange={(event) =>
                  updateField(
                    "formulation",
                    event.target.value,
                  )
                }
                placeholder="e.g. Tablet"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Stock Unit
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                required
                value={form.unit}
                onChange={(event) =>
                  updateField(
                    "unit",
                    event.target.value,
                  )
                }
                placeholder="e.g. Tablets"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            {editingProduct && (
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Product Status
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value as
                        | "ACTIVE"
                        | "INACTIVE",
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>

                <p className="mt-1.5 text-xs text-slate-400">
                  Inactive products cannot receive new stock.
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Notes
              </label>

              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value,
                  )
                }
                placeholder="Optional product notes..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-xs leading-5 text-sky-800">
              <strong>
                Inventory principle:
              </strong>{" "}
              creating or editing a product does not change its
              stock quantity. Physical stock is controlled through
              batch receipts and stock movements.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : editingProduct
                  ? "Save Product"
                  : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const unwrap = <T,>(
  response: ApiResponse<T>,
): T | undefined => {
  return response.data;
};

export default function App() {
  const publicRoute = useRoutes([
    {
      path: "/features/:feature",
      element: <FeatureDetails />,
    },
  ]);

  const [
    activeTab,
    setActiveTab,
  ] = useState<TabType>("dashboard");

  const {
    currentUser,
    organizations,
    currentOrganization,
    isLoading: authLoading,
    logout,
    syncAuthenticatedUser,
    switchOrganization,
  } = useAuth();

  const [
    isAuthModalOpen,
    setIsAuthModalOpen,
  ] = useState(false);

  const [
    authModalInitialMode,
    setAuthModalInitialMode,
  ] = useState<
    "login" | "signup" | "forgot"
  >("login");

  const [
    isLogoutModalOpen,
    setIsLogoutModalOpen,
  ] = useState(false);

  const [
    settings,
    setSettings,
  ] = useState<PharmacySettings>(
    initialSettings,
  );

  /*
   * Legacy Drug state is intentionally retained.
   *
   * Dashboard and Reports still consume the legacy
   * Drug structure while the new inventory architecture
   * is being migrated module-by-module.
   */
  const [
    drugs,
    setDrugs,
  ] = useState<Drug[]>(
    initialDrugs,
  );

  /*
   * Authoritative inventory state.
   *
   * Product -> DrugBatch is now the source of truth
   * for Inventory, Stock Adjustments and Dispensing.
   */
  const [
    products,
    setProducts,
  ] = useState<InventoryProduct[]>(
    [],
  );

  const [
    transactions,
    setTransactions,
  ] = useState<DispenseTransaction[]>(
    initialTransactions,
  );

  const [
    patients,
    setPatients,
  ] = useState<PatientRecord[]>(
    initialPatients,
  );

  const [
    suppliers,
    setSuppliers,
  ] = useState<Supplier[]>(
    initialSuppliers,
  );

  const [
    adjustments,
    setAdjustments,
  ] = useState<StockAdjustment[]>(
    initialAdjustments,
  );

  const [
    dataLoading,
    setDataLoading,
  ] = useState(false);

  const [
    dataError,
    setDataError,
  ] = useState("");

  const [
    isProductModalOpen,
    setIsProductModalOpen,
  ] = useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] = useState<InventoryProduct | null>(
    null,
  );

  const [
    productSaving,
    setProductSaving,
  ] = useState(false);

  const [
    productModalError,
    setProductModalError,
  ] = useState("");

  const isSuperAdmin =
    currentUser?.role ===
    "Super Admin";

  const isAdmin =
    currentUser?.role ===
    "Admin";

  const currentOrganizationId =
    currentUser?.organizationId ??
    null;

  const canViewInventory =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Pharmacist" ||
    currentUser?.role === "Clinician";

  const canViewStockAdjustments =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Pharmacist" ||
    currentUser?.role === "Clinician";

  const isPharmacyStaff =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Pharmacist";

  const clearTenantData = () => {
    setDrugs([]);
    setProducts([]);
    setPatients([]);
    setTransactions([]);
    setSuppliers([]);
    setAdjustments([]);
    setSettings(initialSettings);
    setDataError("");
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductModalError("");
  };

  useEffect(() => {
    if (!currentUser) {
      clearTenantData();
      setDataLoading(false);
      return;
    }

    if (isSuperAdmin) {
      clearTenantData();
      setDataLoading(false);
      setDataError("");
      return;
    }

    if (!currentOrganizationId) {
      clearTenantData();
      setDataLoading(false);
      setDataError(
        "No organization context is available for your account. Please sign in again or contact an administrator.",
      );

      return;
    }

    let cancelled = false;

    const loadApplicationData =
      async () => {
        clearTenantData();

        setDataLoading(true);
        setDataError("");

        try {
          const [
            drugsResponse,
            productsResponse,
            patientsResponse,
            transactionsResponse,
            settingsResponse,
          ] = await Promise.all([
            canViewInventory
              ? api.get<Drug[]>(
                  "/drugs",
                )
              : Promise.resolve({
                  success: true,
                  data: [],
                } as ApiResponse<
                  Drug[]
                >),

            canViewInventory
              ? api.get<
                  InventoryProduct[]
                >(
                  "/products",
                )
              : Promise.resolve({
                  success: true,
                  data: [],
                } as ApiResponse<
                  InventoryProduct[]
                >),

            api.get<PatientRecord[]>(
              "/patients",
            ),

            api.get<
              DispenseTransaction[]
            >(
              "/transactions",
            ),

            api.get<PharmacySettings>(
              "/settings",
            ),
          ]);

          if (cancelled) {
            return;
          }

          setDrugs(
            unwrap(
              drugsResponse,
            ) || [],
          );

          setProducts(
            unwrap(
              productsResponse,
            ) || [],
          );

          setPatients(
            unwrap(
              patientsResponse,
            ) || [],
          );

          setTransactions(
            unwrap(
              transactionsResponse,
            ) || [],
          );

          const loadedSettings =
            unwrap(
              settingsResponse,
            );

          if (loadedSettings) {
            setSettings(
              loadedSettings,
            );
          }

          if (isPharmacyStaff) {
            const [
              suppliersResponse,
              adjustmentsResponse,
            ] = await Promise.all([
              api.get<Supplier[]>(
                "/suppliers",
              ),

              api.get<
                StockAdjustment[]
              >(
                "/stock-adjustments",
              ),
            ]);

            if (cancelled) {
              return;
            }

            setSuppliers(
              unwrap(
                suppliersResponse,
              ) || [],
            );

            setAdjustments(
              unwrap(
                adjustmentsResponse,
              ) || [],
            );
          } else {
            const adjustmentsResponse =
              canViewStockAdjustments
                ? await api.get<
                    StockAdjustment[]
                  >(
                    "/stock-adjustments",
                  )
                : null;

            if (cancelled) {
              return;
            }

            setSuppliers([]);

            setAdjustments(
              adjustmentsResponse
                ? unwrap(
                    adjustmentsResponse,
                  ) || []
                : [],
            );
          }
        } catch (error) {
          if (cancelled) {
            return;
          }

          setDataError(
            error instanceof Error
              ? error.message
              : "Unable to load pharmacy data.",
          );
        } finally {
          if (!cancelled) {
            setDataLoading(false);
          }
        }
      };

    void loadApplicationData();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    currentOrganizationId,
    canViewInventory,
    canViewStockAdjustments,
    isPharmacyStaff,
    isSuperAdmin,
  ]);

  const handleSwitchOrganization =
    async (
      organizationId: string,
    ): Promise<UserAccount> => {
      if (
        organizationId ===
        currentOrganizationId
      ) {
        return currentUser as UserAccount;
      }

      clearTenantData();

      setActiveTab(
        "dashboard",
      );

      try {
        const user =
          await switchOrganization(
            organizationId,
          );

        setDataError("");

        return user;
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to switch organization.",
        );

        throw error;
      }
    };

  useEffect(() => {
    const handlePrintShortcut = (
      event: KeyboardEvent,
    ) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "p"
      ) {
        event.preventDefault();

        if (
          !isSuperAdmin &&
          activeTab !==
            "dispensing"
        ) {
          setActiveTab(
            "dispensing",
          );
        }
      }
    };

    window.addEventListener(
      "keydown",
      handlePrintShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handlePrintShortcut,
      );
    };
  }, [
    activeTab,
    isSuperAdmin,
  ]);

  const handleOpenAddProduct =
    () => {
      if (!isPharmacyStaff) {
        return;
      }

      setEditingProduct(null);
      setProductModalError("");
      setIsProductModalOpen(true);
    };

  const handleOpenEditProduct =
    (
      product: InventoryProduct,
    ) => {
      if (!isPharmacyStaff) {
        return;
      }

      setEditingProduct(product);
      setProductModalError("");
      setIsProductModalOpen(true);
    };

  const handleSaveProduct =
    async (
      productData: ProductFormState,
      existingProduct: InventoryProduct | null,
    ) => {
      if (!isPharmacyStaff) {
        setProductModalError(
          "You do not have permission to manage products.",
        );
        return;
      }

      setProductSaving(true);
      setProductModalError("");

      try {
        if (existingProduct) {
          const response =
            await api.put<InventoryProduct>(
              `/products/${existingProduct.id}`,
              productData,
            );

          const updated =
            unwrap(response);

          if (!updated) {
            throw new Error(
              "The server did not return the updated product.",
            );
          }

          setProducts(
            (previous) =>
              previous.map(
                (product) =>
                  product.id ===
                  existingProduct.id
                    ? {
                        ...product,
                        ...updated,
                        batches:
                          updated.batches ??
                          product.batches,
                        totalQuantity:
                          updated.totalQuantity ??
                          product.totalQuantity,
                        activeBatchCount:
                          updated.activeBatchCount ??
                          product.activeBatchCount,
                        movementCount:
                          updated.movementCount ??
                          product.movementCount,
                        earliestExpiry:
                          updated.earliestExpiry ??
                          product.earliestExpiry,
                      }
                    : product,
              ),
          );
        } else {
          const response =
            await api.post<InventoryProduct>(
              "/products",
              productData,
            );

          const created =
            unwrap(response);

          if (!created) {
            throw new Error(
              "The server did not return the created product.",
            );
          }

          setProducts(
            (previous) => [
              {
                ...created,
                batches:
                  created.batches ??
                  [],
                totalQuantity:
                  created.totalQuantity ??
                  0,
                activeBatchCount:
                  created.activeBatchCount ??
                  0,
                movementCount:
                  created.movementCount ??
                  0,
                earliestExpiry:
                  created.earliestExpiry ??
                  null,
              },
              ...previous,
            ],
          );
        }

        setIsProductModalOpen(
          false,
        );
        setEditingProduct(null);
        setProductModalError("");
        setDataError("");
      } catch (error) {
        setProductModalError(
          error instanceof Error
            ? error.message
            : "Unable to save product.",
        );
      } finally {
        setProductSaving(false);
      }
    };

  const handleReceiveStockSubmit =
    async (
      input: ReceiveStockInput,
    ): Promise<void> => {
      if (!isPharmacyStaff) {
        const error =
          "You do not have permission to receive stock.";

        setDataError(error);

        throw new Error(error);
      }

      try {
        await api.post(
          "/inventory/receive",
          input,
        );

        const productsResponse =
          await api.get<
            InventoryProduct[]
          >(
            "/products",
          );

        setProducts(
          unwrap(
            productsResponse,
          ) || [],
        );

        setDataError("");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to receive stock.";

        setDataError(message);

        throw new Error(
          message,
        );
      }
    };

  /*
   * Dispensing.tsx performs the actual POST /transactions.
   *
   * This callback MUST NOT POST the transaction again.
   *
   * It only synchronizes local App state and refreshes the
   * authoritative Product/Batch inventory after the server
   * has successfully completed the dispensing transaction.
   */
  const handleCompleteTransaction =
    async (
      createdTransaction: DispenseTransaction,
    ) => {
      if (!isPharmacyStaff) {
        setDataError(
          "You do not have permission to complete dispensing transactions.",
        );
        return;
      }

      try {
        setTransactions(
          (previous) => [
            createdTransaction,
            ...previous.filter(
              (transaction) =>
                transaction.id !==
                createdTransaction.id,
            ),
          ],
        );

        const [
          productsResponse,
          patientsResponse,
          transactionsResponse,
        ] = await Promise.all([
          api.get<
            InventoryProduct[]
          >(
            "/products",
          ),

          api.get<PatientRecord[]>(
            "/patients",
          ),

          api.get<
            DispenseTransaction[]
          >(
            "/transactions",
          ),
        ]);

        setProducts(
          unwrap(
            productsResponse,
          ) || [],
        );

        setPatients(
          unwrap(
            patientsResponse,
          ) || [],
        );

        setTransactions(
          unwrap(
            transactionsResponse,
          ) || [],
        );

        /*
         * Keep the legacy Drug state refreshed for Dashboard
         * and Reports while those modules are still being
         * migrated to the new Product/Batch architecture.
         */
        if (canViewInventory) {
          const drugsResponse =
            await api.get<Drug[]>(
              "/drugs",
            );

          setDrugs(
            unwrap(
              drugsResponse,
            ) || [],
          );
        }

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "The transaction was completed, but the application could not refresh all inventory data.",
        );
      }
    };

  const handleAddSupplier =
    async (
      supplier: Supplier,
    ) => {
      if (!isPharmacyStaff) {
        setDataError(
          "You do not have permission to manage suppliers.",
        );
        return;
      }

      try {
        const response =
          await api.post<Supplier>(
            "/suppliers",
            supplier,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            "The server did not return the created supplier.",
          );
        }

        setSuppliers(
          (previous) => [
            ...previous,
            created,
          ],
        );

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to add supplier.",
        );
      }
    };

  const handleEditSupplier =
    async (
      supplier: Supplier,
    ) => {
      if (!isPharmacyStaff) {
        setDataError(
          "You do not have permission to manage suppliers.",
        );
        return;
      }

      try {
        const response =
          await api.put<Supplier>(
            `/suppliers/${supplier.id}`,
            supplier,
          );

        const updated =
          unwrap(response);

        if (!updated) {
          throw new Error(
            "The server did not return the updated supplier.",
          );
        }

        setSuppliers(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                supplier.id
                  ? updated
                  : item,
            ),
        );

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to update supplier.",
        );
      }
    };

  const handleAddPatient =
    async (
      patient: PatientRecord,
    ) => {
      try {
        const response =
          await api.post<PatientRecord>(
            "/patients",
            patient,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            "The server did not return the created patient.",
          );
        }

        setPatients(
          (previous) => [
            ...previous,
            created,
          ],
        );

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to add patient.",
        );
      }
    };

  const handleEditPatient =
    async (
      patient: PatientRecord,
    ) => {
      try {
        const response =
          await api.put<PatientRecord>(
            `/patients/${patient.id}`,
            patient,
          );

        const updated =
          unwrap(response);

        if (!updated) {
          throw new Error(
            "The server did not return the updated patient.",
          );
        }

        setPatients(
          (previous) =>
            previous.map(
              (item) =>
                item.id === patient.id
                  ? updated
                  : item,
            ),
        );

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to update patient.",
        );
      }
    };

  /*
   * StockAdjustments.tsx performs the actual POST.
   *
   * This callback only synchronizes App state after
   * the server has successfully created the adjustment.
   */
  const handleAddAdjustment =
    async (
      adjustment: StockAdjustment,
    ) => {
      if (!isPharmacyStaff) {
        setDataError(
          "You have read-only access to stock adjustment history.",
        );
        return;
      }

      try {
        setAdjustments(
          (previous) => [
            adjustment,
            ...previous.filter(
              (item) =>
                item.id !==
                adjustment.id,
            ),
          ],
        );

        const [
          productsResponse,
          adjustmentsResponse,
        ] = await Promise.all([
          api.get<
            InventoryProduct[]
          >(
            "/products",
          ),

          api.get<
            StockAdjustment[]
          >(
            "/stock-adjustments",
          ),
        ]);

        setProducts(
          unwrap(
            productsResponse,
          ) || [],
        );

        setAdjustments(
          unwrap(
            adjustmentsResponse,
          ) || [],
        );

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to refresh inventory after stock adjustment.",
        );
      }
    };

  const handleSaveSettings =
    async (
      newSettings: PharmacySettings,
    ) => {
      try {
        const response =
          await api.put<PharmacySettings>(
            "/settings",
            newSettings,
          );

        const updated =
          unwrap(response);

        if (!updated) {
          throw new Error(
            "The server did not return the updated settings.",
          );
        }

        setSettings(updated);
        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to save settings.",
        );
      }
    };

  const handleUpdateUserPassword =
    async (
      userId: string,
      currentPassword: string,
      newPassword: string,
    ): Promise<void> => {
      if (!currentUser) {
        throw new Error(
          "Authentication required.",
        );
      }

      if (
        userId !== currentUser.id
      ) {
        throw new Error(
          "You can only change your own password here.",
        );
      }

      await api.put(
        "/account/password",
        {
          currentPassword,
          newPassword,
        },
      );
    };

  const handleLoginSuccess =
    (user: UserAccount) => {
      syncAuthenticatedUser(user);

      setDataError("");
      setActiveTab("dashboard");
      setIsAuthModalOpen(false);
    };

  const handleSignUpSuccess =
    (user: UserAccount) => {
      syncAuthenticatedUser(user);

      setDataError("");
      setActiveTab("dashboard");
      setIsAuthModalOpen(false);
    };

  const handleConfirmLogout =
    async () => {
      await logout();

      setIsLogoutModalOpen(false);
      setActiveTab("dashboard");

      clearTenantData();
    };

  const handleOpenLogin = () => {
    setAuthModalInitialMode(
      "login",
    );
    setIsAuthModalOpen(true);
  };

  const handleOpenSignup = () => {
    setAuthModalInitialMode(
      "signup",
    );
    setIsAuthModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="text-center">
          <div className="mb-5 flex justify-center">
            <PharmaTrackLogo
              showWordmark
              subtitle
            />
          </div>

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-[#22577A]" />

          <p className="text-sm font-semibold text-slate-700">
            Loading PharmaTrack...
          </p>
        </div>
      </div>
    );
  }

  if (publicRoute) {
    return publicRoute;
  }

  if (!currentUser) {
    return (
      <>
        <LandingScreen
          onLoginClick={
            handleOpenLogin
          }
          onSignUpClick={
            handleOpenSignup
          }
        />

        <AuthModal
          isOpen={
            isAuthModalOpen
          }
          onClose={() =>
            setIsAuthModalOpen(
              false,
            )
          }
          currentUser={null}
          onLoginSuccess={
            handleLoginSuccess
          }
          onSignUpSuccess={
            handleSignUpSuccess
          }
          initialMode={
            authModalInitialMode
          }
        />
      </>
    );
  }

  if (isSuperAdmin) {
    return (
      <SuperAdminDashboard
        currentUser={
          currentUser
        }
        userName={
          currentUser.name
        }
        onLogout={logout}
      />
    );
  }

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={
          setActiveTab
        }
        settings={settings}
        currentUser={
          currentUser
        }
        organizations={
          organizations
        }
        currentOrganization={
          currentOrganization
        }
        onSwitchOrganization={
          handleSwitchOrganization
        }
        onOpenAuthModal={
          handleOpenLogin
        }
        onLogoutClick={() =>
          setIsLogoutModalOpen(
            true,
          )
        }
      />

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="min-h-full">
          {dataError && (
            <div className="mx-3 mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:mx-4 sm:mt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {dataError}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setDataError("")
                  }
                  className="self-start font-bold underline sm:self-auto"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {dataLoading && (
            <div className="mx-3 mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 sm:mx-4 sm:mt-4">
              Loading pharmacy data...
            </div>
          )}

          {activeTab ===
            "dashboard" && (
            <Dashboard
              drugs={drugs}
              transactions={
                transactions
              }
              settings={settings}
              setActiveTab={
                setActiveTab
              }
              onQuickDispense={() =>
                setActiveTab(
                  "dispensing",
                )
              }
              onReceiveStock={() => {
                if (
                  isPharmacyStaff
                ) {
                  setActiveTab(
                    "inventory",
                  );
                }
              }}
              onRecordAdjustment={() => {
                if (
                  isPharmacyStaff
                ) {
                  setActiveTab(
                    "stock-adjustments",
                  );
                }
              }}
            />
          )}

          {activeTab ===
            "inventory" &&
            canViewInventory && (
              <Inventory
                products={products}
                settings={settings}
                readOnly={
                  !isPharmacyStaff
                }
                onAddProduct={
                  handleOpenAddProduct
                }
                onEditProduct={
                  handleOpenEditProduct
                }
                onReceiveStockSubmit={
                  handleReceiveStockSubmit
                }
              />
            )}

          {activeTab ===
            "dispensing" && (
            <Dispensing
              products={products}
              settings={settings}
              transactions={
                transactions
              }
              patients={patients}
              onCompleteTransaction={
                handleCompleteTransaction
              }
            />
          )}

          {activeTab ===
            "suppliers" &&
            isPharmacyStaff && (
              <Suppliers
                suppliers={
                  suppliers
                }
                currentUser={
                  currentUser
                }
                onAddSupplier={
                  handleAddSupplier
                }
                onUpdateSupplier={
                  handleEditSupplier
                }
              />
            )}

          {activeTab ===
            "patients" && (
            <Patients
              patients={patients}
              onAddPatient={
                handleAddPatient
              }
              onUpdatePatient={
                handleEditPatient
              }
            />
          )}

          {activeTab ===
            "reports" && (
            <Reports
              drugs={drugs}
              transactions={
                transactions
              }
              settings={
                settings
              }
            />
          )}

          {activeTab ===
            "stock-adjustments" &&
            canViewStockAdjustments && (
              <StockAdjustments
                products={products}
                adjustments={
                  adjustments
                }
                settings={
                  settings
                }
                readOnly={
                  !isPharmacyStaff
                }
                onAddAdjustment={
                  isPharmacyStaff
                    ? handleAddAdjustment
                    : undefined
                }
              />
            )}

          {activeTab ===
            "user-management" &&
            isAdmin && (
              <UserManagement
                currentUserId={
                  currentUser.id
                }
              />
            )}

          {activeTab ===
            "audit-logs" &&
            isAdmin && (
              <AuditLogs
                currentUser={
                  currentUser
                }
              />
            )}

          {activeTab ===
            "settings" && (
            <Settings
              settings={settings}
              onSaveSettings={
                handleSaveSettings
              }
              currentUser={
                currentUser
              }
              users={[]}
              onUpdateUserPassword={
                handleUpdateUserPassword
              }
              onOpenAuthModal={
                handleOpenLogin
              }
            />
          )}
        </div>
      </main>

      <ProductModal
        isOpen={
          isProductModalOpen
        }
        editingProduct={
          editingProduct
        }
        onClose={() => {
          if (productSaving) {
            return;
          }

          setIsProductModalOpen(
            false,
          );
          setEditingProduct(null);
          setProductModalError("");
        }}
        onSave={
          handleSaveProduct
        }
        isSaving={
          productSaving
        }
        error={
          productModalError
        }
      />

      <LogoutModal
        isOpen={
          isLogoutModalOpen
        }
        onClose={() =>
          setIsLogoutModalOpen(
            false,
          )
        }
        onConfirmLogout={
          handleConfirmLogout
        }
        userName={
          currentUser.name
        }
      />

      <AuthModal
        isOpen={
          isAuthModalOpen
        }
        onClose={() =>
          setIsAuthModalOpen(
            false,
          )
        }
        currentUser={
          currentUser
        }
        onLoginSuccess={
          handleLoginSuccess
        }
        onSignUpSuccess={
          handleSignUpSuccess
        }
        initialMode={
          authModalInitialMode
        }
      />
    </div>
  );
}