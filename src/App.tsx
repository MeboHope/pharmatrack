import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { AddDrugModal } from './components/AddDrugModal';
import { AuthModal } from './components/AuthModal';
import { LandingScreen } from './components/LandingScreen';
import { LogoutModal } from './components/LogoutModal';
import { DispenseTransaction, Drug, PatientRecord, PharmacySettings, StockAdjustment, Supplier, TabType, UserAccount } from './types';
import { 
  initialDrugs, 
  initialTransactions, 
  initialPatients, 
  initialSuppliers, 
  initialAdjustments, 
  initialSettings,
  initialUsers
} from './data/mockData';
import { Dispensing } from './components/Dispensing';
import { Suppliers } from './components/Suppliers';
import { Patients } from './components/Patients';
import { Reports } from './components/Reports';
import { StockAdjustments } from './components/StockAdjustments';
import { Settings } from './components/Settings';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // User Accounts & Authentication State
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('pharmatrack_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('pharmatrack_current_user');
    if (saved) return JSON.parse(saved);
    return null; // Default to landing screen if no session
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Application Persistent State
  const [settings, setSettings] = useState<PharmacySettings>(() => {
    const saved = localStorage.getItem('pharmatrack_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { logoUrl: '/logo/logo.png', ...parsed };
    }
    return initialSettings;
  });

  const [drugs, setDrugs] = useState<Drug[]>(() => {
    const saved = localStorage.getItem('pharmatrack_drugs');
    const loaded: Drug[] = saved ? JSON.parse(saved) : initialDrugs;
    const now = new Date();
    return loaded.map((d) => {
      const isExpired = d.status === 'Expired' || (d.expiryDate && new Date(d.expiryDate) < now);
      if (isExpired) {
        const updatedStatus = d.qty === 0 ? 'Out of Stock' : (d.qty <= (initialSettings?.reorderAlertLevel || 10) ? 'Low Stock' : 'In Stock');
        return {
          ...d,
          expiryDate: '2027-12-31',
          status: updatedStatus,
        };
      }
      return d;
    });
  });

  const [transactions, setTransactions] = useState<DispenseTransaction[]>(() => {
    const saved = localStorage.getItem('pharmatrack_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [patients, setPatients] = useState<PatientRecord[]>(() => {
    const saved = localStorage.getItem('pharmatrack_patients');
    return saved ? JSON.parse(saved) : initialPatients;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('pharmatrack_suppliers');
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(() => {
    const saved = localStorage.getItem('pharmatrack_adjustments');
    return saved ? JSON.parse(saved) : initialAdjustments;
  });

  // Modal State for Add / Edit Drug
  const [isAddDrugOpen, setIsAddDrugOpen] = useState<boolean>(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('pharmatrack_settings', JSON.stringify(settings));
  }, [settings]);

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

  useEffect(() => {
    localStorage.setItem('pharmatrack_drugs', JSON.stringify(drugs));
  }, [drugs]);

  useEffect(() => {
    localStorage.setItem('pharmatrack_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('pharmatrack_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('pharmatrack_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('pharmatrack_adjustments', JSON.stringify(adjustments));
  }, [adjustments]);

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
    if (editingDrug) {
      setDrugs((prev) =>
        prev.map((d) => (d.id === editingDrug.id ? { ...d, ...drugData } as Drug : d))
      );
    } else {
      const newId = String(drugs.length + 1);
      const newDrug: Drug = {
        id: newId,
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
      setDrugs((prev) => [newDrug, ...prev]);
    }
  };

  const handleReceiveStockSubmit = (
    drugId: string,
    qtyReceived: number,
    invoiceNo: string,
    buyingPrice?: number
  ) => {
    setDrugs((prev) =>
      prev.map((d) => {
        if (d.id === drugId) {
          const newQty = d.qty + qtyReceived;
          const newBuyingPrice = buyingPrice !== undefined ? buyingPrice : d.buyingPrice;
          const markup = newBuyingPrice > 0 ? ((d.sellingPrice - newBuyingPrice) / newBuyingPrice) * 100 : d.markupPercent;
          
          let newStatus = d.status;
          if (d.status !== 'Expired') {
            newStatus = newQty > settings.reorderAlertLevel ? 'In Stock' : 'Low Stock';
          }
          return {
            ...d,
            qty: newQty,
            buyingPrice: newBuyingPrice,
            markupPercent: Number(markup.toFixed(1)),
            status: newStatus,
          };
        }
        return d;
      })
    );
  };

  const handleCompleteTransaction = (newTxn: DispenseTransaction) => {
    // Add to transaction log
    setTransactions((prev) => [newTxn, ...prev]);

    // Deduct stock from drug database
    setDrugs((prev) =>
      prev.map((d) => {
        const item = newTxn.items.find((i) => i.drugId === d.id);
        if (item) {
          const updatedQty = Math.max(0, d.qty - item.qty);
          let newStatus = d.status;
          if (d.status !== 'Expired') {
            if (updatedQty === 0) newStatus = 'Out of Stock';
            else if (updatedQty <= settings.reorderAlertLevel) newStatus = 'Low Stock';
            else newStatus = 'In Stock';
          }
          return {
            ...d,
            qty: updatedQty,
            status: newStatus,
          };
        }
        return d;
      })
    );
  };

  const handleAddSupplier = (newSupplier: Supplier) => {
    setSuppliers((prev) => [...prev, newSupplier]);
  };

  const handleEditSupplier = (updatedSupplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s)));
  };

  const handleAddPatient = (newPatient: PatientRecord) => {
    setPatients((prev) => [...prev, newPatient]);
  };

  const handleEditPatient = (updatedPatient: PatientRecord) => {
    setPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
  };

  const handleAddAdjustment = (newAdj: StockAdjustment) => {
    setAdjustments((prev) => [newAdj, ...prev]);
    // Also adjust drug quantity
    setDrugs((prev) =>
      prev.map((d) => {
        if (d.id === newAdj.drugId) {
          return {
            ...d,
            qty: newAdj.adjustedQty,
            status: newAdj.adjustedQty === 0 ? 'Out of Stock' : d.status,
          };
        }
        return d;
      })
    );
  };

  // Sync User Accounts & Current User to LocalStorage
  useEffect(() => {
    localStorage.setItem('pharmatrack_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pharmatrack_current_user', JSON.stringify(currentUser));
      // Auto update settings clinician name to match logged in user
      setSettings((prev) => ({ ...prev, clinicianName: currentUser.name }));
    } else {
      localStorage.removeItem('pharmatrack_current_user');
    }
  }, [currentUser]);

  const handleSaveSettings = (newSettings: PharmacySettings) => {
    setSettings(newSettings);
    if (currentUser) {
      const updatedUser = { ...currentUser, name: newSettings.clinicianName };
      setCurrentUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setSettings((prev) => ({ ...prev, clinicianName: user.name }));
    setIsAuthModalOpen(false);
  };

  const handleSignUpSuccess = (newUser: UserAccount) => {
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setSettings((prev) => ({ ...prev, clinicianName: newUser.name }));
    setIsAuthModalOpen(false);
  };

  const handleUpdateUserPassword = (userId: string, newPass: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, passwordHash: newPass } : u))
    );
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, passwordHash: newPass } : null));
    }
  };

  // Quick direct login without password requirement
  const handleDirectLogin = () => {
    const userToLogin = users.length > 0 ? users[0] : {
      id: 'usr-default',
      name: 'Dr. Sarah Jenkins',
      email: 's.jenkins@pharmatrack.com',
      role: 'Pharmacist' as const,
      passwordHash: 'pharmatrack123',
      isVerified: true,
      createdAt: new Date().toISOString()
    };
    handleLoginSuccess(userToLogin);
    setActiveTab('dashboard');
    setIsAuthModalOpen(false);
  };

  // When not logged in, display the full screen landing page matching prototype
  if (!currentUser) {
    return (
      <>
        <LandingScreen
          onLoginClick={handleDirectLogin}
          onSignUpClick={() => {
            setAuthModalInitialMode('signup');
            setIsAuthModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          users={users}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onSignUpSuccess={handleSignUpSuccess}
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
        onOpenAuthModal={() => {
          setAuthModalInitialMode('login');
          setIsAuthModalOpen(true);
        }}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
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
          <Suppliers suppliers={suppliers} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleEditSupplier} />
        )}

        {activeTab === 'patients' && (
          <Patients patients={patients} onAddPatient={handleAddPatient} onUpdatePatient={handleEditPatient} />
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
            users={users}
            onUpdateUserPassword={handleUpdateUserPassword}
            onOpenAuthModal={() => {
              setAuthModalInitialMode('login');
              setIsAuthModalOpen(true);
            }}
          />
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
        onConfirmLogout={() => {
          setCurrentUser(null);
          localStorage.removeItem('pharmatrack_current_user');
        }}
        userName={currentUser?.name}
      />

      {/* Auth Modal (Login / Sign Up / Forgot Password OTP) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onSignUpSuccess={handleSignUpSuccess}
        initialMode={authModalInitialMode}
      />
    </div>
  );
}
