import { api } from "./api";
import type { StockAdjustment } from "../types";

export interface CreateStockAdjustmentInput {
  productId: string;
  batchId: string;
  quantityDelta: number;
  type: StockAdjustment["type"];
  reason: string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
}

interface BackendProductSummary {
  id: string;
  code?: string;
  name: string;
  genericName?: string;
  unit?: string;
}

interface BackendBatchSummary {
  id: string;
  batchNo: string;
  expiryDate: string;
  qty: number;
  buyingPrice?: number | string;
  sellingPrice?: number | string;
  status?: string;
}

interface BackendUserSummary {
  id: string;
  name: string;
  email: string;
}

interface BackendStockAdjustment {
  id: string;
  date: string;

  /**
   * Legacy compatibility fields.
   */
  drugId?: string | null;
  drugName?: string | null;
  batchNo?: string | null;

  /**
   * New batch-based inventory fields.
   */
  productId?: string | null;
  batchId?: string | null;
  previousQty: number;
  adjustedQty: number;
  quantityDelta?: number | null;

  type:
    | "LOSS_DAMAGE"
    | "EXPIRY_REMOVAL"
    | "AUDIT_RECONCILIATION"
    | "RETURN_TO_SUPPLIER";

  reason: string;
  notes?: string | null;

  adjustedBy: string;
  userId?: string | null;
  organizationId?: string | null;

  referenceType?: string | null;
  referenceId?: string | null;

  createdAt?: string;

  Product?: BackendProductSummary | null;
  Batch?: BackendBatchSummary | null;
  User?: BackendUserSummary | null;
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
): StockAdjustment => {
  const productId =
    adjustment.productId ??
    adjustment.Product?.id ??
    undefined;

  const batchId =
    adjustment.batchId ??
    adjustment.Batch?.id ??
    undefined;

  const productName =
    adjustment.Product?.name ??
    adjustment.drugName ??
    "";

  const batchNo =
    adjustment.Batch?.batchNo ??
    adjustment.batchNo ??
    "";

  const quantityDelta =
    adjustment.quantityDelta ??
    adjustment.adjustedQty -
      adjustment.previousQty;

  return {
    id: adjustment.id,

    date: adjustment.date
      ? new Date(
          adjustment.date,
        ).toLocaleString("en-GB")
      : "",

    /**
     * New inventory architecture.
     */
    productId,
    batchId,
    productName,

    previousQty:
      adjustment.previousQty,

    adjustedQty:
      adjustment.adjustedQty,

    resultingQty:
      adjustment.adjustedQty,

    quantityDelta,

    type:
      adjustmentTypeFromApi(
        adjustment.type,
      ),

    reason:
      adjustment.reason,

    notes:
      adjustment.notes ??
      undefined,

    adjustedBy:
      adjustment.User?.name ??
      adjustment.adjustedBy,

    userId:
      adjustment.userId ??
      adjustment.User?.id ??
      undefined,

    organizationId:
      adjustment.organizationId ??
      undefined,

    referenceType:
      adjustment.referenceType ??
      undefined,

    referenceId:
      adjustment.referenceId ??
      undefined,

    /**
     * Legacy-compatible fields retained so
     * existing consumers do not immediately break.
     */
    drugId:
      adjustment.drugId ??
      productId ??
      "",

    drugName:
      productName,

    batchNo,
  };
};

export const stockAdjustmentsService = {
  async list(): Promise<
    StockAdjustment[]
  > {
    const response =
      await api.get<
        BackendStockAdjustment[]
      >(
        "/stock-adjustments",
      );

    return Array.isArray(
      response.data,
    )
      ? response.data.map(
          mapAdjustment,
        )
      : [];
  },

  async create(
    input: CreateStockAdjustmentInput,
  ): Promise<StockAdjustment> {
    const response =
      await api.post<
        BackendStockAdjustment
      >(
        "/stock-adjustments",
        {
          productId:
            input.productId,

          batchId:
            input.batchId,

          quantityDelta:
            input.quantityDelta,

          type:
            adjustmentTypeToApi(
              input.type,
            ),

          reason:
            input.reason,

          notes:
            input.notes,

          referenceType:
            input.referenceType,

          referenceId:
            input.referenceId,
        },
      );

    return mapAdjustment(
      response.data,
    );
  },
};

export default stockAdjustmentsService;