import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../prisma.js";
import {
  authenticate,
  requireOrganizationContext,
  requireRole,
} from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";

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

const parseDate = (
  value: unknown,
): Date | undefined => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

const parseNonNegativeNumber = (
  value: unknown,
): number | undefined => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return undefined;
  }

  return number;
};

const parsePositiveInteger = (
  value: unknown,
): number | undefined => {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return undefined;
  }

  return number;
};

const frequencyValues = [
  "OD",
  "BD_BID",
  "TID",
  "QID",
  "STAT",
  "PRN",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "ON",
] as const;

const routeValues = [
  "ORAL",
  "TOPICAL",
  "INTRAVENOUS",
  "INTRAMUSCULAR",
  "SUBCUTANEOUS",
  "INHALATION",
  "OPHTHALMIC",
  "OTIC",
  "RECTAL",
  "SUBLINGUAL",
] as const;

const frequencyFromClient = (
  value: unknown,
):
  | (typeof frequencyValues)[number]
  | undefined => {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const mapping: Record<
    string,
    (typeof frequencyValues)[number]
  > = {
    "OD (Once daily)": "OD",
    "BD / BID (Twice daily)": "BD_BID",
    "TID (Three times daily)": "TID",
    "QID (Four times daily)": "QID",
    "STAT (Immediately)": "STAT",
    "PRN (As needed)": "PRN",
    "Q4H (Every 4 hours)": "Q4H",
    "Q6H (Every 6 hours)": "Q6H",
    "Q8H (Every 8 hours)": "Q8H",
    "Q12H (Every 12 hours)": "Q12H",
    "ON (At night)": "ON",
  };

  if (
    value in mapping
  ) {
    return mapping[value];
  }

  if (
    frequencyValues.includes(
      value as (typeof frequencyValues)[number],
    )
  ) {
    return value as
      (typeof frequencyValues)[number];
  }

  return undefined;
};

const routeFromClient = (
  value: unknown,
):
  | (typeof routeValues)[number]
  | undefined => {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const mapping: Record<
    string,
    (typeof routeValues)[number]
  > = {
    Oral: "ORAL",
    Topical: "TOPICAL",
    "Intravenous (IV)": "INTRAVENOUS",
    "Intramuscular (IM)": "INTRAMUSCULAR",
    Subcutaneous: "SUBCUTANEOUS",
    Inhalation: "INHALATION",
    Ophthalmic: "OPHTHALMIC",
    Otic: "OTIC",
    Rectal: "RECTAL",
    Sublingual: "SUBLINGUAL",
  };

  if (
    value in mapping
  ) {
    return mapping[value];
  }

  if (
    routeValues.includes(
      value as (typeof routeValues)[number],
    )
  ) {
    return value as
      (typeof routeValues)[number];
  }

  return undefined;
};

const mapPatientType = (
  value: string,
) =>
  value === "REGISTERED"
    ? "REGISTERED"
    : "WALK_IN";

const mapPaymentMethod = (
  value: string,
) =>
  value === "MPESA"
    ? "MPESA"
    : "CASH";

const transactionNumber = () => {
  const date = new Date();

  const datePart =
    [
      date.getFullYear(),
      String(
        date.getMonth() + 1,
      ).padStart(2, "0"),
      String(
        date.getDate(),
      ).padStart(2, "0"),
    ].join("");

  return `PT-${datePart}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
};

const buildTransactionResponse = (
  transaction: any,
) => ({
  ...transaction,
  transactionNo:
    transaction.transactionNo,
  items:
    transaction.PrescriptionItem ??
    [],
});

const loadTransaction = async (
  id: string,
  organizationId: string,
) => {
  return prisma.dispenseTransaction.findFirst(
    {
      where: {
        id,
        organizationId,
      },
      include: {
        PrescriptionItem: {
          include: {
            allocations: {
              include: {
                batch: true,
              },
            },
          },
        },
        Patient: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    },
  );
};

/**
 * GET /api/transactions
 */
router.get(
  "/",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      const transactions =
        await prisma.dispenseTransaction.findMany({
          where: {
            organizationId,
          },
          include: {
            PrescriptionItem: {
              include: {
                allocations: {
                  include: {
                    batch: true,
                  },
                },
              },
            },
            Patient: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        });

      response.json({
        success: true,
        data: transactions.map(
          buildTransactionResponse,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/transactions/:id
 */
router.get(
  "/:id",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      const transaction =
        await loadTransaction(
          request.params.id,
          organizationId,
        );

      if (!transaction) {
        response.status(404).json({
          success: false,
          message:
            "Transaction not found.",
        });
        return;
      }

      response.json({
        success: true,
        data:
          buildTransactionResponse(
            transaction,
          ),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/transactions
 *
 * Product-based FEFO dispensing.
 */
router.post(
  "/",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      const authenticatedUserId =
        request.auth?.sub;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      if (!authenticatedUserId) {
        response.status(401).json({
          success: false,
          message:
            "Authenticated user information is required.",
        });
        return;
      }

      const body =
        request.body ?? {};

      const {
        patientType,
        patientId,
        patientName,
        phone,
        clinicianName,
        prescriptionDate,
        diagnosis,
        discount,
        paymentMethod,
        cashTendered,
        mpesaCode,
        items,
      } = body;

      if (
        typeof patientName !==
          "string" ||
        !patientName.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Patient name is required.",
        });
        return;
      }

      if (
        typeof clinicianName !==
          "string" ||
        !clinicianName.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Clinician name is required.",
        });
        return;
      }

      if (
        patientType !==
          "WALK_IN" &&
        patientType !==
          "REGISTERED"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Patient type must be WALK_IN or REGISTERED.",
        });
        return;
      }

      if (
        paymentMethod !==
          "CASH" &&
        paymentMethod !==
          "MPESA"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Payment method must be CASH or MPESA.",
        });
        return;
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "At least one medicine is required.",
        });
        return;
      }

      const parsedDiscount =
        discount === undefined
          ? 0
          : parseNonNegativeNumber(
              discount,
            );

      if (
        parsedDiscount ===
        undefined
      ) {
        response.status(400).json({
          success: false,
          message:
            "Discount must be a valid non-negative amount.",
        });
        return;
      }

      let parsedCashTendered:
        | number
        | undefined;

      if (
        cashTendered !== undefined &&
        cashTendered !== null &&
        cashTendered !== ""
      ) {
        parsedCashTendered =
          parseNonNegativeNumber(
            cashTendered,
          );

        if (
          parsedCashTendered ===
          undefined
        ) {
          response.status(400).json({
            success: false,
            message:
              "Cash tendered must be a valid non-negative amount.",
          });
          return;
        }
      }

      if (
        paymentMethod === "CASH" &&
        parsedCashTendered ===
          undefined
      ) {
        response.status(400).json({
          success: false,
          message:
            "Cash tendered is required for cash payments.",
        });
        return;
      }

      if (
        paymentMethod === "MPESA" &&
        (typeof mpesaCode !==
          "string" ||
          !mpesaCode.trim())
      ) {
        response.status(400).json({
          success: false,
          message:
            "M-Pesa transaction code is required.",
        });
        return;
      }

      const parsedPrescriptionDate =
        prescriptionDate
          ? parseDate(
              prescriptionDate,
            )
          : undefined;

      if (
        prescriptionDate &&
        !parsedPrescriptionDate
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invalid prescription date.",
        });
        return;
      }

      if (
        patientType ===
          "REGISTERED" &&
        (typeof patientId !==
          "string" ||
          !patientId.trim())
      ) {
        response.status(400).json({
          success: false,
          message:
            "A patient ID is required for a registered patient.",
        });
        return;
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const membership =
              await tx.organizationMembership.findFirst(
                {
                  where: {
                    organizationId,
                    userId:
                      authenticatedUserId,
                  },
                  select: {
                    id: true,
                    role: true,
                  },
                },
              );

            if (!membership) {
              throw new Error(
                "AUTH_USER_NOT_IN_ORGANIZATION",
              );
            }

            let patient:
              | {
                  id: string;
                  name: string;
                }
              | null = null;

            if (
              typeof patientId ===
                "string" &&
              patientId.trim()
            ) {
              patient =
                await tx.patient.findFirst(
                  {
                    where: {
                      id:
                        patientId.trim(),
                      organizationId,
                    },
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                );

              if (!patient) {
                throw new Error(
                  "PATIENT_NOT_FOUND",
                );
              }
            }

            const normalizedItems =
              [];

            const seenProducts =
              new Set<string>();

            for (
              const rawItem of items
            ) {
              if (
                !rawItem ||
                typeof rawItem !==
                  "object"
              ) {
                throw new Error(
                  "INVALID_PRESCRIPTION_ITEM",
                );
              }

              const item =
                rawItem as Record<
                  string,
                  unknown
                >;

              const productId =
                typeof item.productId ===
                  "string"
                  ? item.productId.trim()
                  : "";

              if (!productId) {
                throw new Error(
                  "INVALID_PRODUCT_ID",
                );
              }

              if (
                seenProducts.has(
                  productId,
                )
              ) {
                throw new Error(
                  "DUPLICATE_PRODUCT",
                );
              }

              seenProducts.add(
                productId,
              );

              const qty =
                parsePositiveInteger(
                  item.qty,
                );

              if (
                qty === undefined
              ) {
                throw new Error(
                  "INVALID_ITEM_QUANTITY",
                );
              }

              const frequency =
                frequencyFromClient(
                  item.frequency,
                );

              if (!frequency) {
                throw new Error(
                  "INVALID_FREQUENCY",
                );
              }

              const route =
                routeFromClient(
                  item.route,
                );

              if (!route) {
                throw new Error(
                  "INVALID_ROUTE",
                );
              }

              const duration =
                parsePositiveInteger(
                  item.duration,
                ) ?? 1;

              const durationUnit =
                typeof item.durationUnit ===
                    "string" &&
                item.durationUnit.trim()
                  ? item.durationUnit.trim()
                  : "Days";

              const product =
                await tx.product.findFirst(
                  {
                    where: {
                      id: productId,
                      organizationId,
                    },
                    include: {
                      batches: {
                        where: {
                          organizationId,
                          productId,
                          status:
                            "ACTIVE",
                          qty: {
                            gt: 0,
                          },
                          expiryDate: {
                            gte:
                              new Date(),
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
                      },
                    },
                  },
                );

              if (!product) {
                throw new Error(
                  "PRODUCT_NOT_FOUND",
                );
              }

              if (
                product.status !==
                "ACTIVE"
              ) {
                throw new Error(
                  `PRODUCT_INACTIVE:${product.id}`,
                );
              }

              const available =
                product.batches.reduce(
                  (
                    total,
                    batch,
                  ) =>
                    total +
                    batch.qty,
                  0,
                );

              if (
                available < qty
              ) {
                throw new Error(
                  `INSUFFICIENT_STOCK:${product.id}`,
                );
              }

              normalizedItems.push({
                product,
                qty,
                frequency,
                route,
                duration,
                durationUnit,
                specialInstructions:
                  typeof item.specialInstructions ===
                      "string" &&
                  item.specialInstructions.trim()
                    ? item.specialInstructions.trim()
                    : null,
              });
            }

            let subtotal =
              new Prisma.Decimal(
                0,
              );

            const itemResults =
              [];

            for (
              const item of normalizedItems
            ) {
              let remaining =
                item.qty;

              let firstBatch:
                | (typeof item.product.batches)[number]
                | null =
                null;

              const allocations =
                [];

              for (
                const batch of
                  item.product
                    .batches
              ) {
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

                if (
                  allocationQty <=
                  0
                ) {
                  continue;
                }

                if (
                  !firstBatch
                ) {
                  firstBatch =
                    batch;
                }

                const unitPrice =
                  new Prisma.Decimal(
                    batch.sellingPrice,
                  );

                const lineTotal =
                  unitPrice.mul(
                    allocationQty,
                  );

                const updated =
                  await tx.drugBatch.updateMany(
                    {
                      where: {
                        id: batch.id,
                        organizationId,
                        productId:
                          item.product
                            .id,
                        status:
                          "ACTIVE",
                        expiryDate: {
                          gte:
                            new Date(),
                        },
                        qty: {
                          gte:
                            allocationQty,
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
                  updated.count !==
                  1
                ) {
                  throw new Error(
                    "STOCK_CONCURRENCY_CONFLICT",
                  );
                }

                const previousQty =
                  batch.qty;

                const resultingQty =
                  previousQty -
                  allocationQty;

                const movement =
                  await tx.stockMovement.create(
                    {
                      data: {
                        organizationId,
                        productId:
                          item.product
                            .id,
                        batchId:
                          batch.id,
                        type:
                          "DISPENSE",
                        quantityDelta:
                          -allocationQty,
                        previousQty,
                        resultingQty,
                        referenceType:
                          "DispenseTransaction",
                        reason:
                          "Medicine dispensed",
                        userId:
                          authenticatedUserId,
                      },
                    },
                  );

                allocations.push({
                  batch,
                  quantity:
                    allocationQty,
                  unitPrice,
                  lineTotal,
                  movementId:
                    movement.id,
                });

                subtotal =
                  subtotal.add(
                    lineTotal,
                  );

                remaining -=
                  allocationQty;
              }

              if (
                remaining >
                  0 ||
                !firstBatch
              ) {
                throw new Error(
                  "INSUFFICIENT_STOCK",
                );
              }

              itemResults.push({
                ...item,
                firstBatch,
                allocations,
              });
            }

            const discountDecimal =
              new Prisma.Decimal(
                parsedDiscount.toFixed(
                  2,
                ),
              );

            if (
              discountDecimal.gt(
                subtotal,
              )
            ) {
              throw new Error(
                "DISCOUNT_EXCEEDS_SUBTOTAL",
              );
            }

            const totalAmount =
              subtotal.sub(
                discountDecimal,
              );

            let finalChange =
              new Prisma.Decimal(
                0,
              );

            if (
              paymentMethod ===
              "CASH"
            ) {
              const tendered =
                new Prisma.Decimal(
                  (
                    parsedCashTendered ??
                    0
                  ).toFixed(2),
                );

              if (
                tendered.lt(
                  totalAmount,
                )
              ) {
                throw new Error(
                  "INSUFFICIENT_CASH",
                );
              }

              finalChange =
                tendered.sub(
                  totalAmount,
                );
            }

            const transaction =
              await tx.dispenseTransaction.create(
                {
                  data: {
                    transactionNo:
                      transactionNumber(),
                    date:
                      new Date(),
                    patientType:
                      mapPatientType(
                        patientType,
                      ),
                    patientName:
                      patientName.trim(),
                    phone:
                      typeof phone ===
                          "string" &&
                      phone.trim()
                        ? phone.trim()
                        : null,
                    clinicianName:
                      clinicianName.trim(),
                    prescriptionDate:
                      parsedPrescriptionDate ??
                      null,
                    diagnosis:
                      typeof diagnosis ===
                          "string" &&
                      diagnosis.trim()
                        ? diagnosis.trim()
                        : null,
                    subtotal:
                      subtotal.toDecimalPlaces(
                        2,
                      ),
                    discount:
                      discountDecimal,
                    totalAmount:
                      totalAmount.toDecimalPlaces(
                        2,
                      ),
                    paymentMethod:
                      mapPaymentMethod(
                        paymentMethod,
                      ),
                    cashTendered:
                      paymentMethod ===
                      "CASH"
                        ? new Prisma.Decimal(
                            (
                              parsedCashTendered ??
                              0
                            ).toFixed(2),
                          )
                        : null,
                    changeAmount:
                      paymentMethod ===
                      "CASH"
                        ? finalChange.toDecimalPlaces(
                            2,
                          )
                        : null,
                    mpesaCode:
                      paymentMethod ===
                      "MPESA"
                        ? mpesaCode.trim()
                        : null,
                    status:
                      "COMPLETED",
                    patientId:
                      patient?.id ??
                      null,
                    userId:
                      authenticatedUserId,
                    organizationId,
                  },
                },
              );

            for (
              const item of itemResults
            ) {
              const first =
                item.firstBatch;

              const firstAvailableQty =
                first.qty;

              const lineTotal =
                item.allocations.reduce(
                  (
                    total,
                    allocation,
                  ) =>
                    total.add(
                      allocation.lineTotal,
                    ),
                  new Prisma.Decimal(
                    0,
                  ),
                );

              const prescriptionItem =
                await tx.prescriptionItem.create(
                  {
                    data: {
                      drugId:
                        null,
                      productId:
                        item.product
                          .id,
                      drugCode:
                        item.product
                          .code,
                      drugName:
                        item.product
                          .name,
                      batchNo:
                        first.batchNo,
                      expiryDate:
                        first.expiryDate,
                      availableQty:
                        firstAvailableQty,
                      qty:
                        item.qty,
                      unitPrice:
                        lineTotal.div(
                          item.qty,
                        ),
                      frequency:
                        item.frequency,
                      route:
                        item.route,
                      duration:
                        item.duration,
                      durationUnit:
                        item.durationUnit,
                      specialInstructions:
                        item.specialInstructions,
                      lineTotal,
                      transactionId:
                        transaction.id,
                    },
                  },
                );

              for (
                const allocation of
                  item.allocations
              ) {
                await tx.dispenseAllocation.create(
                  {
                    data: {
                      transactionItemId:
                        prescriptionItem.id,
                      productId:
                        item.product
                          .id,
                      batchId:
                        allocation
                          .batch
                          .id,
                      quantity:
                        allocation.quantity,
                      unitPrice:
                        allocation.unitPrice,
                      lineTotal:
                        allocation.lineTotal,
                    },
                  },
                );
              }
            }

            if (patient) {
              await tx.patient.update({
                where: {
                  id: patient.id,
                },
                data: {
                  totalVisits: {
                    increment: 1,
                  },
                },
              });
            }

            return transaction;
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 15000,
          },
        );

      const complete =
        await loadTransaction(
          result.id,
          organizationId,
        );

      await recordAudit(
        request,
        {
          action: "CREATE",
          entity:
            "DispenseTransaction",
          entityId:
            result.id,
          details: {
            transactionNo:
              result.transactionNo,
            patientName:
              result.patientName,
            totalAmount:
              result.totalAmount.toString(),
          },
        },
      );

      response.status(201).json({
        success: true,
        data:
          buildTransactionResponse(
            complete ?? result,
          ),
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
        switch (error.message) {
          case "AUTH_USER_NOT_IN_ORGANIZATION":
            response.status(403).json({
              success: false,
              message:
                "The authenticated user does not belong to this organization.",
            });
            return;

          case "PATIENT_NOT_FOUND":
            response.status(404).json({
              success: false,
              message:
                "Patient not found in the current organization.",
            });
            return;

          case "PRODUCT_NOT_FOUND":
            response.status(404).json({
              success: false,
              message:
                "One of the selected products was not found in the current organization.",
            });
            return;

          case "INVALID_PRESCRIPTION_ITEM":
            response.status(400).json({
              success: false,
              message:
                "One or more prescription items are invalid.",
            });
            return;

          case "INVALID_PRODUCT_ID":
            response.status(400).json({
              success: false,
              message:
                "A valid product ID is required for every medicine.",
            });
            return;

          case "INVALID_ITEM_QUANTITY":
            response.status(400).json({
              success: false,
              message:
                "Every medicine must have a valid positive quantity.",
            });
            return;

          case "INVALID_FREQUENCY":
            response.status(400).json({
              success: false,
              message:
                "Every medicine must have a valid frequency.",
            });
            return;

          case "INVALID_ROUTE":
            response.status(400).json({
              success: false,
              message:
                "Every medicine must have a valid route.",
            });
            return;

          case "DUPLICATE_PRODUCT":
            response.status(400).json({
              success: false,
              message:
                "The same product cannot appear more than once in a dispensing transaction.",
            });
            return;

          case "DISCOUNT_EXCEEDS_SUBTOTAL":
            response.status(400).json({
              success: false,
              message:
                "Discount cannot exceed the transaction subtotal.",
            });
            return;

          case "INSUFFICIENT_CASH":
            response.status(400).json({
              success: false,
              message:
                "Cash tendered is less than the calculated transaction total.",
            });
            return;

          case "STOCK_CONCURRENCY_CONFLICT":
            response.status(409).json({
              success: false,
              message:
                "Stock changed while this transaction was being processed. Please refresh inventory and try again.",
            });
            return;

          case "INSUFFICIENT_STOCK":
            response.status(409).json({
              success: false,
              message:
                "Insufficient usable stock for one or more selected medicines.",
            });
            return;

          case "INVALID_PRESCRIPTION_ITEM":
            response.status(400).json({
              success: false,
              message:
                "One or more prescription items are invalid.",
            });
            return;
        }

        if (
          error.message.startsWith(
            "INSUFFICIENT_STOCK:",
          )
        ) {
          response.status(409).json({
            success: false,
            message:
              "Insufficient usable stock for one or more selected medicines.",
          });
          return;
        }

        if (
          error.message.startsWith(
            "PRODUCT_INACTIVE:",
          )
        ) {
          response.status(409).json({
            success: false,
            message:
              "One of the selected products is inactive and cannot be dispensed.",
          });
          return;
        }
      }

      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (
          error.code === "P2002"
        ) {
          response.status(409).json({
            success: false,
            message:
              "A transaction with this number already exists. Please try again.",
          });
          return;
        }

        if (
          error.code === "P2025"
        ) {
          response.status(404).json({
            success: false,
            message:
              "A referenced record could not be found.",
          });
          return;
        }

        if (
          error.code === "P2034"
        ) {
          response.status(409).json({
            success: false,
            message:
              "Stock changed while this transaction was being processed. Please refresh inventory and try again.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * PATCH /api/transactions/:id/cancel
 *
 * ADMIN + PHARMACIST
 *
 * Restores every FEFO allocation and records
 * a REVERSAL movement for each affected batch.
 */
router.patch(
  "/:id/cancel",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      const authenticatedUserId =
        request.auth?.sub;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      if (!authenticatedUserId) {
        response.status(401).json({
          success: false,
          message:
            "Authenticated user information is required.",
        });
        return;
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const transaction =
              await tx.dispenseTransaction.findFirst(
                {
                  where: {
                    id:
                      request.params.id,
                    organizationId,
                  },
                  include: {
                    PrescriptionItem: {
                      include: {
                        allocations: true,
                      },
                    },
                  },
                },
              );

            if (!transaction) {
              throw new Error(
                "TRANSACTION_NOT_FOUND",
              );
            }

            if (
              transaction.status ===
              "CANCELLED"
            ) {
              throw new Error(
                "TRANSACTION_ALREADY_CANCELLED",
              );
            }

            if (
              transaction.status !==
              "COMPLETED"
            ) {
              throw new Error(
                "TRANSACTION_NOT_COMPLETED",
              );
            }

            for (
              const item of
                transaction.PrescriptionItem
            ) {
              for (
                const allocation of
                  item.allocations
              ) {
                const batch =
                  await tx.drugBatch.findFirst(
                    {
                      where: {
                        id:
                          allocation.batchId,
                        organizationId,
                        productId:
                          allocation.productId,
                      },
                    },
                  );

                if (!batch) {
                  throw new Error(
                    "BATCH_NOT_FOUND",
                  );
                }

                const previousQty =
                  batch.qty;

                const updated =
                  await tx.drugBatch.updateMany(
                    {
                      where: {
                        id: batch.id,
                        organizationId,
                        productId:
                          allocation.productId,
                      },
                      data: {
                        qty: {
                          increment:
                            allocation.quantity,
                        },
                      },
                    },
                  );

                if (
                  updated.count !==
                  1
                ) {
                  throw new Error(
                    "STOCK_REVERSAL_CONFLICT",
                  );
                }

                await tx.stockMovement.create(
                  {
                    data: {
                      organizationId,
                      productId:
                        allocation.productId,
                      batchId:
                        allocation.batchId,
                      type:
                        "REVERSAL",
                      quantityDelta:
                        allocation.quantity,
                      previousQty,
                      resultingQty:
                        previousQty +
                        allocation.quantity,
                      referenceType:
                        "DispenseTransaction",
                      referenceId:
                        transaction.id,
                      reason:
                        "Dispensing transaction cancelled",
                      userId:
                        authenticatedUserId,
                    },
                  },
                );
              }
            }

            return tx.dispenseTransaction.update(
              {
                where: {
                  id: transaction.id,
                },
                data: {
                  status:
                    "CANCELLED",
                },
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

      const complete =
        await loadTransaction(
          result.id,
          organizationId,
        );

      await recordAudit(
        request,
        {
          action: "CANCEL",
          entity:
            "DispenseTransaction",
          entityId:
            result.id,
          details: {
            transactionNo:
              result.transactionNo,
            status:
              result.status,
          },
        },
      );

      response.json({
        success: true,
        data:
          buildTransactionResponse(
            complete ?? result,
          ),
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
        switch (error.message) {
          case "TRANSACTION_NOT_FOUND":
            response.status(404).json({
              success: false,
              message:
                "Transaction not found.",
            });
            return;

          case "TRANSACTION_ALREADY_CANCELLED":
            response.status(409).json({
              success: false,
              message:
                "This transaction has already been cancelled.",
            });
            return;

          case "TRANSACTION_NOT_COMPLETED":
            response.status(409).json({
              success: false,
              message:
                "Only completed transactions can be cancelled.",
            });
            return;

          case "BATCH_NOT_FOUND":
            response.status(404).json({
              success: false,
              message:
                "A batch associated with this transaction could not be found.",
            });
            return;

          case "STOCK_REVERSAL_CONFLICT":
            response.status(409).json({
              success: false,
              message:
                "Stock changed while the cancellation was being processed. Please try again.",
            });
            return;
        }
      }

      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (
          error.code === "P2034"
        ) {
          response.status(409).json({
            success: false,
            message:
              "Stock changed while the cancellation was being processed. Please try again.",
          });
          return;
        }

        if (
          error.code === "P2025"
        ) {
          response.status(404).json({
            success: false,
            message:
              "Transaction not found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * PUT /api/transactions/:id
 *
 * Kept for compatibility, but completed transactions
 * should use the cancellation endpoint rather than
 * directly changing status.
 */
router.put(
  "/:id",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        response.status(403).json({
          success: false,
          message:
            "An active organization context is required.",
        });
        return;
      }

      const existing =
        await prisma.dispenseTransaction.findFirst(
          {
            where: {
              id:
                request.params.id,
              organizationId,
            },
          },
        );

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "Transaction not found.",
        });
        return;
      }

      const body =
        request.body ?? {};

      if (
        body.status ===
        "CANCELLED"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Use the transaction cancellation endpoint to cancel a completed dispensing transaction.",
        });
        return;
      }

      if (
        body.status !==
          "COMPLETED" &&
        body.status !==
          "PENDING"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Status must be COMPLETED or PENDING.",
        });
        return;
      }

      const transaction =
        await prisma.dispenseTransaction.update(
          {
            where: {
              id: existing.id,
            },
            data: {
              status:
                body.status,
            },
          },
        );

      await recordAudit(
        request,
        {
          action: "UPDATE",
          entity:
            "DispenseTransaction",
          entityId:
            transaction.id,
          details: {
            transactionNo:
              transaction.transactionNo,
            status:
              transaction.status,
          },
        },
      );

      response.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;