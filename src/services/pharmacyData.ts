
import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import type {
  Drug,
  PatientRecord,
  Supplier,
  DispenseTransaction,
  StockAdjustment,
  PharmacySettings,
} from "../types";

/*
 * Central frontend API service for operational
 * PharmaTrack data.
 *
 * PostgreSQL/backend is the source of truth.
 * Do not store these datasets in localStorage.
 */

export const pharmacyDataService = {
  // ---------------------------------------------------------
  // DRUGS
  // ---------------------------------------------------------

  async getDrugs(): Promise<Drug[]> {
    return apiGet<Drug[]>("/drugs");
  },

  async getDrug(id: string): Promise<Drug> {
    return apiGet<Drug>(`/drugs/${id}`);
  },

  async createDrug(
    input: Partial<Drug>,
  ): Promise<Drug> {
    return apiPost<Drug>("/drugs", input);
  },

  async updateDrug(
    id: string,
    input: Partial<Drug>,
  ): Promise<Drug> {
    return apiPut<Drug>(`/drugs/${id}`, input);
  },

  async deleteDrug(id: string): Promise<void> {
    await apiDelete<void>(`/drugs/${id}`);
  },

  // ---------------------------------------------------------
  // PATIENTS
  // ---------------------------------------------------------

  async getPatients(): Promise<PatientRecord[]> {
    return apiGet<PatientRecord[]>("/patients");
  },

  async getPatient(
    id: string,
  ): Promise<PatientRecord> {
    return apiGet<PatientRecord>(
      `/patients/${id}`,
    );
  },

  async createPatient(
    input: Partial<PatientRecord>,
  ): Promise<PatientRecord> {
    return apiPost<PatientRecord>(
      "/patients",
      input,
    );
  },

  async updatePatient(
    id: string,
    input: Partial<PatientRecord>,
  ): Promise<PatientRecord> {
    return apiPut<PatientRecord>(
      `/patients/${id}`,
      input,
    );
  },

  async deletePatient(id: string): Promise<void> {
    await apiDelete<void>(`/patients/${id}`);
  },

  // ---------------------------------------------------------
  // SUPPLIERS
  // ---------------------------------------------------------

  async getSuppliers(): Promise<Supplier[]> {
    return apiGet<Supplier[]>("/suppliers");
  },

  async getSupplier(
    id: string,
  ): Promise<Supplier> {
    return apiGet<Supplier>(
      `/suppliers/${id}`,
    );
  },

  async createSupplier(
    input: Partial<Supplier>,
  ): Promise<Supplier> {
    return apiPost<Supplier>(
      "/suppliers",
      input,
    );
  },

  async updateSupplier(
    id: string,
    input: Partial<Supplier>,
  ): Promise<Supplier> {
    return apiPut<Supplier>(
      `/suppliers/${id}`,
      input,
    );
  },

  async deleteSupplier(id: string): Promise<void> {
    await apiDelete<void>(
      `/suppliers/${id}`,
    );
  },

  // ---------------------------------------------------------
  // STOCK ADJUSTMENTS
  // ---------------------------------------------------------

  async getStockAdjustments(): Promise<
    StockAdjustment[]
  > {
    return apiGet<StockAdjustment[]>(
      "/stock-adjustments",
    );
  },

  async getStockAdjustment(
    id: string,
  ): Promise<StockAdjustment> {
    return apiGet<StockAdjustment>(
      `/stock-adjustments/${id}`,
    );
  },

  async createStockAdjustment(
    input: Partial<StockAdjustment>,
  ): Promise<StockAdjustment> {
    return apiPost<StockAdjustment>(
      "/stock-adjustments",
      input,
    );
  },

  // ---------------------------------------------------------
  // TRANSACTIONS / DISPENSING
  // ---------------------------------------------------------

  async getTransactions(): Promise<
    DispenseTransaction[]
  > {
    return apiGet<DispenseTransaction[]>(
      "/transactions",
    );
  },

  async getTransaction(
    id: string,
  ): Promise<DispenseTransaction> {
    return apiGet<DispenseTransaction>(
      `/transactions/${id}`,
    );
  },

  async createTransaction(
    input: Partial<DispenseTransaction>,
  ): Promise<DispenseTransaction> {
    return apiPost<DispenseTransaction>(
      "/transactions",
      input,
    );
  },

  // ---------------------------------------------------------
// STOCK RECEIVING
// ---------------------------------------------------------

async receiveStock(input: {
  drugId: string;
  qtyReceived: number;
  invoiceNo?: string;
  buyingPrice?: number;
}) {
  return apiPost<{
    drug: Drug;
    receiving: {
      invoiceNo: string;
      quantityReceived: number;
    };
  }>("/stock-receiving", input);
},
  // ---------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------

  async getSettings(): Promise<PharmacySettings> {
    return apiGet<PharmacySettings>(
      "/settings",
    );
  },

  async updateSettings(
    input: Partial<PharmacySettings>,
  ): Promise<PharmacySettings> {
    return apiPut<PharmacySettings>(
      "/settings",
      input,
    );
  },
};


export default pharmacyDataService;
