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
import { Inventory } from "./components/Inventory";
import { AddDrugModal } from "./components/AddDrugModal";
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

  const [activeTab, setActiveTab] =
    useState<TabType>("dashboard");

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

  const [settings, setSettings] =
    useState<PharmacySettings>(
      initialSettings,
    );

  const [drugs, setDrugs] =
    useState<Drug[]>(initialDrugs);

  const [
    transactions,
    setTransactions,
  ] = useState<DispenseTransaction[]>(
    initialTransactions,
  );

  const [patients, setPatients] =
    useState<PatientRecord[]>(
      initialPatients,
    );

  const [suppliers, setSuppliers] =
    useState<Supplier[]>(
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

  const [dataError, setDataError] =
    useState("");

  const [
    isAddDrugOpen,
    setIsAddDrugOpen,
  ] = useState(false);

  const [
    editingDrug,
    setEditingDrug,
  ] = useState<Drug | null>(null);

  /*
   * Super Admin is a platform-level account.
   *
   * Super Admins do not operate inside one
   * pharmacy/clinic context, so they must not
   * load organization-scoped operational data.
   */
  const isSuperAdmin =
    currentUser?.role ===
    "Super Admin";

  const isAdmin =
    currentUser?.role === "Admin";

  /*
   * The organization ID is deliberately taken
   * from the authenticated session.
   *
   * The backend uses this organization context
   * to scope all tenant-owned records.
   */
  const currentOrganizationId =
    currentUser?.organizationId ?? null;

  /*
   * Read access.
   *
   * Clinicians may view inventory and
   * stock-adjustment history.
   */
  const canViewInventory =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Pharmacist" ||
    currentUser?.role === "Clinician";

  const canViewStockAdjustments =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Pharmacist" ||
    currentUser?.role === "Clinician";

  /*
   * Write/management access.
   */
  const isPharmacyStaff =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Pharmacist";

  /*
   * Clear all organization-scoped
   * application state.
   *
   * This is important for multi-tenancy:
   * records belonging to Organization A must
   * never remain visible while Organization B
   * is being loaded.
   */
  const clearTenantData = () => {
    setDrugs([]);
    setPatients([]);
    setTransactions([]);
    setSuppliers([]);
    setAdjustments([]);
    setSettings(initialSettings);
    setDataError("");
    setIsAddDrugOpen(false);
    setEditingDrug(null);
  };

  /*
   * Load operational data from the backend.
   *
   * Super Admins never load these endpoints.
   */
  useEffect(() => {
    if (!currentUser) {
      clearTenantData();
      setDataLoading(false);
      return;
    }

    /*
     * Never call tenant-scoped endpoints for
     * a platform-level Super Admin.
     */
    if (isSuperAdmin) {
      clearTenantData();
      setDataLoading(false);
      setDataError("");

      return;
    }

    /*
     * A normal authenticated tenant user must
     * have an organization context.
     */
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
        /*
         * Clear the previous organization's
         * data before starting the new request.
         */
        clearTenantData();

        setDataLoading(true);
        setDataError("");

        try {
          const [
            drugsResponse,
            patientsResponse,
            transactionsResponse,
            settingsResponse,
          ] = await Promise.all([
            canViewInventory
              ? api.get<Drug[]>("/drugs")
              : Promise.resolve({
                  success: true,
                  data: [],
                } as ApiResponse<Drug[]>),

            api.get<PatientRecord[]>(
              "/patients",
            ),

            api.get<DispenseTransaction[]>(
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
            unwrap(drugsResponse) || [],
          );

          setPatients(
            unwrap(patientsResponse) || [],
          );

          setTransactions(
            unwrap(transactionsResponse) || [],
          );

          const loadedSettings =
            unwrap(settingsResponse);

          if (loadedSettings) {
            setSettings(loadedSettings);
          }

          /*
           * Suppliers remain restricted to
           * administrators and pharmacists.
           */
          if (isPharmacyStaff) {
            const [
              suppliersResponse,
              adjustmentsResponse,
            ] = await Promise.all([
              api.get<Supplier[]>(
                "/suppliers",
              ),

              api.get<StockAdjustment[]>(
                "/stock-adjustments",
              ),
            ]);

            if (cancelled) {
              return;
            }

            setSuppliers(
              unwrap(suppliersResponse) || [],
            );

            setAdjustments(
              unwrap(adjustmentsResponse) || [],
            );
          } else {
            /*
             * Clinicians can read adjustment
             * history, but not supplier data.
             */
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

  /*
   * Switch organization.
   */
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

      /*
       * Always return to the dashboard when
       * changing organizations.
       */
      setActiveTab("dashboard");

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

  /*
   * Global print shortcut.
   *
   * This is only relevant to the normal
   * pharmacy application.
   */
  useEffect(() => {
    const handlePrintShortcut = (
      event: KeyboardEvent,
    ) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === "p"
      ) {
        event.preventDefault();

        if (
          !isSuperAdmin &&
          activeTab !== "dispensing"
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

  const handleOpenAddDrug = () => {
    if (!isPharmacyStaff) {
      return;
    }

    setEditingDrug(null);
    setIsAddDrugOpen(true);
  };

  const handleOpenEditDrug = (
    drug: Drug,
  ) => {
    if (!isPharmacyStaff) {
      return;
    }

    setEditingDrug(drug);
    setIsAddDrugOpen(true);
  };

  /*
   * Create or update drug.
   */
  const handleSaveDrug = async (
    drugData: Partial<Drug>,
  ) => {
    if (!isPharmacyStaff) {
      setDataError(
        "You do not have permission to modify inventory.",
      );
      return;
    }

    try {
      if (editingDrug) {
        const response =
          await api.put<Drug>(
            `/drugs/${editingDrug.id}`,
            drugData,
          );

        const updated =
          unwrap(response);

        if (!updated) {
          throw new Error(
            "The server did not return the updated drug.",
          );
        }

        setDrugs((previous) =>
          previous.map((drug) =>
            drug.id === editingDrug.id
              ? updated
              : drug,
          ),
        );
      } else {
        const response =
          await api.post<Drug>(
            "/drugs",
            drugData,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            "The server did not return the created drug.",
          );
        }

        setDrugs((previous) => [
          created,
          ...previous,
        ]);
      }

      setIsAddDrugOpen(false);
      setEditingDrug(null);
      setDataError("");
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : "Unable to save drug.",
      );
    }
  };

  /*
   * Receive stock.
   */
  const handleReceiveStockSubmit =
    async (
      drugId: string,
      qtyReceived: number,
      invoiceNo: string,
      buyingPrice?: number,
    ): Promise<{
      drug: Drug;
      receiving: {
        invoiceNo: string;
        quantityReceived: number;
      };
    }> => {
      if (!isPharmacyStaff) {
        const error =
          "You do not have permission to receive stock.";

        setDataError(error);

        throw new Error(error);
      }

      try {
        const response =
          await api.post<{
            drug: Drug;
            receiving: {
              invoiceNo: string;
              quantityReceived: number;
            };
          }>(
            "/stock-receiving",
            {
              drugId,
              qtyReceived,
              invoiceNo,
              buyingPrice,
            },
          );

        const result =
          unwrap(response);

        if (!result) {
          throw new Error(
            "The server did not return the stock receiving result.",
          );
        }

        setDrugs((previous) =>
          previous.map((drug) =>
            drug.id === drugId
              ? result.drug
              : drug,
          ),
        );

        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to receive stock.";

        setDataError(message);

        throw new Error(message);
      }
    };

  /*
   * Complete dispensing transaction.
   */
  const handleCompleteTransaction =
    async (
      newTransaction: DispenseTransaction,
    ) => {
      /*
       * Transaction creation remains a
       * pharmacy-staff operation.
       */
      if (!isPharmacyStaff) {
        setDataError(
          "You do not have permission to complete dispensing transactions.",
        );
        return;
      }

      try {
        const response =
          await api.post<DispenseTransaction>(
            "/transactions",
            newTransaction,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            "The server did not return the completed transaction.",
          );
        }

        setTransactions((previous) => [
          created,
          ...previous,
        ]);

        const [
          drugsResponse,
          patientsResponse,
        ] = await Promise.all([
          canViewInventory
            ? api.get<Drug[]>("/drugs")
            : Promise.resolve({
                success: true,
                data: [],
              } as ApiResponse<Drug[]>),

          api.get<PatientRecord[]>(
            "/patients",
          ),
        ]);

        if (canViewInventory) {
          setDrugs(
            unwrap(drugsResponse) || [],
          );
        }

        setPatients(
          unwrap(patientsResponse) || [],
        );

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to complete transaction.",
        );
      }
    };

  /*
   * Suppliers.
   */
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

        setSuppliers((previous) => [
          ...previous,
          created,
        ]);

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

        setSuppliers((previous) =>
          previous.map((item) =>
            item.id === supplier.id
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

  /*
   * Patients.
   */
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

        setPatients((previous) => [
          ...previous,
          created,
        ]);

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

        setPatients((previous) =>
          previous.map((item) =>
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
   * Stock adjustments.
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
        const response =
          await api.post<StockAdjustment>(
            "/stock-adjustments",
            adjustment,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            "The server did not return the stock adjustment.",
          );
        }

        setAdjustments((previous) => [
          created,
          ...previous,
        ]);

        const drugsResponse =
          await api.get<Drug[]>("/drugs");

        setDrugs(
          unwrap(drugsResponse) || [],
        );

        setDataError("");
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to record stock adjustment.",
        );
      }
    };

  /*
   * Pharmacy settings.
   */
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

  /*
   * Change current user's password.
   */
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

      if (userId !== currentUser.id) {
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

  /*
   * Authentication callbacks.
   */
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
    setAuthModalInitialMode("login");
    setIsAuthModalOpen(true);
  };

  const handleOpenSignup = () => {
    setAuthModalInitialMode("signup");
    setIsAuthModalOpen(true);
  };

  /*
   * Authentication loading screen.
   */
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-[#22577A]" />

          <p className="text-sm font-semibold text-slate-700">
            Loading PharmaTrack...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Public feature routes.
   */
  if (publicRoute) {
    return publicRoute;
  }

  /*
   * Landing page for unauthenticated users.
   */
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

  /*
   * SUPER ADMIN APPLICATION
   *
   * Super Admin receives its own complete
   * application shell from SuperAdminDashboard.
   *
   * The normal Sidebar is deliberately NOT
   * rendered here.
   */
  if (isSuperAdmin) {
    return (
      <SuperAdminDashboard
        currentUser={currentUser}
        userName={currentUser.name}
        onLogout={logout}
      />
    );
  }

  /*
   * NORMAL TENANT APPLICATION
   *
   * ADMIN / PHARMACIST / CLINICIAN users
   * continue using the normal pharmacy/clinic
   * application shell.
   *
   * IMPORTANT LAYOUT:
   *
   * The shell is fixed to the viewport.
   * The main content owns the vertical scroll.
   * The sidebar therefore remains visible while
   * long pages scroll independently.
   */
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={
          setActiveTab
        }
        settings={settings}
        currentUser={currentUser}
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

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {dataError && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {dataError}

            <button
              type="button"
              onClick={() =>
                setDataError("")
              }
              className="ml-3 font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {dataLoading && (
          <div className="m-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
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
              drugs={drugs}
              settings={settings}
              readOnly={
                !isPharmacyStaff
              }
              onAddDrug={
                handleOpenAddDrug
              }
              onEditDrug={
                handleOpenEditDrug
              }
              onReceiveStockSubmit={
                handleReceiveStockSubmit
              }
            />
          )}

        {activeTab ===
          "dispensing" && (
          <Dispensing
            drugs={drugs}
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
              drugs={drugs}
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
            settings={
              settings
            }
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
      </main>

      {isPharmacyStaff && (
        <AddDrugModal
          isOpen={
            isAddDrugOpen
          }
          onClose={() => {
            setIsAddDrugOpen(
              false,
            );
            setEditingDrug(null);
          }}
          onSave={
            handleSaveDrug
          }
          editingDrug={
            editingDrug
          }
          settings={
            settings
          }
          nextCodeNumber={
            drugs.length + 1
          }
        />
      )}

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