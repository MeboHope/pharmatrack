
import { api } from "./api";
import type {
  Drug,
  PharmacySettings,
  StockAdjustment,
} from "../types";

export interface CreateStockAdjustmentInput {
  drugId: string;
  adjustedQty: number;
  type: StockAdjustment["type"];
  reason: string;
}

interface BackendStockAdjustment {
  id: string;
  date: string;
  drugId: string;
  drugName: string;
  batchNo: string;
  previousQty: number;
  adjustedQty: number;
  type:
    | "LOSS_DAMAGE"
    | "EXPIRY_REMOVAL"
    | "AUDIT_RECONCILIATION"
    | "RETURN_TO_SUPPLIER";
  reason: string;
  adjustedBy: string;
  userId?: string | null;
  createdAt?: string;
}

const adjustmentTypeToApi = (
  type: StockAdjustment["type"],
): BackendStockAdjustment["type"] => {
  switch (type) {
    case "Loss / Damage":
      return "LOSS_DAMAGE";

    case "Expiry Removal":
      return "EXPIRY_REMOVAL";

    case "Audit Reconciliation":
      return "AUDIT_RECONCILIATION";

    case "Return to Supplier":
      return "RETURN_TO_SUPPLIER";

    default:
      return "AUDIT_RECONCILIATION";
  }
};

const adjustmentTypeFromApi = (
  type: BackendStockAdjustment["type"],
): StockAdjustment["type"] => {
  switch (type) {
    case "LOSS_DAMAGE":
      return "Loss / Damage";

    case "EXPIRY_REMOVAL":
      return "Expiry Removal";

    case "AUDIT_RECONCILIATION":
      return "Audit Reconciliation";

    case "RETURN_TO_SUPPLIER":
      return "Return to Supplier";

    default:
      return "Audit Reconciliation";
  }
};

const mapAdjustment = (
  adjustment: BackendStockAdjustment,
): StockAdjustment => ({
  id: adjustment.id,
  date: adjustment.date
    ? new Date(adjustment.date).toLocaleString("en-GB")
    : "",
  drugId: adjustment.drugId,
  drugName: adjustment.drugName,
  batchNo: adjustment.batchNo,
  previousQty: adjustment.previousQty,
  adjustedQty: adjustment.adjustedQty,
  type: adjustmentTypeFromApi(adjustment.type),
  reason: adjustment.reason,
  adjustedBy: adjustment.adjustedBy,
});

export const stockAdjustmentsService = {
  async list(): Promise<StockAdjustment[]> {
    const response =
      await api.get<BackendStockAdjustment[]>(
        "/stock-adjustments",
      );

    return Array.isArray(response.data)
      ? response.data.map(mapAdjustment)
      : [];
  },

  async create(
    input: CreateStockAdjustmentInput,
  ): Promise<StockAdjustment> {
    const response =
      await api.post<BackendStockAdjustment>(
        "/stock-adjustments",
        {
          drugId: input.drugId,
          adjustedQty: input.adjustedQty,
          type: adjustmentTypeToApi(input.type),
          reason: input.reason,
        },
      );

    return mapAdjustment(response.data);
  },
};

export default stockAdjustmentsService;
