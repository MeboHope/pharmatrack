import {
  DispenseTransaction,
  Drug,
  DrugCategory,
  DrugFormulation,
  PatientRecord,
  PharmacySettings,
  PrescriptionItem,
  StockAdjustment,
  Supplier,
} from '../types';
import { supabase } from './supabase';

/**
 * Data access layer for PharmaTrack. Every table is shared across the pharmacy,
 * so rows are keyed by the same human readable ids the UI generates
 * (DRG-0001, PAT-001, TXN-0001 ...) rather than per-user ids.
 */

const SETTINGS_ROW_ID = 1;

interface DrugRow {
  id: string;
  code: string;
  name: string;
  generic_name: string;
  category: string;
  formulation: string;
  batch_no: string;
  manufacture_date: string | null;
  expiry_date: string;
  qty: number;
  unit: string;
  buying_price: number;
  selling_price: number;
  markup_percent: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface PatientRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  allergies: string | null;
  total_visits: number;
  created_at: string;
}

interface SupplierRow {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  lead_time_days: number;
}

interface TransactionRow {
  id: string;
  date: string;
  patient_type: string;
  patient_name: string;
  phone: string | null;
  clinician_name: string;
  prescription_date: string | null;
  diagnosis: string | null;
  items: PrescriptionItem[];
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: string;
  cash_tendered: number | null;
  change_amount: number | null;
  mpesa_code: string | null;
  status: string;
}

interface AdjustmentRow {
  id: string;
  date: string;
  drug_id: string;
  drug_name: string;
  batch_no: string;
  previous_qty: number;
  adjusted_qty: number;
  type: string;
  reason: string;
  adjusted_by: string;
}

interface SettingsRow {
  id: number;
  pharmacy_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  clinician_name: string;
  expiry_alert_days: number;
  reorder_alert_level: number;
  logo_url: string | null;
}

const toDrug = (row: DrugRow): Drug => ({
  id: row.id,
  code: row.code,
  name: row.name,
  genericName: row.generic_name,
  category: row.category as DrugCategory,
  formulation: row.formulation as DrugFormulation,
  batchNo: row.batch_no,
  manufactureDate: row.manufacture_date ?? undefined,
  expiryDate: row.expiry_date,
  qty: Number(row.qty),
  unit: row.unit,
  buyingPrice: Number(row.buying_price),
  sellingPrice: Number(row.selling_price),
  markupPercent: Number(row.markup_percent),
  status: row.status as Drug['status'],
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
});

const fromDrug = (drug: Drug): DrugRow => ({
  id: drug.id,
  code: drug.code,
  name: drug.name,
  generic_name: drug.genericName,
  category: drug.category,
  formulation: drug.formulation,
  batch_no: drug.batchNo,
  manufacture_date: drug.manufactureDate ?? null,
  expiry_date: drug.expiryDate,
  qty: drug.qty,
  unit: drug.unit,
  buying_price: drug.buyingPrice,
  selling_price: drug.sellingPrice,
  markup_percent: drug.markupPercent,
  status: drug.status,
  notes: drug.notes ?? null,
  created_at: drug.createdAt,
});

const toPatient = (row: PatientRow): PatientRecord => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email ?? undefined,
  age: row.age ?? undefined,
  gender: (row.gender as PatientRecord['gender']) ?? undefined,
  address: row.address ?? undefined,
  allergies: row.allergies ?? undefined,
  totalVisits: row.total_visits,
  createdAt: row.created_at,
});

const fromPatient = (patient: PatientRecord): PatientRow => ({
  id: patient.id,
  name: patient.name,
  phone: patient.phone,
  email: patient.email ?? null,
  age: patient.age ?? null,
  gender: patient.gender ?? null,
  address: patient.address ?? null,
  allergies: patient.allergies ?? null,
  total_visits: patient.totalVisits,
  created_at: patient.createdAt,
});

const toSupplier = (row: SupplierRow): Supplier => ({
  id: row.id,
  name: row.name,
  contactPerson: row.contact_person,
  phone: row.phone,
  email: row.email,
  address: row.address,
  leadTimeDays: row.lead_time_days,
});

const fromSupplier = (supplier: Supplier): SupplierRow => ({
  id: supplier.id,
  name: supplier.name,
  contact_person: supplier.contactPerson,
  phone: supplier.phone,
  email: supplier.email,
  address: supplier.address,
  lead_time_days: supplier.leadTimeDays,
});

const toTransaction = (row: TransactionRow): DispenseTransaction => ({
  id: row.id,
  date: row.date,
  patientType: row.patient_type as DispenseTransaction['patientType'],
  patientName: row.patient_name,
  phone: row.phone ?? undefined,
  clinicianName: row.clinician_name,
  prescriptionDate: row.prescription_date ?? undefined,
  diagnosis: row.diagnosis ?? undefined,
  items: row.items ?? [],
  subtotal: Number(row.subtotal),
  discount: Number(row.discount),
  totalAmount: Number(row.total_amount),
  paymentMethod: row.payment_method as DispenseTransaction['paymentMethod'],
  cashTendered: row.cash_tendered ?? undefined,
  changeAmount: row.change_amount ?? undefined,
  mpesaCode: row.mpesa_code ?? undefined,
  status: row.status as DispenseTransaction['status'],
});

const fromTransaction = (txn: DispenseTransaction): TransactionRow => ({
  id: txn.id,
  date: txn.date,
  patient_type: txn.patientType,
  patient_name: txn.patientName,
  phone: txn.phone ?? null,
  clinician_name: txn.clinicianName,
  prescription_date: txn.prescriptionDate ?? null,
  diagnosis: txn.diagnosis ?? null,
  items: txn.items,
  subtotal: txn.subtotal,
  discount: txn.discount,
  total_amount: txn.totalAmount,
  payment_method: txn.paymentMethod,
  cash_tendered: txn.cashTendered ?? null,
  change_amount: txn.changeAmount ?? null,
  mpesa_code: txn.mpesaCode ?? null,
  status: txn.status,
});

const toAdjustment = (row: AdjustmentRow): StockAdjustment => ({
  id: row.id,
  date: row.date,
  drugId: row.drug_id,
  drugName: row.drug_name,
  batchNo: row.batch_no,
  previousQty: row.previous_qty,
  adjustedQty: row.adjusted_qty,
  type: row.type as StockAdjustment['type'],
  reason: row.reason,
  adjustedBy: row.adjusted_by,
});

const fromAdjustment = (adj: StockAdjustment): AdjustmentRow => ({
  id: adj.id,
  date: adj.date,
  drug_id: adj.drugId,
  drug_name: adj.drugName,
  batch_no: adj.batchNo,
  previous_qty: adj.previousQty,
  adjusted_qty: adj.adjustedQty,
  type: adj.type,
  reason: adj.reason,
  adjusted_by: adj.adjustedBy,
});

const toSettings = (row: SettingsRow): PharmacySettings => ({
  pharmacyName: row.pharmacy_name,
  tagline: row.tagline,
  address: row.address,
  phone: row.phone,
  email: row.email,
  currency: row.currency,
  clinicianName: row.clinician_name,
  expiryAlertDays: row.expiry_alert_days,
  reorderAlertLevel: row.reorder_alert_level,
  logoUrl: row.logo_url ?? undefined,
});

const fromSettings = (settings: PharmacySettings): SettingsRow => ({
  id: SETTINGS_ROW_ID,
  pharmacy_name: settings.pharmacyName,
  tagline: settings.tagline,
  address: settings.address,
  phone: settings.phone,
  email: settings.email,
  currency: settings.currency,
  clinician_name: settings.clinicianName,
  expiry_alert_days: settings.expiryAlertDays,
  reorder_alert_level: settings.reorderAlertLevel,
  logo_url: settings.logoUrl ?? null,
});

const unwrap = <T,>(data: T | null, error: { message: string } | null, context: string): T => {
  if (error) throw new Error(`${context}: ${error.message}`);
  if (data === null) throw new Error(`${context}: no data returned`);
  return data;
};

export interface PharmacyData {
  drugs: Drug[];
  patients: PatientRecord[];
  suppliers: Supplier[];
  transactions: DispenseTransaction[];
  adjustments: StockAdjustment[];
  settings: PharmacySettings | null;
}

export const fetchAllData = async (): Promise<PharmacyData> => {
  const [drugsRes, patientsRes, suppliersRes, txnRes, adjRes, settingsRes] = await Promise.all([
    supabase.from('drugs').select('*').order('created_at', { ascending: false }),
    supabase.from('patients').select('*').order('created_at', { ascending: true }),
    supabase.from('suppliers').select('*').order('name', { ascending: true }),
    supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('stock_adjustments').select('*').order('created_at', { ascending: false }),
    supabase.from('pharmacy_settings').select('*').eq('id', SETTINGS_ROW_ID).maybeSingle(),
  ]);

  return {
    drugs: unwrap(drugsRes.data, drugsRes.error, 'Loading drugs').map(toDrug),
    patients: unwrap(patientsRes.data, patientsRes.error, 'Loading patients').map(toPatient),
    suppliers: unwrap(suppliersRes.data, suppliersRes.error, 'Loading suppliers').map(toSupplier),
    transactions: unwrap(txnRes.data, txnRes.error, 'Loading transactions').map(toTransaction),
    adjustments: unwrap(adjRes.data, adjRes.error, 'Loading stock adjustments').map(toAdjustment),
    settings: settingsRes.error
      ? (() => {
          throw new Error(`Loading settings: ${settingsRes.error.message}`);
        })()
      : settingsRes.data
        ? toSettings(settingsRes.data as SettingsRow)
        : null,
  };
};

export const saveDrug = async (drug: Drug): Promise<void> => {
  const { error } = await supabase.from('drugs').upsert(fromDrug(drug));
  if (error) throw new Error(`Saving drug: ${error.message}`);
};

export const saveDrugs = async (drugs: Drug[]): Promise<void> => {
  if (drugs.length === 0) return;
  const { error } = await supabase.from('drugs').upsert(drugs.map(fromDrug));
  if (error) throw new Error(`Saving drugs: ${error.message}`);
};

export const savePatient = async (patient: PatientRecord): Promise<void> => {
  const { error } = await supabase.from('patients').upsert(fromPatient(patient));
  if (error) throw new Error(`Saving patient: ${error.message}`);
};

export const saveSupplier = async (supplier: Supplier): Promise<void> => {
  const { error } = await supabase.from('suppliers').upsert(fromSupplier(supplier));
  if (error) throw new Error(`Saving supplier: ${error.message}`);
};

export const saveTransaction = async (txn: DispenseTransaction): Promise<void> => {
  const { error } = await supabase.from('transactions').upsert(fromTransaction(txn));
  if (error) throw new Error(`Saving transaction: ${error.message}`);
};

export const saveAdjustment = async (adj: StockAdjustment): Promise<void> => {
  const { error } = await supabase.from('stock_adjustments').upsert(fromAdjustment(adj));
  if (error) throw new Error(`Saving stock adjustment: ${error.message}`);
};

export const saveSettings = async (settings: PharmacySettings): Promise<void> => {
  const { error } = await supabase.from('pharmacy_settings').upsert(fromSettings(settings));
  if (error) throw new Error(`Saving settings: ${error.message}`);
};
