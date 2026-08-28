
import type { Drug } from "../types";

import {
  apiGet,
  apiPost,
  apiPut,
} from "./api";

/**
 * Backend representation of a Drug.
 *
 * Prisma Decimal values are commonly returned by
 * the API as numbers or strings, so the service
 * normalizes them before returning Drug objects
 * to the React application.
 */
export interface BackendDrug {
  id: string;
  code: string;
  name: string;
  genericName: string;
  category: string;
  formulation: string;
  batchNo: string;
  manufactureDate?: string | null;
  expiryDate: string;
  qty: number;
  unit: string;
  buyingPrice: number | string;
  sellingPrice: number | string;
  markupPercent: number | string;
  status:
    | "IN_STOCK"
    | "LOW_STOCK"
    | "EXPIRED"
    | "OUT_OF_STOCK";
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDrugInput {
  code: string;
  name: string;
  genericName: string;
  category: string;
  formulation: string;
  batchNo: string;
  manufactureDate?: string;
  expiryDate: string;
  qty: number;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  markupPercent?: number;
  status?: string;
  notes?: string;
}

export interface UpdateDrugInput {
  code?: string;
  name?: string;
  genericName?: string;
  category?: string;
  formulation?: string;
  batchNo?: string;
  manufactureDate?: string;
  expiryDate?: string;
  qty?: number;
  unit?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  markupPercent?: number;
  status?: string;
  notes?: string;
}

export interface ReceiveStockInput {
  quantity: number;
  invoiceNo?: string;
  buyingPrice?: number;
}

const toNumber = (
  value: number | string | null | undefined,
): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const toDrug = (
  drug: BackendDrug,
): Drug => {
  const statusMap = {
    IN_STOCK: "In Stock",
    LOW_STOCK: "Low Stock",
    EXPIRED: "Expired",
    OUT_OF_STOCK: "Out of Stock",
  } as const;

  return {
    id: drug.id,
    code: drug.code,
    name: drug.name,
    genericName: drug.genericName,
    category: drug.category as Drug["category"],
    formulation:
      drug.formulation as Drug["formulation"],
    batchNo: drug.batchNo,
    manufactureDate:
      drug.manufactureDate ??
      undefined,
    expiryDate: drug.expiryDate,
    qty: toNumber(drug.qty),
    unit: drug.unit,
    buyingPrice: toNumber(
      drug.buyingPrice,
    ),
    sellingPrice: toNumber(
      drug.sellingPrice,
    ),
    markupPercent: toNumber(
      drug.markupPercent,
    ),
    status: statusMap[drug.status],
    notes:
      drug.notes ?? undefined,
    createdAt: drug.createdAt,
  };
};

export const inventoryService = {
  /**
   * Get all drugs from PostgreSQL.
   */
  async list(): Promise<Drug[]> {
    const drugs =
      await apiGet<BackendDrug[]>(
        "/drugs",
      );

    return drugs.map(toDrug);
  },

  /**
   * Get one drug by ID.
   */
  async getById(
    id: string,
  ): Promise<Drug> {
    const drug =
      await apiGet<BackendDrug>(
        `/drugs/${id}`,
      );

    return toDrug(drug);
  },

  /**
   * Create a new drug.
   */
  async create(
    input: CreateDrugInput,
  ): Promise<Drug> {
    const drug =
      await apiPost<BackendDrug>(
        "/drugs",
        input,
      );

    return toDrug(drug);
  },

  /**
   * Update an existing drug.
   */
  async update(
    id: string,
    input: UpdateDrugInput,
  ): Promise<Drug> {
    const drug =
      await apiPut<BackendDrug>(
        `/drugs/${id}`,
        input,
      );

    return toDrug(drug);
  },

  /**
   * Receive additional stock for an
   * existing drug.
   *
   * The backend should perform the stock
   * update transactionally.
   */
  async receiveStock(
    id: string,
    input: ReceiveStockInput,
  ): Promise<Drug> {
    const drug =
      await apiPost<BackendDrug>(
        `/drugs/${id}/receive`,
        input,
      );

    return toDrug(drug);
  },
};

export const listDrugs =
  inventoryService.list;

export const getDrug =
  inventoryService.getById;

export const createDrug =
  inventoryService.create;

export const updateDrug =
  inventoryService.update;

export const receiveStock =
  inventoryService.receiveStock;

export default inventoryService;