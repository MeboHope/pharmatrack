
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  Drug,
  PatientRecord,
  Supplier,
  DispenseTransaction,
  StockAdjustment,
  PharmacySettings,
} from "../types";

import {
  pharmacyDataService,
} from "../services/pharmacyData";

interface UsePharmacyDataResult {
  drugs: Drug[];
  patients: PatientRecord[];
  suppliers: Supplier[];
  transactions: DispenseTransaction[];
  adjustments: StockAdjustment[];
  settings: PharmacySettings | null;

  isLoading: boolean;
  error: string;

  refresh: () => Promise<void>;

  refreshDrugs: () => Promise<void>;
  refreshPatients: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAdjustments: () => Promise<void>;
  refreshSettings: () => Promise<void>;

  createDrug: (
    input: Partial<Drug>,
  ) => Promise<Drug>;

  updateDrug: (
    id: string,
    input: Partial<Drug>,
  ) => Promise<Drug>;

  deleteDrug: (
    id: string,
  ) => Promise<void>;

  receiveStock: (input: {
    drugId: string;
    qtyReceived: number;
    invoiceNo?: string;
    buyingPrice?: number;
  }) => Promise<Drug>;

  createPatient: (
    input: Partial<PatientRecord>,
  ) => Promise<PatientRecord>;

  updatePatient: (
    id: string,
    input: Partial<PatientRecord>,
  ) => Promise<PatientRecord>;

  deletePatient: (
    id: string,
  ) => Promise<void>;

  createSupplier: (
    input: Partial<Supplier>,
  ) => Promise<Supplier>;

  updateSupplier: (
    id: string,
    input: Partial<Supplier>,
  ) => Promise<Supplier>;

  deleteSupplier: (
    id: string,
  ) => Promise<void>;

  createAdjustment: (
    input: Partial<StockAdjustment>,
  ) => Promise<StockAdjustment>;

  createTransaction: (
    input: Partial<DispenseTransaction>,
  ) => Promise<DispenseTransaction>;

  updateSettings: (
    input: Partial<PharmacySettings>,
  ) => Promise<PharmacySettings>;

  clearError: () => void;
}

export function usePharmacyData(): UsePharmacyDataResult {
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
    useState("");

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const refreshDrugs = useCallback(
    async () => {
      const data =
        await pharmacyDataService.getDrugs();

      setDrugs(data);
    },
    [],
  );

  const refreshPatients = useCallback(
    async () => {
      const data =
        await pharmacyDataService.getPatients();

      setPatients(data);
    },
    [],
  );

  const refreshSuppliers = useCallback(
    async () => {
      const data =
        await pharmacyDataService.getSuppliers();

      setSuppliers(data);
    },
    [],
  );

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

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [
        drugsData,
        patientsData,
        suppliersData,
        transactionsData,
        adjustmentsData,
        settingsData,
      ] = await Promise.all([
        pharmacyDataService.getDrugs(),
        pharmacyDataService.getPatients(),
        pharmacyDataService.getSuppliers(),
        pharmacyDataService.getTransactions(),
        pharmacyDataService.getStockAdjustments(),
        pharmacyDataService.getSettings(),
      ]);

      setDrugs(drugsData);
      setPatients(patientsData);
      setSuppliers(suppliersData);
      setTransactions(transactionsData);
      setAdjustments(adjustmentsData);
      setSettings(settingsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load pharmacy data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDrug = useCallback(
    async (
      input: Partial<Drug>,
    ) => {
      const created =
        await pharmacyDataService.createDrug(
          input,
        );

      setDrugs((previous) => [
        created,
        ...previous,
      ]);

      return created;
    },
    [],
  );

  const updateDrug = useCallback(
    async (
      id: string,
      input: Partial<Drug>,
    ) => {
      const updated =
        await pharmacyDataService.updateDrug(
          id,
          input,
        );

      setDrugs((previous) =>
        previous.map((drug) =>
          drug.id === id
            ? updated
            : drug,
        ),
      );

      return updated;
    },
    [],
  );

  const deleteDrug = useCallback(
    async (id: string) => {
      await pharmacyDataService.deleteDrug(
        id,
      );

      setDrugs((previous) =>
        previous.filter(
          (drug) => drug.id !== id,
        ),
      );
    },
    [],
  );

  const receiveStock = useCallback(
    async (input: {
      drugId: string;
      qtyReceived: number;
      invoiceNo?: string;
      buyingPrice?: number;
    }): Promise<Drug> => {
      const result =
        await pharmacyDataService.receiveStock(
          input,
        );

      await refreshDrugs();

      return result.drug;
    },
    [refreshDrugs],
  );

  const createPatient = useCallback(
    async (
      input: Partial<PatientRecord>,
    ) => {
      const created =
        await pharmacyDataService.createPatient(
          input,
        );

      setPatients((previous) => [
        created,
        ...previous,
      ]);

      return created;
    },
    [],
  );

  const updatePatient = useCallback(
    async (
      id: string,
      input: Partial<PatientRecord>,
    ) => {
      const updated =
        await pharmacyDataService.updatePatient(
          id,
          input,
        );

      setPatients((previous) =>
        previous.map((patient) =>
          patient.id === id
            ? updated
            : patient,
        ),
      );

      return updated;
    },
    [],
  );

  const deletePatient = useCallback(
    async (id: string) => {
      await pharmacyDataService.deletePatient(
        id,
      );

      setPatients((previous) =>
        previous.filter(
          (patient) => patient.id !== id,
        ),
      );
    },
    [],
  );

  const createSupplier = useCallback(
    async (
      input: Partial<Supplier>,
    ) => {
      const created =
        await pharmacyDataService.createSupplier(
          input,
        );

      setSuppliers((previous) => [
        created,
        ...previous,
      ]);

      return created;
    },
    [],
  );

  const updateSupplier = useCallback(
    async (
      id: string,
      input: Partial<Supplier>,
    ) => {
      const updated =
        await pharmacyDataService.updateSupplier(
          id,
          input,
        );

      setSuppliers((previous) =>
        previous.map((supplier) =>
          supplier.id === id
            ? updated
            : supplier,
        ),
      );

      return updated;
    },
    [],
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      await pharmacyDataService.deleteSupplier(
        id,
      );

      setSuppliers((previous) =>
        previous.filter(
          (supplier) =>
            supplier.id !== id,
        ),
      );
    },
    [],
  );

  const createAdjustment =
    useCallback(
      async (
        input: Partial<StockAdjustment>,
      ) => {
        const created =
          await pharmacyDataService.createStockAdjustment(
            input,
          );

        setAdjustments((previous) => [
          created,
          ...previous,
        ]);

        await refreshDrugs();

        return created;
      },
      [refreshDrugs],
    );

  const createTransaction =
    useCallback(
      async (
        input: Partial<DispenseTransaction>,
      ) => {
        const created =
          await pharmacyDataService.createTransaction(
            input,
          );

        setTransactions((previous) => [
          created,
          ...previous,
        ]);

        await Promise.all([
          refreshDrugs(),
          refreshPatients(),
        ]);

        return created;
      },
      [
        refreshDrugs,
        refreshPatients,
      ],
    );

  const updateSettings =
    useCallback(
      async (
        input: Partial<PharmacySettings>,
      ) => {
        const updated =
          await pharmacyDataService.updateSettings(
            input,
          );

        setSettings(updated);

        return updated;
      },
      [],
    );

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

    receiveStock,

    createPatient,
    updatePatient,
    deletePatient,

    createSupplier,
    updateSupplier,
    deleteSupplier,

    createAdjustment,
    createTransaction,

    updateSettings,

    clearError,
  };
}

export default usePharmacyData;
