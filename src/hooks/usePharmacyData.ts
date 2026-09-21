import { useCallback, useEffect, useState } from "react";

import type {
  Drug,
  DispenseTransaction,
  PatientRecord,
  PharmacySettings,
  StockAdjustment,
  Supplier,
  UserAccount,
} from "../types";

import { pharmacyDataService } from "../services/pharmacyData";

type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

export interface UsePharmacyDataResult {
  drugs: Drug[];
  patients: PatientRecord[];
  suppliers: Supplier[];
  transactions: DispenseTransaction[];
  adjustments: StockAdjustment[];
  settings: PharmacySettings | null;

  isLoading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  refreshDrugs: () => Promise<void>;
  refreshPatients: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAdjustments: () => Promise<void>;
  refreshSettings: () => Promise<void>;

  createDrug: (
    data: Partial<Drug>,
  ) => Promise<Drug>;

  updateDrug: (
    id: string,
    data: Partial<Drug>,
  ) => Promise<Drug>;

  deleteDrug: (
    id: string,
  ) => Promise<void>;

  createPatient: (
    data: Partial<PatientRecord>,
  ) => Promise<PatientRecord>;

  updatePatient: (
    id: string,
    data: Partial<PatientRecord>,
  ) => Promise<PatientRecord>;

  deletePatient: (
    id: string,
  ) => Promise<void>;

  createSupplier: (
    data: Partial<Supplier>,
  ) => Promise<Supplier>;

  updateSupplier: (
    id: string,
    data: Partial<Supplier>,
  ) => Promise<Supplier>;

  deleteSupplier: (
    id: string,
  ) => Promise<void>;

  createTransaction: (
    data: Partial<DispenseTransaction>,
  ) => Promise<DispenseTransaction>;

  createAdjustment: (
    data: Partial<StockAdjustment>,
  ) => Promise<StockAdjustment>;

  receiveStock: (
    drugId: string,
    qtyReceived: number,
    invoiceNo?: string,
    buyingPrice?: number,
  ) => Promise<{
    drug: Drug;
    receiving: {
      invoiceNo: string;
      quantityReceived: number;
    };
  }>;

  updateSettings: (
    data: Partial<PharmacySettings>,
  ) => Promise<PharmacySettings>;

  clearError: () => void;
}

const normalizeRole = (
  role: unknown,
): AppRole | null => {
  const normalized = String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (
    normalized === "SUPER_ADMIN" ||
    normalized === "ADMIN" ||
    normalized === "PHARMACIST" ||
    normalized === "CLINICIAN"
  ) {
    return normalized;
  }

  return null;
};

const isSuperAdmin = (
  role: unknown,
): boolean =>
  normalizeRole(role) === "SUPER_ADMIN";

/*
 * Drug records are readable by every authenticated
 * pharmacy role.
 *
 * Super Admin is intentionally excluded because this
 * hook handles organization-scoped pharmacy data.
 */
const canAccessDrugs = (
  role: AppRole,
): boolean =>
  role === "ADMIN" ||
  role === "PHARMACIST" ||
  role === "CLINICIAN";

/*
 * Supplier information is restricted to pharmacy
 * management staff.
 */
const canAccessSuppliers = (
  role: AppRole,
): boolean =>
  role === "ADMIN" ||
  role === "PHARMACIST";

/*
 * Stock adjustment history is readable by clinicians,
 * while creation remains restricted by the backend to
 * administrators and pharmacists.
 */
const canAccessAdjustments = (
  role: AppRole,
): boolean =>
  role === "ADMIN" ||
  role === "PHARMACIST" ||
  role === "CLINICIAN";

const superAdminDataError = (): Error =>
  new Error(
    "Super Admin accounts do not use organization-scoped pharmacy data.",
  );

export function usePharmacyData(
  currentUser: UserAccount | null,
): UsePharmacyDataResult {
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
    useState<PharmacySettings | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const clearError =
    useCallback(() => {
      setError(null);
    }, []);

  const refreshDrugs =
    useCallback(async () => {
      if (isSuperAdmin(currentUser?.role)) {
        setDrugs([]);
        return;
      }

      const data =
        await pharmacyDataService.getDrugs();

      setDrugs(data);
    }, [currentUser?.role]);

  const refreshPatients =
    useCallback(async () => {
      if (isSuperAdmin(currentUser?.role)) {
        setPatients([]);
        return;
      }

      const data =
        await pharmacyDataService.getPatients();

      setPatients(data);
    }, [currentUser?.role]);

  const refreshSuppliers =
    useCallback(async () => {
      if (isSuperAdmin(currentUser?.role)) {
        setSuppliers([]);
        return;
      }

      const data =
        await pharmacyDataService.getSuppliers();

      setSuppliers(data);
    }, [currentUser?.role]);

  const refreshTransactions =
    useCallback(async () => {
      if (isSuperAdmin(currentUser?.role)) {
        setTransactions([]);
        return;
      }

      const data =
        await pharmacyDataService.getTransactions();

      setTransactions(data);
    }, [currentUser?.role]);

  const refreshAdjustments =
    useCallback(async () => {
      if (isSuperAdmin(currentUser?.role)) {
        setAdjustments([]);
        return;
      }

      const data =
        await pharmacyDataService.getStockAdjustments();

      setAdjustments(data);
    }, [currentUser?.role]);

  const refreshSettings =
    useCallback(async () => {
      if (isSuperAdmin(currentUser?.role)) {
        setSettings(null);
        return;
      }

      const data =
        await pharmacyDataService.getSettings();

      setSettings(data);
    }, [currentUser?.role]);

  const refresh =
    useCallback(async () => {
      if (!currentUser) {
        setDrugs([]);
        setPatients([]);
        setSuppliers([]);
        setTransactions([]);
        setAdjustments([]);
        setSettings(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const role =
        normalizeRole(currentUser.role);

      if (!role) {
        setError(
          "Unable to determine the authenticated user's role.",
        );
        setIsLoading(false);
        return;
      }

      /*
       * SUPER_ADMIN is a platform-wide account.
       *
       * It does not belong to a pharmacy/clinic
       * organization, so it must never request
       * organization-scoped pharmacy endpoints.
       *
       * Super Admin data is loaded by the dedicated
       * Super Admin services/components instead.
       */
      if (role === "SUPER_ADMIN") {
        setDrugs([]);
        setPatients([]);
        setSuppliers([]);
        setTransactions([]);
        setAdjustments([]);
        setSettings(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const requests: Promise<unknown>[] =
          [];

        if (canAccessDrugs(role)) {
          requests.push(
            pharmacyDataService
              .getDrugs()
              .then(setDrugs),
          );
        } else {
          setDrugs([]);
        }

        requests.push(
          pharmacyDataService
            .getPatients()
            .then(setPatients),
        );

        if (canAccessSuppliers(role)) {
          requests.push(
            pharmacyDataService
              .getSuppliers()
              .then(setSuppliers),
          );
        } else {
          setSuppliers([]);
        }

        requests.push(
          pharmacyDataService
            .getTransactions()
            .then(setTransactions),
        );

        if (canAccessAdjustments(role)) {
          requests.push(
            pharmacyDataService
              .getStockAdjustments()
              .then(setAdjustments),
          );
        } else {
          setAdjustments([]);
        }

        requests.push(
          pharmacyDataService
            .getSettings()
            .then(setSettings),
        );

        await Promise.all(requests);
      } catch (requestError) {
        console.error(
          "Failed to load PharmaTrack data:",
          requestError,
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load PharmaTrack data.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [currentUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createDrug =
    useCallback(
      async (
        data: Partial<Drug>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const created =
          await pharmacyDataService.createDrug(
            data,
          );

        await refreshDrugs();

        return created;
      },
      [
        currentUser?.role,
        refreshDrugs,
      ],
    );

  const updateDrug =
    useCallback(
      async (
        id: string,
        data: Partial<Drug>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const updated =
          await pharmacyDataService.updateDrug(
            id,
            data,
          );

        await refreshDrugs();

        return updated;
      },
      [
        currentUser?.role,
        refreshDrugs,
      ],
    );

  const deleteDrug =
    useCallback(
      async (id: string) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        await pharmacyDataService.deleteDrug(
          id,
        );

        await refreshDrugs();
      },
      [
        currentUser?.role,
        refreshDrugs,
      ],
    );

  const createPatient =
    useCallback(
      async (
        data: Partial<PatientRecord>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const created =
          await pharmacyDataService.createPatient(
            data,
          );

        await refreshPatients();

        return created;
      },
      [
        currentUser?.role,
        refreshPatients,
      ],
    );

  const updatePatient =
    useCallback(
      async (
        id: string,
        data: Partial<PatientRecord>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const updated =
          await pharmacyDataService.updatePatient(
            id,
            data,
          );

        await refreshPatients();

        return updated;
      },
      [
        currentUser?.role,
        refreshPatients,
      ],
    );

  const deletePatient =
    useCallback(
      async (id: string) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        await pharmacyDataService.deletePatient(
          id,
        );

        await refreshPatients();
      },
      [
        currentUser?.role,
        refreshPatients,
      ],
    );

  const createSupplier =
    useCallback(
      async (
        data: Partial<Supplier>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const created =
          await pharmacyDataService.createSupplier(
            data,
          );

        await refreshSuppliers();

        return created;
      },
      [
        currentUser?.role,
        refreshSuppliers,
      ],
    );

  const updateSupplier =
    useCallback(
      async (
        id: string,
        data: Partial<Supplier>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const updated =
          await pharmacyDataService.updateSupplier(
            id,
            data,
          );

        await refreshSuppliers();

        return updated;
      },
      [
        currentUser?.role,
        refreshSuppliers,
      ],
    );

  const deleteSupplier =
    useCallback(
      async (id: string) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        await pharmacyDataService.deleteSupplier(
          id,
        );

        await refreshSuppliers();
      },
      [
        currentUser?.role,
        refreshSuppliers,
      ],
    );

  const createTransaction =
    useCallback(
      async (
        data: Partial<DispenseTransaction>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const created =
          await pharmacyDataService.createTransaction(
            data,
          );

        await refreshTransactions();
        await refreshPatients();

        const role =
          normalizeRole(
            currentUser?.role,
          );

        if (
          role &&
          canAccessDrugs(role)
        ) {
          await refreshDrugs();
        }

        return created;
      },
      [
        currentUser?.role,
        refreshDrugs,
        refreshPatients,
        refreshTransactions,
      ],
    );

  const createAdjustment =
    useCallback(
      async (
        data: Partial<StockAdjustment>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const created =
          await pharmacyDataService.createStockAdjustment(
            data,
          );

        await refreshAdjustments();

        const role =
          normalizeRole(
            currentUser?.role,
          );

        if (
          role &&
          canAccessDrugs(role)
        ) {
          await refreshDrugs();
        }

        return created;
      },
      [
        currentUser?.role,
        refreshAdjustments,
        refreshDrugs,
      ],
    );

  const receiveStock =
    useCallback(
      async (
        drugId: string,
        qtyReceived: number,
        invoiceNo?: string,
        buyingPrice?: number,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const updated =
          await pharmacyDataService.receiveStock(
            {
              drugId,
              qtyReceived,
              invoiceNo,
              buyingPrice,
            },
          );

        await refreshDrugs();

        return updated;
      },
      [
        currentUser?.role,
        refreshDrugs,
      ],
    );

  const updateSettings =
    useCallback(
      async (
        data: Partial<PharmacySettings>,
      ) => {
        if (
          isSuperAdmin(
            currentUser?.role,
          )
        ) {
          throw superAdminDataError();
        }

        const updated =
          await pharmacyDataService.updateSettings(
            data,
          );

        setSettings(updated);

        return updated;
      },
      [currentUser?.role],
    );

  return {
    drugs,
    patients,
    suppliers,
    transactions,
    adjustments,
    settings,

    isLoading,
    error,

    refresh,
    refreshDrugs,
    refreshPatients,
    refreshSuppliers,
    refreshTransactions,
    refreshAdjustments,
    refreshSettings,

    createDrug,
    updateDrug,
    deleteDrug,

    createPatient,
    updatePatient,
    deletePatient,

    createSupplier,
    updateSupplier,
    deleteSupplier,

    createTransaction,
    createAdjustment,

    receiveStock,

    updateSettings,

    clearError,
  };
}

export default usePharmacyData;