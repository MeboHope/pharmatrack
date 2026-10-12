import { api } from "./api";
import type {
  DispenseTransaction,
  HealthcareFrequency,
  HealthcareRoute,
  PrescriptionItem,
} from "../types";

export interface TransactionListResponse {
  transactions: DispenseTransaction[];
  total?: number;
}

/**
 * Product-based dispensing request.
 *
 * The client sends only the product and requested quantity.
 * Batch selection, pricing, subtotal, total and stock allocation
 * are authoritative on the server.
 */
export interface CreateDispenseItemInput {
  productId: string;
  qty: number;
  frequency: HealthcareFrequency;
  route: HealthcareRoute;
  duration: number;
  durationUnit: string;
  specialInstructions?: string;
}

export interface CreateTransactionInput {
  patientType:
    | "Walk-in Patient"
    | "Registered Patient";

  patientId?: string;

  patientName: string;

  phone?: string;

  /**
   * Registered clinician responsible for the prescription.
   *
   * The backend validates that this user:
   * - exists
   * - belongs to the current organization
   * - has the CLINICIAN organization role
   */
  clinicianId: string;

  prescriptionDate?: string;

  diagnosis?: string;

  items: CreateDispenseItemInput[];

  /**
   * Discount is the only monetary adjustment supplied by the client.
   * The server calculates subtotal and totalAmount from the allocated
   * DrugBatch selling prices.
   */
  discount: number;

  paymentMethod:
    | "Cash"
    | "M-Pesa";

  cashTendered?: number;

  mpesaCode?: string;
}

interface BackendDispenseAllocation {
  id?: string;
  productId?: string;
  batchId?: string;
  quantity?: number;
  unitPrice?: number | string;
  lineTotal?: number | string;

  batch?: {
    id?: string;
    batchNo?: string;
    expiryDate?: string;
    qty?: number;
  };

  Batch?: {
    id?: string;
    batchNo?: string;
    expiryDate?: string;
    qty?: number;
  };
}

interface BackendPrescriptionItem
  extends Partial<PrescriptionItem> {
  id?: string;

  productId?: string | null;

  allocations?: BackendDispenseAllocation[];

  Drug?: {
    id?: string;
    code?: string;
    name?: string;
  } | null;

  Product?: {
    id?: string;
    code?: string;
    name?: string;
  } | null;
}

interface BackendTransaction {
  id?: string;

  transactionNo?: string;

  date?: string;

  createdAt?: string;

  patientType?:
    | "WALK_IN"
    | "REGISTERED"
    | "Walk-in Patient"
    | "Registered Patient";

  patientId?: string | null;

  patientName?: string;

  phone?: string | null;

  clinicianId?: string | null;

  clinicianName?: string;

  prescriptionDate?: string | null;

  diagnosis?: string | null;

  items?: BackendPrescriptionItem[];

  PrescriptionItem?: BackendPrescriptionItem[];

  subtotal?: number | string | null;

  discount?: number | string | null;

  totalAmount?: number | string | null;

  paymentMethod?:
    | "CASH"
    | "MPESA"
    | "Cash"
    | "M-Pesa";

  cashTendered?: number | string | null;

  changeAmount?: number | string | null;

  mpesaCode?: string | null;

  status?:
    | "COMPLETED"
    | "CANCELLED"
    | "PENDING"
    | "Completed"
    | "Cancelled"
    | "Pending";
}

/**
 * Some transaction endpoints may return:
 *
 * {
 *   success: true,
 *   data: transaction
 * }
 *
 * Others may return:
 *
 * {
 *   success: true,
 *   data: {
 *     transaction
 *   }
 *
 * }
 *
 * This helper normalises both shapes.
 */
interface BackendTransactionContainer {
  transaction?: BackendTransaction;
  data?: BackendTransaction;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function toNumber(
  value:
    | number
    | string
    | null
    | undefined,
): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function normalisePatientType(
  value:
    | BackendTransaction["patientType"]
    | undefined,
): DispenseTransaction["patientType"] {
  switch (value) {
    case "REGISTERED":
    case "Registered Patient":
      return "Registered Patient";

    case "WALK_IN":
    case "Walk-in Patient":
    default:
      return "Walk-in Patient";
  }
}

function normalisePaymentMethod(
  value:
    | BackendTransaction["paymentMethod"]
    | undefined,
): DispenseTransaction["paymentMethod"] {
  switch (value) {
    case "MPESA":
    case "M-Pesa":
      return "M-Pesa";

    case "CASH":
    case "Cash":
    default:
      return "Cash";
  }
}

function normaliseStatus(
  value:
    | BackendTransaction["status"]
    | undefined,
): DispenseTransaction["status"] {
  switch (value) {
    case "CANCELLED":
    case "Cancelled":
      return "Cancelled";

    case "PENDING":
    case "Pending":
      return "Pending";

    case "COMPLETED":
    case "Completed":
    default:
      return "Completed";
  }
}

function normaliseFrequency(
  value: unknown,
): PrescriptionItem["frequency"] {
  switch (value) {
    case "BD_BID":
    case "BD / BID (Twice daily)":
      return "BD / BID (Twice daily)";

    case "TID":
    case "TID (Three times daily)":
      return "TID (Three times daily)";

    case "QID":
    case "QID (Four times daily)":
      return "QID (Four times daily)";

    case "STAT":
    case "STAT (Immediately)":
      return "STAT (Immediately)";

    case "PRN":
    case "PRN (As needed)":
      return "PRN (As needed)";

    case "Q4H":
    case "Q4H (Every 4 hours)":
      return "Q4H (Every 4 hours)";

    case "Q6H":
    case "Q6H (Every 6 hours)":
      return "Q6H (Every 6 hours)";

    case "Q8H":
    case "Q8H (Every 8 hours)":
      return "Q8H (Every 8 hours)";

    case "Q12H":
    case "Q12H (Every 12 hours)":
      return "Q12H (Every 12 hours)";

    case "ON":
    case "ON (At night)":
      return "ON (At night)";

    case "OD":
    case "OD (Once daily)":
    default:
      return "OD (Once daily)";
  }
}

function normaliseRoute(
  value: unknown,
): PrescriptionItem["route"] {
  switch (value) {
    case "TOPICAL":
    case "Topical":
      return "Topical";

    case "INTRAVENOUS":
    case "Intravenous (IV)":
      return "Intravenous (IV)";

    case "INTRAMUSCULAR":
    case "Intramuscular (IM)":
      return "Intramuscular (IM)";

    case "SUBCUTANEOUS":
    case "Subcutaneous":
      return "Subcutaneous";

    case "INHALATION":
    case "Inhalation":
      return "Inhalation";

    case "OPHTHALMIC":
    case "Ophthalmic":
      return "Ophthalmic";

    case "OTIC":
    case "Otic":
      return "Otic";

    case "RECTAL":
    case "Rectal":
      return "Rectal";

    case "SUBLINGUAL":
    case "Sublingual":
      return "Sublingual";

    case "ORAL":
    case "Oral":
    default:
      return "Oral";
  }
}

function normalisePrescriptionItem(
  item: BackendPrescriptionItem,
): PrescriptionItem {
  const allocations =
    Array.isArray(item.allocations)
      ? item.allocations
      : [];

  const firstAllocation =
    allocations[0];

  const firstBatch =
    firstAllocation?.batch ??
    firstAllocation?.Batch;

  const productCode =
    item.Product?.code ??
    item.drugCode ??
    "";

  const productName =
    item.Product?.name ??
    item.drugName ??
    "";

  const batchNo =
    firstBatch?.batchNo ??
    item.batchNo ??
    "";

  const expiryDate =
    firstBatch?.expiryDate ??
    item.expiryDate ??
    "";

  const quantity =
    Number(item.qty ?? 0);

  const allocationTotal =
    allocations.reduce(
      (sum, allocation) =>
        sum +
        toNumber(
          allocation.lineTotal,
        ),
      0,
    );

  const lineTotal =
    allocationTotal > 0
      ? allocationTotal
      : toNumber(item.lineTotal);

  const unitPrice =
    quantity > 0
      ? lineTotal / quantity
      : toNumber(
          firstAllocation?.unitPrice ??
            item.unitPrice,
        );

  return {
    drugId:
      item.drugId ??
      item.productId ??
      "",

    drugCode:
      productCode,

    drugName:
      productName,

    batchNo,

    expiryDate,

    availableQty:
      Number(
        item.availableQty ?? 0,
      ),

    qty:
      quantity,

    unitPrice,

    frequency:
      normaliseFrequency(
        item.frequency,
      ),

    route:
      normaliseRoute(
        item.route,
      ),

    duration:
      Number(
        item.duration ?? 0,
      ),

    durationUnit:
      item.durationUnit ??
      "Days",

    specialInstructions:
      item.specialInstructions ??
      undefined,

    lineTotal,
  };
}

function normaliseTransaction(
  transaction: BackendTransaction,
): DispenseTransaction {
  if (
    !transaction ||
    !transaction.id
  ) {
    throw new Error(
      "The server returned an invalid transaction record.",
    );
  }

  const rawItems =
    Array.isArray(
      transaction.items,
    )
      ? transaction.items
      : Array.isArray(
            transaction.PrescriptionItem,
          )
        ? transaction.PrescriptionItem
        : [];

  return {
    id:
      transaction.id,

    transactionNo:
      transaction.transactionNo ??
      transaction.id,

    date:
      transaction.date ??
      transaction.createdAt ??
      new Date().toISOString(),

    patientType:
      normalisePatientType(
        transaction.patientType,
      ),

    patientName:
      transaction.patientName ??
      "",

    phone:
      transaction.phone ??
      undefined,

    clinicianId:
      transaction.clinicianId ??
      undefined,

    clinicianName:
      transaction.clinicianName ??
      "",

    prescriptionDate:
      transaction.prescriptionDate ??
      undefined,

    diagnosis:
      transaction.diagnosis ??
      undefined,

    items:
      rawItems.map(
        normalisePrescriptionItem,
      ),

    subtotal:
      toNumber(
        transaction.subtotal,
      ),

    discount:
      toNumber(
        transaction.discount,
      ),

    totalAmount:
      toNumber(
        transaction.totalAmount,
      ),

    paymentMethod:
      normalisePaymentMethod(
        transaction.paymentMethod,
      ),

    cashTendered:
      transaction.cashTendered !==
        null &&
      transaction.cashTendered !==
        undefined
        ? toNumber(
            transaction.cashTendered,
          )
        : undefined,

    changeAmount:
      transaction.changeAmount !==
        null &&
      transaction.changeAmount !==
        undefined
        ? toNumber(
            transaction.changeAmount,
          )
        : undefined,

    mpesaCode:
      transaction.mpesaCode ??
      undefined,

    status:
      normaliseStatus(
        transaction.status,
      ),
  };
}

/**
 * Extract a transaction from the ApiEnvelope returned by api.ts.
 *
 * The normal expected response is:
 *
 * {
 *   success: true,
 *   data: transaction
 * }
 *
 * But this also safely handles:
 *
 * {
 *   success: true,
 *   data: {
 *     transaction: transaction
 *   }
 * }
 *
 * and a raw transaction response that has already been wrapped
 * by requestEnvelope().
 */
function extractTransaction(
  value: unknown,
): BackendTransaction {
  if (!value) {
    throw new Error(
      "The server completed the request but returned no transaction data.",
    );
  }

  if (!isRecord(value)) {
    throw new Error(
      "The server returned an invalid transaction response.",
    );
  }

  if (
    typeof value.id ===
    "string"
  ) {
    return value as unknown as BackendTransaction;
  }

  const container =
    value as BackendTransactionContainer;

  if (
    container.transaction &&
    isRecord(
      container.transaction,
    )
  ) {
    return container.transaction;
  }

  if (
    container.data &&
    isRecord(container.data)
  ) {
    if (
      typeof container.data.id ===
      "string"
    ) {
      return container.data;
    }

    const nested =
      container.data as BackendTransactionContainer;

    if (
      nested.transaction &&
      isRecord(
        nested.transaction,
      )
    ) {
      return nested.transaction;
    }
  }

  throw new Error(
    "The server completed the request but did not return a valid transaction record.",
  );
}

/**
 * Extract a transaction array from the API envelope.
 */
function extractTransactionList(
  value: unknown,
): BackendTransaction[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value as BackendTransaction[];
  }

  if (!isRecord(value)) {
    return [];
  }

  if (
    Array.isArray(
      value.transactions,
    )
  ) {
    return value.transactions as BackendTransaction[];
  }

  if (
    Array.isArray(
      value.items,
    )
  ) {
    return value.items as BackendTransaction[];
  }

  if (
    isRecord(value.data)
  ) {
    return extractTransactionList(
      value.data,
    );
  }

  return [];
}

export const transactionService = {
  async list(): Promise<
    DispenseTransaction[]
  > {
    const response =
      await api.get<
        BackendTransaction[] |
          TransactionListResponse
      >("/transactions");

    return extractTransactionList(
      response.data,
    ).map(
      normaliseTransaction,
    );
  },

  async get(
    id: string,
  ): Promise<DispenseTransaction> {
    if (!id.trim()) {
      throw new Error(
        "Transaction ID is required.",
      );
    }

    const response =
      await api.get<unknown>(
        `/transactions/${encodeURIComponent(
          id,
        )}`,
      );

    return normaliseTransaction(
      extractTransaction(
        response.data,
      ),
    );
  },

  async create(
    input: CreateTransactionInput,
  ): Promise<DispenseTransaction> {
    if (
      !input.patientName.trim()
    ) {
      throw new Error(
        "Patient name is required.",
      );
    }

    if (!input.clinicianId?.trim()) {
      throw new Error(
        "A registered prescribing clinician is required.",
      );
    }

    if (
      !input.items.length
    ) {
      throw new Error(
        "At least one medicine must be included.",
      );
    }

    if (
      input.discount < 0
    ) {
      throw new Error(
        "Discount cannot be negative.",
      );
    }

    if (
      input.paymentMethod ===
        "Cash" &&
      input.cashTendered !==
        undefined &&
      input.cashTendered < 0
    ) {
      throw new Error(
        "Cash tendered cannot be negative.",
      );
    }

    if (
      input.paymentMethod ===
        "M-Pesa" &&
      !input.mpesaCode?.trim()
    ) {
      throw new Error(
        "M-Pesa transaction code is required.",
      );
    }

    const response =
      await api.post<unknown>(
        "/transactions",
        input,
      );

    const transaction =
      extractTransaction(
        response.data,
      );

    return normaliseTransaction(
      transaction,
    );
  },

  async cancel(
    id: string,
  ): Promise<DispenseTransaction> {
    if (!id.trim()) {
      throw new Error(
        "Transaction ID is required.",
      );
    }

    const response =
      await api.patch<unknown>(
        `/transactions/${encodeURIComponent(
          id,
        )}/cancel`,
      );

    const transaction =
      extractTransaction(
        response.data,
      );

    return normaliseTransaction(
      transaction,
    );
  },
};

export default transactionService;