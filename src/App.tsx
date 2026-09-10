import React, { useEffect, useState } from 'react';

import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { AddDrugModal } from './components/AddDrugModal';
import { AuthModal } from './components/AuthModal';
import { LandingScreen } from './components/LandingScreen';
import { LogoutModal } from './components/LogoutModal';
import { Dispensing } from './components/Dispensing';
import { Suppliers } from './components/Suppliers';
import { Patients } from './components/Patients';
import { Reports } from './components/Reports';
import { StockAdjustments } from './components/StockAdjustments';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';

import type {
  DispenseTransaction,
  Drug,
  PatientRecord,
  PharmacySettings,
  StockAdjustment,
  Supplier,
  TabType,
  UserAccount,
} from './types';

import {
  initialDrugs,
  initialTransactions,
  initialPatients,
  initialSuppliers,
  initialAdjustments,
  initialSettings,
} from './data/mockData';

import { useAuth } from './hooks/useAuth';
import { api, type ApiResponse } from './services/api';

const unwrap = <T,>(
  response: ApiResponse<T>,
): T | undefined => {
  return response.data;
};

export default function App() {
  const [activeTab, setActiveTab] =
    useState<TabType>('dashboard');

  const {
    currentUser,
    isLoading: authLoading,
    logout,
    syncAuthenticatedUser,
  } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] =
    useState(false);

  const [authModalInitialMode, setAuthModalInitialMode] =
    useState<'login' | 'signup' | 'forgot'>('login');

  const [isLogoutModalOpen, setIsLogoutModalOpen] =
    useState(false);

  const [settings, setSettings] =
    useState<PharmacySettings>(initialSettings);

  const [drugs, setDrugs] =
    useState<Drug[]>(initialDrugs);

  const [transactions, setTransactions] =
    useState<DispenseTransaction[]>(
      initialTransactions,
    );

  const [patients, setPatients] =
    useState<PatientRecord[]>(initialPatients);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>(initialSuppliers);

  const [adjustments, setAdjustments] =
    useState<StockAdjustment[]>(
      initialAdjustments,
    );

  const [dataLoading, setDataLoading] =
    useState(false);

  const [dataError, setDataError] =
    useState('');

  const [isAddDrugOpen, setIsAddDrugOpen] =
    useState(false);

  const [editingDrug, setEditingDrug] =
    useState<Drug | null>(null);

  const isAdmin =
    currentUser?.role === 'Admin';

  const isPharmacyStaff =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Pharmacist';

  /*
   * Load operational data from the backend.
   *
   * User accounts are deliberately NOT loaded here.
   * User Management loads them separately and is
   * restricted to administrators.
   */
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let cancelled = false;

    const loadApplicationData = async () => {
      setDataLoading(true);
      setDataError('');

      try {
        const [
          drugsResponse,
          patientsResponse,
          transactionsResponse,
          settingsResponse,
        ] = await Promise.all([
          isPharmacyStaff
            ? api.get<Drug[]>('/drugs')
            : Promise.resolve({
                success: true,
                data: [],
              } as ApiResponse<Drug[]>),

          api.get<PatientRecord[]>('/patients'),

          api.get<DispenseTransaction[]>(
            '/transactions',
          ),

          api.get<PharmacySettings>('/settings'),
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

        if (isPharmacyStaff) {
          const [
            suppliersResponse,
            adjustmentsResponse,
          ] = await Promise.all([
            api.get<Supplier[]>('/suppliers'),
            api.get<StockAdjustment[]>(
              '/stock-adjustments',
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
          setSuppliers([]);
          setAdjustments([]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDataError(
          error instanceof Error
            ? error.message
            : 'Unable to load pharmacy data.',
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
    isPharmacyStaff,
  ]);

  /*
   * Global print shortcut.
   */
  useEffect(() => {
    const handlePrintShortcut = (
      event: KeyboardEvent,
    ) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'p'
      ) {
        event.preventDefault();

        if (activeTab !== 'dispensing') {
          setActiveTab('dispensing');
        }
      }
    };

    window.addEventListener(
      'keydown',
      handlePrintShortcut,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handlePrintShortcut,
      );
    };
  }, [activeTab]);

  const handleOpenAddDrug = () => {
    setEditingDrug(null);
    setIsAddDrugOpen(true);
  };

  const handleOpenEditDrug = (
    drug: Drug,
  ) => {
    setEditingDrug(drug);
    setIsAddDrugOpen(true);
  };

  /*
   * Create or update drug.
   */
  const handleSaveDrug = async (
    drugData: Partial<Drug>,
  ) => {
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
            'The server did not return the updated drug.',
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
            '/drugs',
            drugData,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            'The server did not return the created drug.',
          );
        }

        setDrugs((previous) => [
          created,
          ...previous,
        ]);
      }

      setIsAddDrugOpen(false);
      setEditingDrug(null);
      setDataError('');
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Unable to save drug.',
      );
    }
  };

  /*
   * Receive stock.
   *
   * Backend response:
   * {
   *   drug,
   *   receiving: {
   *     invoiceNo,
   *     quantityReceived
   *   }
   * }
   */
  const handleReceiveStockSubmit = async (
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
    try {
      const response =
        await api.post<{
          drug: Drug;
          receiving: {
            invoiceNo: string;
            quantityReceived: number;
          };
        }>(
          '/stock-receiving',
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
          'The server did not return the stock receiving result.',
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
          : 'Unable to receive stock.';

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
      try {
        const response =
          await api.post<DispenseTransaction>(
            '/transactions',
            newTransaction,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            'The server did not return the completed transaction.',
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
          isPharmacyStaff
            ? api.get<Drug[]>('/drugs')
            : Promise.resolve({
                success: true,
                data: [],
              } as ApiResponse<Drug[]>),

          api.get<PatientRecord[]>(
            '/patients',
          ),
        ]);

        if (isPharmacyStaff) {
          setDrugs(
            unwrap(drugsResponse) || [],
          );
        }

        setPatients(
          unwrap(patientsResponse) || [],
        );

        setDataError('');
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : 'Unable to complete transaction.',
        );
      }
    };

  /*
   * Suppliers.
   */
  const handleAddSupplier = async (
    supplier: Supplier,
  ) => {
    try {
      const response =
        await api.post<Supplier>(
          '/suppliers',
          supplier,
        );

      const created =
        unwrap(response);

      if (!created) {
        throw new Error(
          'The server did not return the created supplier.',
        );
      }

      setSuppliers((previous) => [
        ...previous,
        created,
      ]);

      setDataError('');
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Unable to add supplier.',
      );
    }
  };

  const handleEditSupplier = async (
    supplier: Supplier,
  ) => {
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
          'The server did not return the updated supplier.',
        );
      }

      setSuppliers((previous) =>
        previous.map((item) =>
          item.id === supplier.id
            ? updated
            : item,
        ),
      );

      setDataError('');
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Unable to update supplier.',
      );
    }
  };

  /*
   * Patients.
   */
  const handleAddPatient = async (
    patient: PatientRecord,
  ) => {
    try {
      const response =
        await api.post<PatientRecord>(
          '/patients',
          patient,
        );

      const created =
        unwrap(response);

      if (!created) {
        throw new Error(
          'The server did not return the created patient.',
        );
      }

      setPatients((previous) => [
        ...previous,
        created,
      ]);

      setDataError('');
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Unable to add patient.',
      );
    }
  };

  const handleEditPatient = async (
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
          'The server did not return the updated patient.',
        );
      }

      setPatients((previous) =>
        previous.map((item) =>
          item.id === patient.id
            ? updated
            : item,
        ),
      );

      setDataError('');
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Unable to update patient.',
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
      try {
        const response =
          await api.post<StockAdjustment>(
            '/stock-adjustments',
            adjustment,
          );

        const created =
          unwrap(response);

        if (!created) {
          throw new Error(
            'The server did not return the stock adjustment.',
          );
        }

        setAdjustments((previous) => [
          created,
          ...previous,
        ]);

        const drugsResponse =
          await api.get<Drug[]>('/drugs');

        setDrugs(
          unwrap(drugsResponse) || [],
        );

        setDataError('');
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : 'Unable to record stock adjustment.',
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
            '/settings',
            newSettings,
          );

        const updated =
          unwrap(response);

        if (!updated) {
          throw new Error(
            'The server did not return the updated settings.',
          );
        }

        setSettings(updated);
        setDataError('');
      } catch (error) {
        setDataError(
          error instanceof Error
            ? error.message
            : 'Unable to save settings.',
        );
      }
    };

  /*
   * Change the currently authenticated user's
   * password through the secure backend endpoint.
   */
  const handleUpdateUserPassword =
    async (
      userId: string,
      currentPassword: string,
      newPassword: string,
    ): Promise<void> => {
      if (!currentUser) {
        throw new Error(
          'Authentication required.',
        );
      }

      if (
        userId !== currentUser.id
      ) {
        throw new Error(
          'You can only change your own password here.',
        );
      }

      await api.put(
        '/account/password',
        {
          currentPassword,
          newPassword,
        },
      );
    };

  /*
   * AuthModal compatibility callbacks.
   *
   * Authentication itself is owned by useAuth.
   * syncAuthenticatedUser updates the application
   * session immediately after login/signup.
   */
  const handleLoginSuccess = (
    user: UserAccount,
  ) => {
    syncAuthenticatedUser(user);
    setDataError('');
    setActiveTab('dashboard');
    setIsAuthModalOpen(false);
  };

  const handleSignUpSuccess = (
    user: UserAccount,
  ) => {
    syncAuthenticatedUser(user);
    setDataError('');
    setActiveTab('dashboard');
    setIsAuthModalOpen(false);
  };

  const handleConfirmLogout =
    async () => {
      await logout();

      setIsLogoutModalOpen(false);
      setActiveTab('dashboard');

      setDrugs([]);
      setPatients([]);
      setSuppliers([]);
      setTransactions([]);
      setAdjustments([]);
    };

  const handleOpenLogin = () => {
    setAuthModalInitialMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenSignup = () => {
    setAuthModalInitialMode('signup');
    setIsAuthModalOpen(true);
  };

  /*
   * Authentication loading screen.
   */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-[#22577A] rounded-full animate-spin mx-auto mb-4" />

          <p className="text-sm font-semibold text-slate-700">
            Loading PharmaTrack...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Landing page for unauthenticated users.
   */
  if (!currentUser) {
    return (
      <>
        <LandingScreen
          onLoginClick={handleOpenLogin}
          onSignUpClick={handleOpenSignup}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() =>
            setIsAuthModalOpen(false)
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
   * Authenticated application.
   */
  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-slate-800">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        currentUser={currentUser}
        onOpenAuthModal={
          handleOpenLogin
        }
        onLogoutClick={() =>
          setIsLogoutModalOpen(true)
        }
      />

      <main className="flex-1 overflow-y-auto">
        {dataError && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
            {dataError}

            <button
              type="button"
              onClick={() =>
                setDataError('')
              }
              className="ml-3 font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {dataLoading && (
          <div className="m-4 p-3 bg-sky-50 border border-sky-200 text-sky-800 text-sm rounded-xl">
            Loading pharmacy data...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            drugs={drugs}
            transactions={transactions}
            settings={settings}
            setActiveTab={setActiveTab}
            onQuickDispense={() =>
              setActiveTab('dispensing')
            }
            onReceiveStock={() =>
              setActiveTab('inventory')
            }
            onRecordAdjustment={() =>
              setActiveTab(
                'stock-adjustments',
              )
            }
          />
        )}

        {activeTab === 'inventory' &&
          isPharmacyStaff && (
            <Inventory
              drugs={drugs}
              settings={settings}
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

        {activeTab === 'dispensing' && (
          <Dispensing
            drugs={drugs}
            settings={settings}
            transactions={transactions}
            patients={patients}
            onCompleteTransaction={
              handleCompleteTransaction
            }
          />
        )}

        {activeTab === 'suppliers' &&
          isPharmacyStaff && (
            <Suppliers
              suppliers={suppliers}
              currentUser={currentUser}
              onAddSupplier={
                handleAddSupplier
              }
              onUpdateSupplier={
                handleEditSupplier
              }
            />
          )}

        {activeTab === 'patients' && (
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

        {activeTab === 'reports' && (
          <Reports
            drugs={drugs}
            transactions={transactions}
            settings={settings}
          />
        )}

        {activeTab === 'stock-adjustments' &&
          isPharmacyStaff && (
            <StockAdjustments
              drugs={drugs}
              adjustments={adjustments}
              settings={settings}
              onAddAdjustment={
                handleAddAdjustment
              }
            />
          )}

        {activeTab === 'user-management' &&
          isAdmin && (
            <UserManagement
              currentUserId={
                currentUser.id
              }
            />
          )}

        {activeTab === 'settings' && (
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
      </main>

      <AddDrugModal
        isOpen={isAddDrugOpen}
        onClose={() => {
          setIsAddDrugOpen(false);
          setEditingDrug(null);
        }}
        onSave={handleSaveDrug}
        editingDrug={editingDrug}
        settings={settings}
        nextCodeNumber={
          drugs.length + 1
        }
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() =>
          setIsLogoutModalOpen(false)
        }
        onConfirmLogout={
          handleConfirmLogout
        }
        userName={
          currentUser.name
        }
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() =>
          setIsAuthModalOpen(false)
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