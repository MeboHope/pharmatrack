import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { AddDrugModal } from './components/AddDrugModal';
import { AuthModal } from './components/AuthModal';
import { LandingScreen } from './components/LandingScreen';
import { LogoutModal } from './components/LogoutModal';
import {
  DispenseTransaction,
  Drug,
  PatientRecord,
  PharmacySettings,
  StockAdjustment,
  Supplier,
  TabType,
  UserAccount,
} from './types';
import { initialSettings } from './data/mockData';
import { Dispensing } from './components/Dispensing';
import { Suppliers } from './components/Suppliers';
import { Patients } from './components/Patients';
import { Reports } from './components/Reports';
import { StockAdjustments } from './components/StockAdjustments';
import { Settings } from './components/Settings';
import { supabase } from './lib/supabase';
import { loadProfile, signOut as authSignOut, updateProfile } from './lib/auth';
import {
  fetchAllData,
  saveAdjustment,
  saveDrug,
  saveDrugs,
  savePatient,
  saveSettings,
  saveSupplier,
  saveTransaction,
} from './lib/db';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Authentication state, driven by the Supabase session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Pharmacy data, loaded from Supabase once a user is signed in
  const [settings, setSettings] = useState<PharmacySettings>(initialSettings);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [transactions, setTransactions] = useState<DispenseTransaction[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  // Modal State for Add / Edit Drug
  const [isAddDrugOpen, setIsAddDrugOpen] = useState<boolean>(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);

  const reportError = useCallback((err: unknown) => {
    setDataError(err instanceof Error ? err.message : 'Something went wrong saving your changes.');
  }, []);

  // Restore an existing session on load and follow sign in / sign out events.
  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        if (data.session?.user) {
          setCurrentUser(await loadProfile(data.session.user));
        }
      })
      .catch(reportError)
      .finally(() => {
        if (!cancelled) setIsAuthLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setCurrentUser(null);
        return;
      }
      loadProfile(session.user).then(setCurrentUser).catch(reportError);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [reportError]);

  // Load all pharmacy data whenever a user signs in.
  const currentUserId = currentUser?.id;
  useEffect(() => {
    if (!currentUserId) {
      setDrugs([]);
      setTransactions([]);
      setPatients([]);
      setSuppliers([]);
      setAdjustments([]);
      return;
    }

    let cancelled = false;
    setIsDataLoading(true);
    setDataError('');

    fetchAllData()
      .then((data) => {
        if (cancelled) return;
        setDrugs(data.drugs);
        setTransactions(data.transactions);
        setPatients(data.patients);
        setSuppliers(data.suppliers);
        setAdjustments(data.adjustments);
        if (data.settings) setSettings(data.settings);
      })
      .catch(reportError)
      .finally(() => {
        if (!cancelled) setIsDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, reportError]);

  // Global Ctrl+P / Cmd+P listener to switch to dispensing tab if not active
  useEffect(() => {
    const handleGlobalPrintShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        if (activeTab !== 'dispensing') {
          setActiveTab('dispensing');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalPrintShortcut);
    return () => window.removeEventListener('keydown', handleGlobalPrintShortcut);
  }, [activeTab]);

  // Handlers
  const handleOpenAddDrug = () => {
    setEditingDrug(null);
    setIsAddDrugOpen(true);
  };

  const handleOpenEditDrug = (drug: Drug) => {
    setEditingDrug(drug);
    setIsAddDrugOpen(true);
  };

  const handleSaveDrug = (drugData: Partial<Drug>) => {
    const drug: Drug = editingDrug
      ? ({ ...editingDrug, ...drugData } as Drug)
      : {
          id: drugData.code || `DRG-${String(drugs.length + 1).padStart(4, '0')}`,
          code: drugData.code || `DRG-${String(drugs.length + 1).padStart(4, '0')}`,
          name: drugData.name || '',
          genericName: drugData.genericName || '',
          category: drugData.category || 'Other',
          formulation: drugData.formulation || 'Tablets',
          batchNo: drugData.batchNo || `BN2026-${String(drugs.length + 1).padStart(3, '0')}`,
          manufactureDate: drugData.manufactureDate,
          expiryDate: drugData.expiryDate || '2027-01-01',
          qty: drugData.qty || 0,
          unit: drugData.unit || 'Tablets',
          buyingPrice: drugData.buyingPrice || 0,
          sellingPrice: drugData.sellingPrice || 0,
          markupPercent: drugData.markupPercent || 0,
          status: drugData.status || 'In Stock',
          notes: drugData.notes,
          createdAt: new Date().toISOString().slice(0, 10),
        };

    setDrugs((prev) =>
      editingDrug ? prev.map((d) => (d.id === drug.id ? drug : d)) : [drug, ...prev]
    );
    saveDrug(drug).catch(reportError);
  };

  const handleReceiveStockSubmit = (
    drugId: string,
    qtyReceived: number,
    _invoiceNo: string,
    buyingPrice?: number
  ) => {
    const target = drugs.find((d) => d.id === drugId);
    if (!target) return;

    const newQty = target.qty + qtyReceived;
    const newBuyingPrice = buyingPrice !== undefined ? buyingPrice : target.buyingPrice;
    const markup =
      newBuyingPrice > 0
        ? ((target.sellingPrice - newBuyingPrice) / newBuyingPrice) * 100
        : target.markupPercent;

    const updated: Drug = {
      ...target,
      qty: newQty,
      buyingPrice: newBuyingPrice,
      markupPercent: Number(markup.toFixed(1)),
      status:
        target.status === 'Expired'
          ? target.status
          : newQty > settings.reorderAlertLevel
            ? 'In Stock'
            : 'Low Stock',
    };

    setDrugs((prev) => prev.map((d) => (d.id === drugId ? updated : d)));
    saveDrug(updated).catch(reportError);
  };

  const handleCompleteTransaction = (newTxn: DispenseTransaction) => {
    setTransactions((prev) => [newTxn, ...prev]);

    // Deduct dispensed quantities from stock
    const updatedDrugs = drugs.flatMap((d) => {
      const item = newTxn.items.find((i) => i.drugId === d.id);
      if (!item) return [];

      const updatedQty = Math.max(0, d.qty - item.qty);
      let newStatus = d.status;
      if (d.status !== 'Expired') {
        if (updatedQty === 0) newStatus = 'Out of Stock';
        else if (updatedQty <= settings.reorderAlertLevel) newStatus = 'Low Stock';
        else newStatus = 'In Stock';
      }
      return [{ ...d, qty: updatedQty, status: newStatus }];
    });

    setDrugs((prev) => prev.map((d) => updatedDrugs.find((u) => u.id === d.id) ?? d));

    saveTransaction(newTxn)
      .then(() => saveDrugs(updatedDrugs))
      .catch(reportError);
  };

  const handleAddSupplier = (newSupplier: Supplier) => {
    setSuppliers((prev) => [...prev, newSupplier]);
    saveSupplier(newSupplier).catch(reportError);
  };

  const handleEditSupplier = (updatedSupplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s)));
    saveSupplier(updatedSupplier).catch(reportError);
  };

  const handleAddPatient = (newPatient: PatientRecord) => {
    setPatients((prev) => [...prev, newPatient]);
    savePatient(newPatient).catch(reportError);
  };

  const handleEditPatient = (updatedPatient: PatientRecord) => {
    setPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
    savePatient(updatedPatient).catch(reportError);
  };

  const handleAddAdjustment = (newAdj: StockAdjustment) => {
    setAdjustments((prev) => [newAdj, ...prev]);

    const target = drugs.find((d) => d.id === newAdj.drugId);
    const updated = target
      ? {
          ...target,
          qty: newAdj.adjustedQty,
          status: newAdj.adjustedQty === 0 ? ('Out of Stock' as const) : target.status,
        }
      : null;

    if (updated) setDrugs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));

    saveAdjustment(newAdj)
      .then(() => (updated ? saveDrug(updated) : undefined))
      .catch(reportError);
  };

  const handleSaveSettings = (newSettings: PharmacySettings) => {
    setSettings(newSettings);
    saveSettings(newSettings).catch(reportError);

    if (currentUser && currentUser.name !== newSettings.clinicianName) {
      const updatedUser = { ...currentUser, name: newSettings.clinicianName };
      setCurrentUser(updatedUser);
      updateProfile(currentUser.id, { name: newSettings.clinicianName }).catch(reportError);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    authSignOut().catch(reportError);
    setCurrentUser(null);
    setIsLogoutModalOpen(false);
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalInitialMode(mode);
    setIsAuthModalOpen(true);
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Loading PharmaTrack...</span>
      </div>
    );
  }

  // When not logged in, display the full screen landing page
  if (!currentUser) {
    return (
      <>
        <LandingScreen
          onLoginClick={() => openAuthModal('login')}
          onSignUpClick={() => openAuthModal('signup')}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          initialMode={authModalInitialMode}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-slate-800">
      {/* Left Aligned Navigation Tabs */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        currentUser={currentUser}
        onOpenAuthModal={() => openAuthModal('login')}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {dataError && (
          <div className="m-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
            {dataError}
          </div>
        )}

        {isDataLoading ? (
          <div className="flex h-full min-h-[60vh] items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading pharmacy data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                drugs={drugs}
                transactions={transactions}
                settings={settings}
                setActiveTab={setActiveTab}
                onQuickDispense={() => setActiveTab('dispensing')}
                onReceiveStock={() => setActiveTab('inventory')}
                onRecordAdjustment={() => setActiveTab('stock-adjustments')}
              />
            )}

            {activeTab === 'inventory' && (
              <Inventory
                drugs={drugs}
                settings={settings}
                onAddDrug={handleOpenAddDrug}
                onEditDrug={handleOpenEditDrug}
                onReceiveStockSubmit={handleReceiveStockSubmit}
              />
            )}

            {activeTab === 'dispensing' && (
              <Dispensing
                drugs={drugs}
                settings={settings}
                transactions={transactions}
                patients={patients}
                onCompleteTransaction={handleCompleteTransaction}
              />
            )}

            {activeTab === 'suppliers' && (
              <Suppliers
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
                onUpdateSupplier={handleEditSupplier}
              />
            )}

            {activeTab === 'patients' && (
              <Patients
                patients={patients}
                onAddPatient={handleAddPatient}
                onUpdatePatient={handleEditPatient}
              />
            )}

            {activeTab === 'reports' && (
              <Reports drugs={drugs} transactions={transactions} settings={settings} />
            )}

            {activeTab === 'stock-adjustments' && (
              <StockAdjustments
                drugs={drugs}
                adjustments={adjustments}
                settings={settings}
                onAddAdjustment={handleAddAdjustment}
              />
            )}

            {activeTab === 'settings' && (
              <Settings
                settings={settings}
                onSaveSettings={handleSaveSettings}
                currentUser={currentUser}
                onOpenAuthModal={() => openAuthModal('login')}
              />
            )}
          </>
        )}
      </main>

      {/* Add / Edit Drug Modal */}
      <AddDrugModal
        isOpen={isAddDrugOpen}
        onClose={() => setIsAddDrugOpen(false)}
        onSave={handleSaveDrug}
        editingDrug={editingDrug}
        settings={settings}
        nextCodeNumber={drugs.length + 1}
      />

      {/* Logout Confirmation Popup Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirmLogout={handleLogout}
        userName={currentUser?.name}
      />

      {/* Auth Modal (Login / Sign Up / Password reset) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authModalInitialMode}
      />
    </div>
  );
}
