import React, { useEffect, useState } from "react";

import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
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

import pharmacyDataService from "./services/pharmacyData";
import authService from "./services/auth";
import accountService from "./services/account";

const DEFAULT_SETTINGS: PharmacySettings = {
pharmacyName: "AfyaLink Pharmacy",
tagline: "Healthcare & Wellness Center",
address: "Moi Avenue, Nairobi",
phone: "0700111222",
email: "[info@afyalinkpharmacy.co.ke](mailto:info@afyalinkpharmacy.co.ke)",
currency: "KES",
clinicianName: "",
expiryAlertDays: 90,
reorderAlertLevel: 10,
logoUrl: "/logo/logo.png",
};

export default function App() {
const [activeTab, setActiveTab] =
useState<TabType>("dashboard");

const [currentUser, setCurrentUser] =
useState<UserAccount | null>(() =>
authService.getStoredUser(),
);

const users: UserAccount[] = currentUser
? [currentUser]
: [];

const [isAuthModalOpen, setIsAuthModalOpen] =
useState(false);

const [authModalInitialMode, setAuthModalInitialMode] =
useState<"login" | "signup" | "forgot">("login");

const [isLogoutModalOpen, setIsLogoutModalOpen] =
useState(false);

const [drugs, setDrugs] =
useState<Drug[]>([]);

const [patients, setPatients] =
useState<PatientRecord[]>([]);

const [suppliers, setSuppliers] =
useState<Supplier[]>([]);

const [transactions, setTransactions] =
useState<DispenseTransaction[]>([]);

const [adjustments, setAdjustments] =
useState<StockAdjustment[]>([]);

const [settings, setSettings] =
useState<PharmacySettings>(
DEFAULT_SETTINGS,
);

const [isLoading, setIsLoading] =
useState(false);

const [loadError, setLoadError] =
useState<string | null>(null);

const [isAddDrugOpen, setIsAddDrugOpen] =
useState(false);

const [editingDrug, setEditingDrug] =
useState<Drug | null>(null);

const loadApplicationData = async () => {
if (!authService.isAuthenticated()) {
return;
}


try {
  setIsLoading(true);
  setLoadError(null);

  const [
    loadedDrugs,
    loadedPatients,
    loadedSuppliers,
    loadedTransactions,
    loadedAdjustments,
    loadedSettings,
  ] = await Promise.all([
    pharmacyDataService.getDrugs(),
    pharmacyDataService.getPatients(),
    pharmacyDataService.getSuppliers(),
    pharmacyDataService.getTransactions(),
    pharmacyDataService.getStockAdjustments(),
    pharmacyDataService.getSettings(),
  ]);

  setDrugs(loadedDrugs);
  setPatients(loadedPatients);
  setSuppliers(loadedSuppliers);
  setTransactions(loadedTransactions);
  setAdjustments(loadedAdjustments);

  setSettings({
    ...DEFAULT_SETTINGS,
    ...loadedSettings,
    logoUrl:
      loadedSettings.logoUrl ||
      DEFAULT_SETTINGS.logoUrl,
  });
} catch (error) {
  console.error(
    "Failed to load PharmaTrack data:",
    error,
  );

  setLoadError(
    error instanceof Error
      ? error.message
      : "Unable to load pharmacy data.",
  );
} finally {
  setIsLoading(false);
}


};

useEffect(() => {
const initialiseSession = async () => {
if (!authService.isAuthenticated()) {
return;
}


  try {
    const user =
      await authService.getCurrentUser();

    setCurrentUser(user);
  } catch (error) {
    console.error(
      "Unable to restore authenticated session:",
      error,
    );

    authService.clearSession();
    setCurrentUser(null);
  }
};

void initialiseSession();


}, []);

useEffect(() => {
if (!currentUser) {
return;
}


void loadApplicationData();


}, [currentUser]);

useEffect(() => {
const handleGlobalPrintShortcut = (
event: KeyboardEvent,
) => {
if (
(event.ctrlKey || event.metaKey) &&
event.key.toLowerCase() === "p"
) {
event.preventDefault();


    if (activeTab !== "dispensing") {
      setActiveTab("dispensing");
    }
  }
};

window.addEventListener(
  "keydown",
  handleGlobalPrintShortcut,
);

return () =>
  window.removeEventListener(
    "keydown",
    handleGlobalPrintShortcut,
  );


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

const handleSaveDrug = async (
drugData: Partial<Drug>,
) => {
try {
if (editingDrug) {
const updatedDrug =
await pharmacyDataService.updateDrug(
editingDrug.id,
drugData,
);


    setDrugs((previous) =>
      previous.map((drug) =>
        drug.id === editingDrug.id
          ? updatedDrug
          : drug,
      ),
    );
  } else {
    const createdDrug =
      await pharmacyDataService.createDrug(
        drugData,
      );

    setDrugs((previous) => [
      createdDrug,
      ...previous,
    ]);
  }

  setIsAddDrugOpen(false);
  setEditingDrug(null);
} catch (error) {
  console.error(
    "Failed to save drug:",
    error,
  );

  throw error;
}


};

const handleReceiveStockSubmit = async (
drugId: string,
qtyReceived: number,
_invoiceNo: string,
buyingPrice?: number,
): Promise<void> => {
const drug = drugs.find(
(item) => item.id === drugId,
);


if (!drug) {
  throw new Error(
    "Drug could not be found.",
  );
}

if (
  !Number.isInteger(qtyReceived) ||
  qtyReceived <= 0
) {
  throw new Error(
    "Quantity received must be a positive whole number.",
  );
}

const newQty =
  drug.qty + qtyReceived;

const newBuyingPrice =
  buyingPrice !== undefined
    ? buyingPrice
    : drug.buyingPrice;

const markup =
  newBuyingPrice > 0
    ? ((drug.sellingPrice -
        newBuyingPrice) /
        newBuyingPrice) *
      100
    : drug.markupPercent;

let status: Drug["status"];

if (newQty === 0) {
  status = "Out of Stock";
} else if (
  newQty <= settings.reorderAlertLevel
) {
  status = "Low Stock";
} else {
  status = "In Stock";
}

const updatedDrug =
  await pharmacyDataService.updateDrug(
    drugId,
    {
      qty: newQty,
      buyingPrice: newBuyingPrice,
      markupPercent:
        Number(markup.toFixed(1)),
      status,
    },
  );

setDrugs((previous) =>
  previous.map((item) =>
    item.id === drugId
      ? updatedDrug
      : item,
  ),
);


};

const handleCompleteTransaction =
async (
newTransaction: DispenseTransaction,
) => {
try {
const savedTransaction =
await pharmacyDataService.createTransaction(
newTransaction,
);


    setTransactions((previous) => [
      savedTransaction,
      ...previous,
    ]);

    const refreshedDrugs =
      await pharmacyDataService.getDrugs();

    setDrugs(refreshedDrugs);

    const refreshedPatients =
      await pharmacyDataService.getPatients();

    setPatients(refreshedPatients);
  } catch (error) {
    console.error(
      "Failed to complete transaction:",
      error,
    );

    throw error;
  }
};


const handleAddPatient = async (
newPatient: PatientRecord,
) => {
try {
const createdPatient =
await pharmacyDataService.createPatient(
newPatient,
);


  setPatients((previous) => [
    ...previous,
    createdPatient,
  ]);
} catch (error) {
  console.error(
    "Failed to add patient:",
    error,
  );

  throw error;
}


};

const handleEditPatient = async (
updatedPatient: PatientRecord,
) => {
try {
const savedPatient =
await pharmacyDataService.updatePatient(
updatedPatient.id,
updatedPatient,
);


  setPatients((previous) =>
    previous.map((patient) =>
      patient.id === savedPatient.id
        ? savedPatient
        : patient,
    ),
  );
} catch (error) {
  console.error(
    "Failed to update patient:",
    error,
  );

  throw error;
}


};

const handleAddSupplier = async (
newSupplier: Supplier,
) => {
try {
const createdSupplier =
await pharmacyDataService.createSupplier(
newSupplier,
);


  setSuppliers((previous) => [
    ...previous,
    createdSupplier,
  ]);
} catch (error) {
  console.error(
    "Failed to add supplier:",
    error,
  );

  throw error;
}


};

const handleEditSupplier = async (
updatedSupplier: Supplier,
) => {
try {
const savedSupplier =
await pharmacyDataService.updateSupplier(
updatedSupplier.id,
updatedSupplier,
);


  setSuppliers((previous) =>
    previous.map((supplier) =>
      supplier.id === savedSupplier.id
        ? savedSupplier
        : supplier,
    ),
  );
} catch (error) {
  console.error(
    "Failed to update supplier:",
    error,
  );

  throw error;
}


};

const handleAddAdjustment = async (
newAdjustment: StockAdjustment,
) => {
try {
const createdAdjustment =
await pharmacyDataService.createStockAdjustment(
newAdjustment,
);


  setAdjustments((previous) => [
    createdAdjustment,
    ...previous,
  ]);

  const refreshedDrugs =
    await pharmacyDataService.getDrugs();

  setDrugs(refreshedDrugs);
} catch (error) {
  console.error(
    "Failed to create stock adjustment:",
    error,
  );

  throw error;
}


};

const handleSaveSettings = async (
newSettings: PharmacySettings,
) => {
try {
const savedSettings =
await pharmacyDataService.updateSettings(
newSettings,
);


  setSettings({
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    logoUrl:
      savedSettings.logoUrl ||
      DEFAULT_SETTINGS.logoUrl,
  });
} catch (error) {
  console.error(
    "Failed to save settings:",
    error,
  );

  throw error;
}


};

const handleUpdateUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  if (!currentUser) {
    throw new Error(
      "You must be logged in to change your password.",
    );
  }

  if (currentUser.id !== userId) {
    throw new Error(
      "You can only change the password of the currently authenticated account.",
    );
  }

  await accountService.changePassword(
    currentPassword,
    newPassword,
  );
};

const handleLoginSuccess = (
user: UserAccount,
) => {
setCurrentUser(user);
setActiveTab("dashboard");
setIsAuthModalOpen(false);
};

const handleSignUpSuccess = (
newUser: UserAccount,
) => {
setCurrentUser(newUser);
setActiveTab("dashboard");
setIsAuthModalOpen(false);
};

const handleDirectLogin = () => {
setAuthModalInitialMode("login");
setIsAuthModalOpen(true);
};

const handleConfirmLogout = () => {
authService.clearSession();


setCurrentUser(null);

setDrugs([]);
setPatients([]);
setSuppliers([]);
setTransactions([]);
setAdjustments([]);
setSettings(DEFAULT_SETTINGS);

setActiveTab("dashboard");
setIsLogoutModalOpen(false);


};

if (!currentUser) {
return (
<>
<LandingScreen
onLoginClick={handleDirectLogin}
onSignUpClick={() => {
setAuthModalInitialMode("signup");
setIsAuthModalOpen(true);
}}
/>


    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() =>
        setIsAuthModalOpen(false)
      }
      currentUser={currentUser}
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

return ( <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-slate-800">
<Sidebar
activeTab={activeTab}
setActiveTab={setActiveTab}
settings={settings}
currentUser={currentUser}
onOpenAuthModal={() => {
setAuthModalInitialMode("login");
setIsAuthModalOpen(true);
}}
onLogoutClick={() =>
setIsLogoutModalOpen(true)
}
/>


  <main className="flex-1 overflow-y-auto">
    {isLoading && (
      <div className="sticky top-0 z-40 bg-[#22577A] text-white text-xs font-semibold px-4 py-2 text-center">
        Loading PharmaTrack data...
      </div>
    )}

    {loadError && (
      <div className="sticky top-0 z-40 bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-3 text-sm flex items-center justify-between gap-4">
        <span>{loadError}</span>

        <button
          type="button"
          onClick={() =>
            void loadApplicationData()
          }
          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 rounded-lg text-xs font-bold"
        >
          Retry
        </button>
      </div>
    )}

    {activeTab === "dashboard" && (
      <Dashboard
        drugs={drugs}
        transactions={transactions}
        settings={settings}
        setActiveTab={setActiveTab}
        onQuickDispense={() =>
          setActiveTab("dispensing")
        }
        onReceiveStock={() =>
          setActiveTab("inventory")
        }
        onRecordAdjustment={() =>
          setActiveTab("stock-adjustments")
        }
      />
    )}

    {activeTab === "inventory" && (
      <Inventory
        drugs={drugs}
        settings={settings}
        onAddDrug={handleOpenAddDrug}
        onEditDrug={handleOpenEditDrug}
        onReceiveStockSubmit={
          handleReceiveStockSubmit
        }
      />
    )}

    {activeTab === "dispensing" && (
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

    {activeTab === "suppliers" && (
      <Suppliers
        suppliers={suppliers}
        onAddSupplier={handleAddSupplier}
        onUpdateSupplier={
          handleEditSupplier
        }
      />
    )}

    {activeTab === "patients" && (
      <Patients
        patients={patients}
        onAddPatient={handleAddPatient}
        onUpdatePatient={
          handleEditPatient
        }
      />
    )}

    {activeTab === "reports" && (
      <Reports
        drugs={drugs}
        transactions={transactions}
        settings={settings}
      />
    )}

    {activeTab === "stock-adjustments" && (
      <StockAdjustments
        drugs={drugs}
        adjustments={adjustments}
        settings={settings}
        onAddAdjustment={
          handleAddAdjustment
        }
      />
    )}

    {activeTab === "user-management" &&
      currentUser.role === "Admin" && (
        <UserManagement
          currentUserId={currentUser.id}
        />
      )}

    {activeTab === "settings" && (
      <Settings
        settings={settings}
        onSaveSettings={
          handleSaveSettings
        }
        currentUser={currentUser}
        users={users}
        onUpdateUserPassword={
          handleUpdateUserPassword
        }
        onOpenAuthModal={() => {
          setAuthModalInitialMode("login");
          setIsAuthModalOpen(true);
        }}
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
    nextCodeNumber={drugs.length + 1}
  />

  <LogoutModal
    isOpen={isLogoutModalOpen}
    onClose={() =>
      setIsLogoutModalOpen(false)
    }
    onConfirmLogout={
      handleConfirmLogout
    }
    userName={currentUser.name}
  />

  <AuthModal
    isOpen={isAuthModalOpen}
    onClose={() =>
      setIsAuthModalOpen(false)
    }
    currentUser={currentUser}
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

  <Settings
  settings={settings}
  onSaveSettings={
    handleSaveSettings
  }
  currentUser={currentUser}
  users={users}
  onUpdateUserPassword={
    handleUpdateUserPassword
  }
  onOpenAuthModal={() => {
    setAuthModalInitialMode("login");
    setIsAuthModalOpen(true);
  }}
/>
</div>


);
}
