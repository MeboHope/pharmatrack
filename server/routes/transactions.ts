import { Router } from "express";
import {
  Prisma,
  DrugBatchStatus,
  HealthcareFrequency,
  HealthcareRoute,
  PatientType,
  PaymentMethod,
  ProductStatus,
  StockMovementType,
  TransactionStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "../prisma.js";
import {
  authenticate,
  requireOrganizationContext,
  requireRole,
} from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import {
  assertMonthlyTransactionLimit,
  lockOrganizationSubscriptionResources,
  SubscriptionLimitError,
} from "../services/subscriptionLimits.js";

const router = Router();

router.use(authenticate);
router.use(requireOrganizationContext);

const pharmacyStaff = requireRole(
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
);

const pharmacistOnly = requireRole(
  "ADMIN",
  "PHARMACIST",
);

const transactionInclude = {
  PrescriptionItem: {
    include: {
      allocations: {
        include: {
          product: true,
          batch: true,
        },
      },
      Product: true,
      Drug: true,
    },
  },
  Patient: true,
  User: true,
  Clinician: true,
} as const;

type TransactionWithDetails =
  Prisma.DispenseTransactionGetPayload<{
    include: typeof transactionInclude;
  }>;

interface DispenseItemInput {
  productId?: unknown;
  qty?: unknown;
  frequency?: unknown;
  route?: unknown;
  duration?: unknown;
  durationUnit?: unknown;
  specialInstructions?: unknown;
}

interface CreateTransactionBody {
  patientType?: unknown;
  patientId?: unknown;
  patientName?: unknown;
  phone?: unknown;
  clinicianId?: unknown;
  prescriptionDate?: unknown;
  diagnosis?: unknown;
  items?: unknown;
  discount?: unknown;
  paymentMethod?: unknown;
  cashTendered?: unknown;
  mpesaCode?: unknown;
}

function asTrimmedString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function asOptionalString(
  value: unknown,
): string | undefined {
  const valueString =
    asTrimmedString(value);

  return valueString || undefined;
}

function asPositiveInteger(
  value: unknown,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return 0;
  }

  return parsed;
}

function asNonNegativeNumber(
  value: unknown,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return 0;
  }

  return parsed;
}

function mapFrequency(
  value: unknown,
): HealthcareFrequency {
  switch (value) {
    case "OD":
    case "OD (Once daily)":
      return HealthcareFrequency.OD;

    case "BD_BID":
    case "BD / BID (Twice daily)":
      return HealthcareFrequency.BD_BID;

    case "TID":
    case "TID (Three times daily)":
      return HealthcareFrequency.TID;

    case "QID":
    case "QID (Four times daily)":
      return HealthcareFrequency.QID;

    case "STAT":
    case "STAT (Immediately)":
      return HealthcareFrequency.STAT;

    case "PRN":
    case "PRN (As needed)":
      return HealthcareFrequency.PRN;

    case "Q4H":
    case "Q4H (Every 4 hours)":
      return HealthcareFrequency.Q4H;

    case "Q6H":
    case "Q6H (Every 6 hours)":
      return HealthcareFrequency.Q6H;

    case "Q8H":
    case "Q8H (Every 8 hours)":
      return HealthcareFrequency.Q8H;

    case "Q12H":
    case "Q12H (Every 12 hours)":
      return HealthcareFrequency.Q12H;

    case "ON":
    case "ON (At night)":
      return HealthcareFrequency.ON;

    default:
      throw new Error(
        "Invalid prescription frequency.",
      );
  }
}

function mapRoute(
  value: unknown,
): HealthcareRoute {
  switch (value) {
    case "ORAL":
    case "Oral":
      return HealthcareRoute.ORAL;

    case "TOPICAL":
    case "Topical":
      return HealthcareRoute.TOPICAL;

    case "INTRAVENOUS":
    case "Intravenous (IV)":
      return HealthcareRoute.INTRAVENOUS;

    case "INTRAMUSCULAR":
    case "Intramuscular (IM)":
      return HealthcareRoute.INTRAMUSCULAR;

    case "SUBCUTANEOUS":
    case "Subcutaneous":
      return HealthcareRoute.SUBCUTANEOUS;

    case "INHALATION":
    case "Inhalation":
      return HealthcareRoute.INHALATION;

    case "OPHTHALMIC":
    case "Ophthalmic":
      return HealthcareRoute.OPHTHALMIC;

    case "OTIC":
    case "Otic":
      return HealthcareRoute.OTIC;

    case "RECTAL":
    case "Rectal":
      return HealthcareRoute.RECTAL;

    case "SUBLINGUAL":
    case "Sublingual":
      return HealthcareRoute.SUBLINGUAL;

    default:
      throw new Error(
        "Invalid administration route.",
      );
  }
}

function mapPatientType(
  value: unknown,
): PatientType {
  switch (value) {
    case "WALK_IN":
    case "Walk-in Patient":
      return PatientType.WALK_IN;

    case "REGISTERED":
    case "Registered Patient":
      return PatientType.REGISTERED;

    default:
      throw new Error(
        "Invalid patient type.",
      );
  }
}

function mapPaymentMethod(
  value: unknown,
): PaymentMethod {
  switch (value) {
    case "CASH":
    case "Cash":
      return PaymentMethod.CASH;

    case "MPESA":
    case "M-Pesa":
      return PaymentMethod.MPESA;

    default:
      throw new Error(
        "Invalid payment method.",
      );
  }
}

function generateTransactionNumber(): string {
  const datePart =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

  const randomPart =
    randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();

  return `PT-${datePart}-${randomPart}`;
}

function isPrismaConflictError(
  error: unknown,
): boolean {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function toNumber(
  value:
    | Prisma.Decimal
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

async function getTransaction(
  id: string,
  organizationId: string,
): Promise<TransactionWithDetails | null> {
  return prisma.dispenseTransaction.findFirst(
    {
      where: {
        id,
        organizationId,
      },
      include: transactionInclude,
    },
  );
}

async function getOrganizationClinician(
  clinicianId: string,
  organizationId: string,
): Promise<{
  id: string;
  name: string;
} | null> {
  const membership =
    await prisma.organizationMembership.findFirst(
      {
        where: {
          organizationId,
          userId: clinicianId,
          role: "CLINICIAN",
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    );

  if (!membership?.user) {
    return null;
  }

  return membership.user;
}

async function cancelTransaction(
  transactionId: string,
  organizationId: string,
  userId: string,
): Promise<TransactionWithDetails> {
  return prisma.$transaction(
    async (tx) => {
      const transaction =
        await tx.dispenseTransaction.findFirst({
          where: {
            id: transactionId,
            organizationId,
          },
          include: {
            PrescriptionItem: {
              include: {
                allocations: true,
              },
            },
          },
        });

      if (!transaction) {
        throw new Error(
          "Transaction not found.",
        );
      }

      if (
        transaction.status ===
        TransactionStatus.CANCELLED
      ) {
        throw new Error(
          "Transaction has already been cancelled.",
        );
      }

      if (
        transaction.status !==
        TransactionStatus.COMPLETED
      ) {
        throw new Error(
          "Only completed transactions can be cancelled.",
        );
      }

      for (const item of transaction.PrescriptionItem) {
        for (const allocation of item.allocations) {
          const batch =
            await tx.drugBatch.findFirst({
              where: {
                id: allocation.batchId,
                organizationId,
                productId:
                  allocation.productId,
              },
            });

          if (!batch) {
            throw new Error(
              `Batch ${allocation.batchId} could not be found while cancelling the transaction.`,
            );
          }

          const previousQty =
            batch.qty;

          await tx.drugBatch.update({
            where: {
              id: batch.id,
            },
            data: {
              qty: {
                increment:
                  allocation.quantity,
              },
            },
          });

          const resultingQty =
            previousQty +
            allocation.quantity;

          await tx.stockMovement.create({
            data: {
              id: randomUUID(),
              organizationId,
              productId:
                allocation.productId,
              batchId:
                allocation.batchId,
              type:
                StockMovementType.REVERSAL,
              quantityDelta:
                allocation.quantity,
              previousQty,
              resultingQty,
              referenceType:
                "DISPENSE_TRANSACTION",
              referenceId:
                transaction.id,
              reason:
                "Dispensing transaction cancelled",
              notes:
                `Reversal for transaction ${transaction.transactionNo}`,
              userId,
            },
          });
        }
      }

      const cancelled =
        await tx.dispenseTransaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status:
              TransactionStatus.CANCELLED,
          },
          include: transactionInclude,
        });

      return cancelled;
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    },
  );
}

/*
 * IMPORTANT:
 *
 * This route MUST appear before "/:id".
 *
 * Otherwise Express interprets:
 *
 *   GET /transactions/clinicians
 *
 * as:
 *
 *   GET /transactions/:id
 *
 * with id = "clinicians".
 *
 * That is what caused the "Transaction not found." message
 * immediately when the Dispensing page opened.
 */
router.get(
  "/clinicians",
  pharmacyStaff,
  async (request, response) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return response.status(400).json({
          message:
            "Organization context is required.",
        });
      }

      const memberships =
        await prisma.organizationMembership.findMany(
          {
            where: {
              organizationId,
              role: "CLINICIAN",
            },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
            orderBy: {
              user: {
                name: "asc",
              },
            },
          },
        );

      const clinicians =
        memberships.map(
          (membership) => ({
            id: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            phone: membership.user.phone,
          }),
        );

      return response.json(
        clinicians,
      );
    } catch (error) {
      console.error(
        "GET /transactions/clinicians error:",
        error,
      );

      return response.status(500).json({
        message:
          "Failed to load registered clinicians.",
      });
    }
  },
);

router.get(
  "/",
  pharmacyStaff,
  async (request, response) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return response.status(400).json({
          message:
            "Organization context is required.",
        });
      }

      const transactions =
        await prisma.dispenseTransaction.findMany(
          {
            where: {
              organizationId,
            },
            include: transactionInclude,
            orderBy: {
              date: "desc",
            },
          },
        );

      return response.json(
        transactions,
      );
    } catch (error) {
      console.error(
        "GET /transactions error:",
        error,
      );

      return response.status(500).json({
        message:
          "Failed to load transactions.",
      });
    }
  },
);

router.get(
  "/:id",
  pharmacyStaff,
  async (request, response) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return response.status(400).json({
          message:
            "Organization context is required.",
        });
      }

      const transaction =
        await getTransaction(
          request.params.id,
          organizationId,
        );

      if (!transaction) {
        return response.status(404).json({
          message:
            "Transaction not found.",
        });
      }

      return response.json(
        transaction,
      );
    } catch (error) {
      console.error(
        "GET /transactions/:id error:",
        error,
      );

      return response.status(500).json({
        message:
          "Failed to load transaction.",
      });
    }
  },
);

router.post(
  "/",
  pharmacyStaff,
  async (request, response) => {
    const body =
      request.body as CreateTransactionBody;

    const organizationId =
      request.auth?.organizationId;

    const userId =
      request.auth?.sub;

    if (!organizationId || !userId) {
      return response.status(401).json({
        message:
          "Authenticated organization context is required.",
      });
    }

    try {
      const patientType =
        mapPatientType(
          body.patientType,
        );

      const paymentMethod =
        mapPaymentMethod(
          body.paymentMethod,
        );

      const patientName =
        asTrimmedString(
          body.patientName,
        );

      const clinicianId =
        asOptionalString(
          body.clinicianId,
        );

      const phone =
        asOptionalString(
          body.phone,
        );

      const prescriptionDate =
        asOptionalString(
          body.prescriptionDate,
        );

      const diagnosis =
        asOptionalString(
          body.diagnosis,
        );

      const patientId =
        asOptionalString(
          body.patientId,
        );

      if (!patientName) {
        return response.status(400).json({
          message:
            "Patient name is required.",
        });
      }

      /*
       * A production dispensing transaction must have
       * an identified registered clinician.
       *
       * The frontend should therefore always send clinicianId.
       */
      if (!clinicianId) {
        return response.status(400).json({
          message:
            "A registered clinician must be selected.",
          code:
            "CLINICIAN_REQUIRED",
        });
      }

      /*
       * Resolve the clinician from the current organization.
       *
       * This prevents a client from simply submitting an arbitrary
       * clinician name or a clinician belonging to another organization.
       */
      const clinician =
        await getOrganizationClinician(
          clinicianId,
          organizationId,
        );

      if (!clinician) {
        return response.status(400).json({
          message:
            "The selected clinician is not a registered clinician in this organization.",
          code:
            "INVALID_CLINICIAN",
        });
      }

      if (
        patientType ===
          PatientType.REGISTERED &&
        !patientId
      ) {
        return response.status(400).json({
          message:
            "A registered patient must be selected.",
        });
      }

      if (
        patientType ===
          PatientType.WALK_IN &&
        patientId
      ) {
        return response.status(400).json({
          message:
            "Walk-in transactions cannot contain a registered patient ID.",
        });
      }

      const rawItems =
        Array.isArray(body.items)
          ? body.items
          : [];

      if (!rawItems.length) {
        return response.status(400).json({
          message:
            "At least one medicine must be included.",
        });
      }

      const items =
        rawItems.map(
          (rawItem) =>
            rawItem as DispenseItemInput,
        );

      const normalizedItems =
        items.map((item) => {
          const productId =
            asTrimmedString(
              item.productId,
            );

          const qty =
            asPositiveInteger(
              item.qty,
            );

          if (!productId) {
            throw new Error(
              "Every dispensing item must have a product.",
            );
          }

          if (!qty) {
            throw new Error(
              `Invalid quantity for product ${productId}.`,
            );
          }

          const duration =
            asPositiveInteger(
              item.duration,
            );

          if (!duration) {
            throw new Error(
              `Invalid duration for product ${productId}.`,
            );
          }

          const durationUnit =
            asTrimmedString(
              item.durationUnit,
            );

          if (!durationUnit) {
            throw new Error(
              `Duration unit is required for product ${productId}.`,
            );
          }

          return {
            productId,
            qty,
            frequency:
              mapFrequency(
                item.frequency,
              ),
            route:
              mapRoute(item.route),
            duration,
            durationUnit,
            specialInstructions:
              asOptionalString(
                item.specialInstructions,
              ),
          };
        });

      const productIds =
        normalizedItems.map(
          (item) => item.productId,
        );

      if (
        new Set(productIds).size !==
        productIds.length
      ) {
        return response.status(400).json({
          message:
            "The same product cannot appear more than once in a dispensing transaction.",
        });
      }

      const discount =
        asNonNegativeNumber(
          body.discount,
        );

      const cashTendered =
        body.cashTendered ===
          undefined ||
        body.cashTendered ===
          null ||
        body.cashTendered === ""
          ? undefined
          : asNonNegativeNumber(
              body.cashTendered,
            );

      const mpesaCode =
        asOptionalString(
          body.mpesaCode,
        );

      if (
        paymentMethod ===
          PaymentMethod.MPESA &&
        !mpesaCode
      ) {
        return response.status(400).json({
          message:
            "M-Pesa transaction code is required.",
        });
      }

      if (
        paymentMethod ===
          PaymentMethod.CASH &&
        cashTendered ===
          undefined
      ) {
        return response.status(400).json({
          message:
            "Cash tendered is required for cash transactions.",
        });
      }

      if (
        patientType ===
          PatientType.REGISTERED
      ) {
        const patient =
          await prisma.patient.findFirst({
            where: {
              id: patientId,
              organizationId,
            },
            select: {
              id: true,
            },
          });

        if (!patient) {
          return response.status(404).json({
            message:
              "Registered patient was not found in this organization.",
          });
        }
      }

      const maxAttempts = 3;

      let createdTransaction:
        | TransactionWithDetails
        | null = null;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt += 1
      ) {
        try {
          createdTransaction =
            await prisma.$transaction(
              async (tx) => {
                const now =
                  new Date();

                  // Serialize subscription quota checks and dispensing
// writes for this organization.
await lockOrganizationSubscriptionResources(
  tx,
  organizationId,
);

                // Enforce the organization's subscription and monthly
                // dispensing transaction limit before creating the sale.
                await assertMonthlyTransactionLimit(
                  tx,
                  organizationId,
                  now,
                );

                const transactionNo =
                  generateTransactionNumber();

                /*
                 * Create the transaction shell first so all stock
                 * movements can reference its ID.
                 *
                 * clinicianId identifies the registered prescribing
                 * clinician.
                 *
                 * userId identifies the authenticated staff member
                 * who processed/dispensed the transaction.
                 */
                const transaction =
                  await tx.dispenseTransaction.create(
                    {
                      data: {
                        id: randomUUID(),
                        transactionNo,
                        organizationId,
                        patientType,
                        patientId:
                          patientType ===
                          PatientType.REGISTERED
                            ? patientId
                            : null,
                        patientName,
                        phone:
                          phone ?? null,
                        clinicianId:
                          clinician.id,
                        clinicianName:
                          clinician.name,
                        prescriptionDate:
                          prescriptionDate
                            ? new Date(
                                `${prescriptionDate}T00:00:00.000Z`,
                              )
                            : null,
                        diagnosis:
                          diagnosis ?? null,
                        subtotal:
                          new Prisma.Decimal(
                            0,
                          ),
                        discount:
                          new Prisma.Decimal(
                            discount.toFixed(
                              2,
                            ),
                          ),
                        totalAmount:
                          new Prisma.Decimal(
                            0,
                          ),
                        paymentMethod,
                        cashTendered:
                          cashTendered !==
                          undefined
                            ? new Prisma.Decimal(
                                cashTendered.toFixed(
                                  2,
                                ),
                              )
                            : null,
                        changeAmount:
                          null,
                        mpesaCode:
                          mpesaCode ?? null,
                        status:
                          TransactionStatus.COMPLETED,
                        userId,
                      },
                    },
                  );

                let subtotal =
                  new Prisma.Decimal(0);

                for (const item of normalizedItems) {
                  const product =
                    await tx.product.findFirst({
                      where: {
                        id: item.productId,
                        organizationId,
                        status:
                          ProductStatus.ACTIVE,
                      },
                    });

                  if (!product) {
                    throw new Error(
                      `Product ${item.productId} was not found or is inactive.`,
                    );
                  }

                  const batches =
                    await tx.drugBatch.findMany({
                      where: {
                        organizationId,
                        productId:
                          product.id,
                        status:
                          DrugBatchStatus.ACTIVE,
                        qty: {
                          gt: 0,
                        },
                        expiryDate: {
                          gt: now,
                        },
                      },
                      orderBy: [
                        {
                          expiryDate:
                            "asc",
                        },
                        {
                          createdAt:
                            "asc",
                        },
                        {
                          id: "asc",
                        },
                      ],
                    });

                  const availableQty =
                    batches.reduce(
                      (
                        total,
                        batch,
                      ) =>
                        total +
                        batch.qty,
                      0,
                    );

                  if (
                    availableQty <
                    item.qty
                  ) {
                    throw new Error(
                      `Insufficient stock for ${product.name}. Requested ${item.qty}, available ${availableQty}.`,
                    );
                  }

                  let remaining =
                    item.qty;

                  const allocations: Array<{
                    batchId: string;
                    quantity: number;
                    unitPrice: Prisma.Decimal;
                    lineTotal: Prisma.Decimal;
                    batchNo: string;
                    expiryDate: Date;
                    previousQty: number;
                    resultingQty: number;
                  }> = [];

                  for (const batch of batches) {
                    if (
                      remaining <=
                      0
                    ) {
                      break;
                    }

                    const allocationQty =
                      Math.min(
                        remaining,
                        batch.qty,
                      );

                    const unitPrice =
                      new Prisma.Decimal(
                        batch.sellingPrice,
                      );

                    const lineTotal =
                      unitPrice.mul(
                        allocationQty,
                      );

                    const updateResult =
                      await tx.drugBatch.updateMany(
                        {
                          where: {
                            id: batch.id,
                            organizationId,
                            productId:
                              product.id,
                            status:
                              DrugBatchStatus.ACTIVE,
                            expiryDate: {
                              gt: now,
                            },
                            qty: {
                              gte: allocationQty,
                            },
                          },
                          data: {
                            qty: {
                              decrement:
                                allocationQty,
                            },
                          },
                        },
                      );

                    if (
                      updateResult.count !==
                      1
                    ) {
                      throw new Prisma.PrismaClientKnownRequestError(
                        "Concurrent stock change detected.",
                        {
                          code: "P2034",
                          clientVersion:
                            Prisma.prismaVersion.client,
                        },
                      );
                    }

                    const previousQty =
                      batch.qty;

                    const resultingQty =
                      previousQty -
                      allocationQty;

                    allocations.push({
                      batchId:
                        batch.id,
                      quantity:
                        allocationQty,
                      unitPrice,
                      lineTotal,
                      batchNo:
                        batch.batchNo,
                      expiryDate:
                        batch.expiryDate,
                      previousQty,
                      resultingQty,
                    });

                    remaining -=
                      allocationQty;
                  }

                  if (
                    remaining >
                    0
                  ) {
                    throw new Prisma.PrismaClientKnownRequestError(
                      "Stock became insufficient during dispensing.",
                      {
                        code: "P2034",
                        clientVersion:
                          Prisma.prismaVersion.client,
                      },
                    );
                  }

                  const itemLineTotal =
                    allocations.reduce(
                      (
                        total,
                        allocation,
                      ) =>
                        total.plus(
                          allocation.lineTotal,
                        ),
                      new Prisma.Decimal(
                        0,
                      ),
                    );

                  subtotal =
                    subtotal.plus(
                      itemLineTotal,
                    );

                  const weightedUnitPrice =
                    itemLineTotal
                      .div(item.qty)
                      .toDecimalPlaces(
                        2,
                      );

                  const firstAllocation =
                    allocations[0];

                  if (
                    !firstAllocation
                  ) {
                    throw new Error(
                      `No stock allocation was created for ${product.name}.`,
                    );
                  }

                  const prescriptionItem =
                    await tx.prescriptionItem.create(
                      {
                        data: {
                          id: randomUUID(),
                          drugId: null,
                          productId:
                            product.id,
                          drugCode:
                            product.code,
                          drugName:
                            product.name,
                          batchNo:
                            firstAllocation.batchNo,
                          expiryDate:
                            firstAllocation.expiryDate,
                          availableQty,
                          qty: item.qty,
                          unitPrice:
                            weightedUnitPrice,
                          frequency:
                            item.frequency,
                          route:
                            item.route,
                          duration:
                            item.duration,
                          durationUnit:
                            item.durationUnit,
                          specialInstructions:
                            item.specialInstructions ??
                            null,
                          lineTotal:
                            itemLineTotal,
                          transactionId:
                            transaction.id,
                        },
                      },
                    );

                  for (const allocation of allocations) {
                    await tx.dispenseAllocation.create(
                      {
                        data: {
                          id: randomUUID(),
                          transactionItemId:
                            prescriptionItem.id,
                          productId:
                            product.id,
                          batchId:
                            allocation.batchId,
                          quantity:
                            allocation.quantity,
                          unitPrice:
                            allocation.unitPrice,
                          lineTotal:
                            allocation.lineTotal,
                        },
                      },
                    );

                    await tx.stockMovement.create(
                      {
                        data: {
                          id: randomUUID(),
                          organizationId,
                          productId:
                            product.id,
                          batchId:
                            allocation.batchId,
                          type:
                            StockMovementType.DISPENSE,
                          quantityDelta:
                            -allocation.quantity,
                          previousQty:
                            allocation.previousQty,
                          resultingQty:
                            allocation.resultingQty,
                          referenceType:
                            "DISPENSE_TRANSACTION",
                          referenceId:
                            transaction.id,
                          reason:
                            "Medicine dispensed",
                          notes:
                            `Dispensed under transaction ${transaction.transactionNo}`,
                          userId,
                        },
                      },
                    );
                  }
                }

                if (
                  discount >
                  toNumber(subtotal)
                ) {
                  throw new Error(
                    `Discount cannot exceed the transaction subtotal of ${subtotal.toFixed(2)}.`,
                  );
                }

                const totalAmount =
                  subtotal
                    .minus(discount)
                    .toDecimalPlaces(
                      2,
                    );

                let finalCashTendered:
                  Prisma.Decimal | null =
                    null;

                let changeAmount:
                  Prisma.Decimal | null =
                    null;

                if (
                  paymentMethod ===
                  PaymentMethod.CASH
                ) {
                  if (
                    cashTendered ===
                    undefined
                  ) {
                    throw new Error(
                      "Cash tendered is required.",
                    );
                  }

                  finalCashTendered =
                    new Prisma.Decimal(
                      cashTendered.toFixed(
                        2,
                      ),
                    );

                  if (
                    finalCashTendered.lessThan(
                      totalAmount,
                    )
                  ) {
                    throw new Error(
                      `Cash tendered is insufficient. Required ${totalAmount.toFixed(2)}.`,
                    );
                  }

                  changeAmount =
                    finalCashTendered
                      .minus(
                        totalAmount,
                      )
                      .toDecimalPlaces(
                        2,
                      );
                }

                await tx.dispenseTransaction.update(
                  {
                    where: {
                      id: transaction.id,
                    },
                    data: {
                      subtotal:
                        subtotal.toDecimalPlaces(
                          2,
                        ),
                      discount:
                        new Prisma.Decimal(
                          discount.toFixed(
                            2,
                          ),
                        ),
                      totalAmount,
                      cashTendered:
                        finalCashTendered,
                      changeAmount,
                    },
                  },
                );

                if (
                  patientType ===
                    PatientType.REGISTERED &&
                  patientId
                ) {
                  await tx.patient.update({
                    where: {
                      id: patientId,
                    },
                    data: {
                      totalVisits: {
                        increment: 1,
                      },
                    },
                  });
                }

                return tx.dispenseTransaction.findUniqueOrThrow(
                  {
                    where: {
                      id: transaction.id,
                    },
                    include:
                      transactionInclude,
                  },
                );
              },
              {
                isolationLevel:
                  Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 15000,
              },
            );

          break;
        } catch (error) {
          if (
            isPrismaConflictError(
              error,
            ) &&
            attempt <
              maxAttempts
          ) {
            continue;
          }

          throw error;
        }
      }

      if (!createdTransaction) {
        throw new Error(
          "The transaction could not be completed.",
        );
      }

      await recordAudit(request, {
        action: "TRANSACTION_CREATED",
        entity:
          "DispenseTransaction",
        entityId:
          createdTransaction.id,
        organizationId,
        details: {
          transactionNo:
            createdTransaction.transactionNo,
          patientName:
            createdTransaction.patientName,
          clinicianId:
            createdTransaction.clinicianId,
          clinicianName:
            createdTransaction.clinicianName,
          dispensedByUserId:
            createdTransaction.userId,
          totalAmount:
            toNumber(
              createdTransaction.totalAmount,
            ),
          itemCount:
            createdTransaction
              .PrescriptionItem
              .length,
          status:
            createdTransaction.status,
        },
      });

      return response.status(201).json(
        createdTransaction,
      );
    } catch (error) {
      console.error(
        "POST /transactions error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create transaction.";

                if (error instanceof SubscriptionLimitError) {
        return response.status(error.statusCode).json({
          message: error.message,
          code: error.code,
        });
      }

      if (
        message
          .toLowerCase()
          .includes(
            "insufficient stock",
          )
      ) {
        return response.status(409).json({
          message,
          code:
            "INSUFFICIENT_STOCK",
        });
      }

      if (
        message
          .toLowerCase()
          .includes(
            "concurrent stock",
          ) ||
        isPrismaConflictError(error)
      ) {
        return response.status(409).json({
          message:
            "Stock changed while this transaction was being processed. Please review the stock and try again.",
          code:
            "CONCURRENT_STOCK_CHANGE",
        });
      }

      if (
        message
          .toLowerCase()
          .includes(
            "discount cannot exceed",
          ) ||
        message
          .toLowerCase()
          .includes(
            "cash tendered is insufficient",
          )
      ) {
        return response.status(400).json({
          message,
        });
      }

      return response.status(400).json({
        message,
      });
    }
  },
);

router.patch(
  "/:id/cancel",
  pharmacistOnly,
  async (request, response) => {
    const organizationId =
      request.auth?.organizationId;

    const userId =
      request.auth?.sub;

    if (!organizationId || !userId) {
      return response.status(401).json({
        message:
          "Authenticated organization context is required.",
      });
    }

    try {
      let cancelled:
        | TransactionWithDetails
        | null = null;

      const maxAttempts = 3;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt += 1
      ) {
        try {
          cancelled =
            await cancelTransaction(
              request.params.id,
              organizationId,
              userId,
            );

          break;
        } catch (error) {
          if (
            isPrismaConflictError(
              error,
            ) &&
            attempt <
              maxAttempts
          ) {
            continue;
          }

          throw error;
        }
      }

      if (!cancelled) {
        return response.status(500).json({
          message:
            "The transaction could not be cancelled.",
        });
      }

      await recordAudit(request, {
        action:
          "TRANSACTION_CANCELLED",
        entity:
          "DispenseTransaction",
        entityId:
          cancelled.id,
        organizationId,
        details: {
          transactionNo:
            cancelled.transactionNo,
          totalAmount:
            toNumber(
              cancelled.totalAmount,
            ),
          clinicianId:
            cancelled.clinicianId,
          clinicianName:
            cancelled.clinicianName,
          cancelledByUserId:
            userId,
          status:
            cancelled.status,
        },
      });

      return response.json(
        cancelled,
      );
    } catch (error) {
      console.error(
        "PATCH /transactions/:id/cancel error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel transaction.";

      if (
        message ===
        "Transaction not found."
      ) {
        return response.status(404).json({
          message,
        });
      }

      if (
        message.includes(
          "already been cancelled",
        )
      ) {
        return response.status(409).json({
          message,
        });
      }

      return response.status(400).json({
        message,
      });
    }
  },
);

/**
 * Keep the old PUT endpoint safe for existing clients.
 *
 * We deliberately do not allow arbitrary status manipulation because
 * changing COMPLETED/CANCELLED without reversing or allocating stock
 * would corrupt inventory.
 */
router.put(
  "/:id",
  pharmacistOnly,
  async (request, response) => {
    const requestedStatus =
      request.body?.status;

    if (
      requestedStatus ===
        "CANCELLED" ||
      requestedStatus ===
        "Cancelled"
    ) {
      return response.status(400).json({
        message:
          "Use PATCH /transactions/:id/cancel to cancel a transaction safely.",
      });
    }

    return response.status(400).json({
      message:
        "Transaction status is server-controlled. Use the dedicated cancellation endpoint.",
    });
  },
);

export default router;