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

type AppRole = "ADMIN" | "PHARMACIST" | "CLINICIAN";

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

  createDrug: (data: Partial<Drug>) => Promise<Drug>;
  updateDrug: (id: string, data: Partial<Drug>) => Promise<Drug>;
  deleteDrug: (id: string) => Promise<void>;

  createPatient: (
    data: Partial<PatientRecord>,
  ) => Promise<PatientRecord>;

  updatePatient: (
    id: string,
    data: Partial<PatientRecord>,
  ) => Promise<PatientRecord>;

  deletePatient: (id: string) => Promise<void>;

  createSupplier: (
    data: Partial<Supplier>,
  ) => Promise<Supplier>;

  updateSupplier: (
    id: string,
    data: Partial<Supplier>,
  ) => Promise<Supplier>;

  deleteSupplier: (id: string) => Promise<void>;

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
    .toUpperCase();

  if (
    normalized === "ADMIN" ||
    normalized === "PHARMACIST" ||
    normalized === "CLINICIAN"
  ) {
    return normalized;
  }

  return null;
};

const canAccessDrugs = (
  role: AppRole,
): boolean =>
  role === "ADMIN" ||
  role === "PHARMACIST";

const canAccessSuppliers = (
  role: AppRole,
): boolean =>
  role === "ADMIN" ||
  role === "PHARMACIST";

const canAccessAdjustments = (
  role: AppRole,
): boolean =>
  role === "ADMIN" ||
  role === "PHARMACIST";

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
      const data =
        await pharmacyDataService.getDrugs();

      setDrugs(data);
    }, []);

  const refreshPatients =
    useCallback(async () => {
      const data =
        await pharmacyDataService.getPatients();

      setPatients(data);
    }, []);

  const refreshSuppliers =
    useCallback(async () => {
      const data =
        await pharmacyDataService.getSuppliers();

      setSuppliers(data);
    }, []);

  const refreshTransactions =
    useCallback(async () => {
      const data =
        await pharmacyDataService.getTransactions();

      setTransactions(data);
    }, []);

  const refreshAdjustments =
    useCallback(async () => {
      const data =
        await pharmacyDataService.getStockAdjustments();

      setAdjustments(data);
    }, []);

  const refreshSettings =
    useCallback(async () => {
      const data =
        await pharmacyDataService.getSettings();

      setSettings(data);
    }, []);

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
        const created =
          await pharmacyDataService.createDrug(
            data,
          );

        await refreshDrugs();

        return created;
      },
      [refreshDrugs],
    );

  const updateDrug =
    useCallback(
      async (
        id: string,
        data: Partial<Drug>,
      ) => {
        const updated =
          await pharmacyDataService.updateDrug(
            id,
            data,
          );

        await refreshDrugs();

        return updated;
      },
      [refreshDrugs],
    );

  const deleteDrug =
    useCallback(
      async (id: string) => {
        await pharmacyDataService.deleteDrug(
          id,
        );

        await refreshDrugs();
      },
      [refreshDrugs],
    );

  const createPatient =
    useCallback(
      async (
        data: Partial<PatientRecord>,
      ) => {
        const created =
          await pharmacyDataService.createPatient(
            data,
          );

        await refreshPatients();

        return created;
      },
      [refreshPatients],
    );

  const updatePatient =
    useCallback(
      async (
        id: string,
        data: Partial<PatientRecord>,
      ) => {
        const updated =
          await pharmacyDataService.updatePatient(
            id,
            data,
          );

        await refreshPatients();

        return updated;
      },
      [refreshPatients],
    );

  const deletePatient =
    useCallback(
      async (id: string) => {
        await pharmacyDataService.deletePatient(
          id,
        );

        await refreshPatients();
      },
      [refreshPatients],
    );

  const createSupplier =
    useCallback(
      async (
        data: Partial<Supplier>,
      ) => {
        const created =
          await pharmacyDataService.createSupplier(
            data,
          );

        await refreshSuppliers();

        return created;
      },
      [refreshSuppliers],
    );

  const updateSupplier =
    useCallback(
      async (
        id: string,
        data: Partial<Supplier>,
      ) => {
        const updated =
          await pharmacyDataService.updateSupplier(
            id,
            data,
          );

        await refreshSuppliers();

        return updated;
      },
      [refreshSuppliers],
    );

  const deleteSupplier =
    useCallback(
      async (id: string) => {
        await pharmacyDataService.deleteSupplier(
          id,
        );

        await refreshSuppliers();
      },
      [refreshSuppliers],
    );

  const createTransaction =
    useCallback(
      async (
        data: Partial<DispenseTransaction>,
      ) => {
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
      [refreshDrugs],
    );

  const updateSettings =
    useCallback(
      async (
        data: Partial<PharmacySettings>,
      ) => {
        const updated =
          await pharmacyDataService.updateSettings(
            data,
          );

        setSettings(updated);

        return updated;
      },
      [],
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