
import { api } from './api';
import type {
  DispenseTransaction,
  PrescriptionItem,
} from '../types';

export interface TransactionListResponse {
  transactions: DispenseTransaction[];
  total?: number;
}

export interface CreateTransactionInput {
  patientType: 'Walk-in Patient' | 'Registered Patient';
  patientId?: string;
  patientName: string;
  phone?: string;
  clinicianName: string;
  prescriptionDate?: string;
  diagnosis?: string;
  items: PrescriptionItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'M-Pesa';
  cashTendered?: number;
  changeAmount?: number;
  mpesaCode?: string;
}

function normaliseTransaction(
  transaction: DispenseTransaction,
): DispenseTransaction {
  return {
    ...transaction,
    items: Array.isArray(transaction.items)
      ? transaction.items
      : [],
    subtotal: Number(transaction.subtotal || 0),
    discount: Number(transaction.discount || 0),
    totalAmount: Number(transaction.totalAmount || 0),
    cashTendered:
      transaction.cashTendered !== undefined
        ? Number(transaction.cashTendered)
        : undefined,
    changeAmount:
      transaction.changeAmount !== undefined
        ? Number(transaction.changeAmount)
        : undefined,
  };
}

export const transactionService = {
  async list(): Promise<DispenseTransaction[]> {
    const response =
      await api.get<
        DispenseTransaction[] | TransactionListResponse
      >('/transactions');

    const data = response.data;

    if (Array.isArray(data)) {
      return data.map(normaliseTransaction);
    }

    return Array.isArray(data.transactions)
      ? data.transactions.map(normaliseTransaction)
      : [];
  },

  async get(
    id: string,
  ): Promise<DispenseTransaction> {
    if (!id.trim()) {
      throw new Error(
        'Transaction ID is required.',
      );
    }

    const response =
      await api.get<DispenseTransaction>(
        `/transactions/${encodeURIComponent(id)}`,
      );

    return normaliseTransaction(response.data);
  },

  async create(
    input: CreateTransactionInput,
  ): Promise<DispenseTransaction> {
    if (!input.patientName.trim()) {
      throw new Error(
        'Patient name is required.',
      );
    }

    if (!input.clinicianName.trim()) {
      throw new Error(
        'Clinician name is required.',
      );
    }

    if (!input.items.length) {
      throw new Error(
        'At least one medicine must be included.',
      );
    }

    if (input.totalAmount < 0) {
      throw new Error(
        'Transaction amount cannot be negative.',
      );
    }

    if (
      input.paymentMethod === 'Cash' &&
      (input.cashTendered === undefined ||
        input.cashTendered < input.totalAmount)
    ) {
      throw new Error(
        'Cash tendered must cover the transaction total.',
      );
    }

    if (
      input.paymentMethod === 'M-Pesa' &&
      !input.mpesaCode?.trim()
    ) {
      throw new Error(
        'M-Pesa transaction code is required.',
      );
    }

    const response =
      await api.post<DispenseTransaction>(
        '/transactions',
        input,
      );

    return normaliseTransaction(response.data);
  },

  async cancel(
    id: string,
  ): Promise<DispenseTransaction> {
    if (!id.trim()) {
      throw new Error(
        'Transaction ID is required.',
      );
    }

    const response =
      await api.patch<DispenseTransaction>(
        `/transactions/${encodeURIComponent(id)}/cancel`,
      );

    return normaliseTransaction(response.data);
  },
};

export default transactionService;
