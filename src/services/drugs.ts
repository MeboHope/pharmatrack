import type { Drug } from "../types";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "./api";

export interface DrugInput {
  code: string;
  name: string;
  genericName: string;
  category: Drug["category"];
  formulation: Drug["formulation"];
  batchNo: string;
  manufactureDate?: string;
  expiryDate: string;
  qty: number;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  markupPercent: number;
  status?: Drug["status"];
  notes?: string;
}

export interface ReceiveStockInput {
  qtyReceived: number;
  invoiceNo?: string;
  buyingPrice?: number;
}

const toDrug = (value: any): Drug => {
  return {
    ...value,

    id: String(value.id),
    code: String(value.code),
    name: String(value.name),
    genericName: String(value.genericName),
    category: value.category,
    formulation: value.formulation,
    batchNo: String(value.batchNo),

    manufactureDate:
      value.manufactureDate
        ? new Date(value.manufactureDate)
            .toISOString()
            .slice(0, 10)
        : undefined,

    expiryDate:
      value.expiryDate
        ? new Date(value.expiryDate)
            .toISOString()
            .slice(0, 10)
        : "",

    qty: Number(value.qty ?? 0),
    unit: String(value.unit),

    buyingPrice: Number(
      value.buyingPrice ?? 0,
    ),

    sellingPrice: Number(
      value.sellingPrice ?? 0,
    ),

    markupPercent: Number(
      value.markupPercent ?? 0,
    ),

    status: value.status,

    notes:
      value.notes !== null &&
      value.notes !== undefined
        ? String(value.notes)
        : undefined,

    createdAt:
      value.createdAt
        ? new Date(value.createdAt)
            .toISOString()
            .slice(0, 10)
        : new Date()
            .toISOString()
            .slice(0, 10),
  };
};

export const drugsService = {
  async list(): Promise<Drug[]> {
    const data =
      await apiGet<any[]>("/drugs");

    return data.map(toDrug);
  },

  async getById(
    id: string,
  ): Promise<Drug> {
    const data =
      await apiGet<any>(
        `/drugs/${id}`,
      );

    return toDrug(data);
  },

  async create(
    input: DrugInput,
  ): Promise<Drug> {
    const data =
      await apiPost<any>(
        "/drugs",
        input,
      );

    return toDrug(data);
  },

  async update(
    id: string,
    input: Partial<DrugInput>,
  ): Promise<Drug> {
    const data =
      await apiPut<any>(
        `/drugs/${id}`,
        input,
      );

    return toDrug(data);
  },

  async remove(
    id: string,
  ): Promise<void> {
    await apiDelete(
      `/drugs/${id}`,
    );
  },

  async receiveStock(
    id: string,
    input: ReceiveStockInput,
  ): Promise<Drug> {
    const current =
      await this.getById(id);

    const newQty =
      current.qty +
      Number(input.qtyReceived);

    const buyingPrice =
      input.buyingPrice !== undefined
        ? Number(input.buyingPrice)
        : current.buyingPrice;

    const markup =
      buyingPrice > 0
        ? ((current.sellingPrice -
            buyingPrice) /
            buyingPrice) *
          100
        : current.markupPercent;

    const status =
      newQty === 0
        ? "Out of Stock"
        : newQty <= 10
          ? "Low Stock"
          : "In Stock";

    return this.update(id, {
      qty: newQty,
      buyingPrice,
      markupPercent: Number(
        markup.toFixed(1),
      ),
      status,
    });
  },
};

export default drugsService;