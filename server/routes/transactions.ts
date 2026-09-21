import { Router } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../prisma";
import {
  authenticate,
  requireOrganizationContext,
  requireRole,
} from "../middleware/auth";
import { recordAudit } from "../middleware/audit";

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

const calculateDrugStatus = (
  qty: number,
  expiryDate: Date,
):
  | "IN_STOCK"
  | "LOW_STOCK"
  | "EXPIRED"
  | "OUT_OF_STOCK" => {
  const now = new Date();

  if (expiryDate < now) {
    return "EXPIRED";
  }

  if (qty <= 0) {
    return "OUT_OF_STOCK";
  }

  if (qty <= 10) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
};

/**
 * GET /api/transactions
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Only transactions belonging to the current
 * organization are returned.
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
            PrescriptionItem: true,
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
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/transactions/:id
 *
 * ADMIN + PHARMACIST + CLINICIAN
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
        await prisma.dispenseTransaction.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
          include: {
            PrescriptionItem: true,
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
        });

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
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/transactions
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Creates a transaction inside the authenticated
 * organization.
 *
 * Patients and drugs are explicitly checked against
 * the same organization before anything is written.
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
        id,
        transactionNo,
        date,
        patientType,
        patientName,
        phone,
        clinicianName,
        prescriptionDate,
        diagnosis,
        subtotal,
        discount,
        totalAmount,
        paymentMethod,
        cashTendered,
        changeAmount,
        mpesaCode,
        status,
        patientId,
        items,
        prescriptionItems,
      } = body;

      if (
        typeof transactionNo !==
          "string" ||
        !transactionNo.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Transaction number is required.",
        });
        return;
      }

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

      const parsedSubtotal =
        parseNonNegativeNumber(
          subtotal,
        );

      const parsedDiscount =
        discount === undefined
          ? 0
          : parseNonNegativeNumber(
              discount,
            );

      const parsedTotalAmount =
        parseNonNegativeNumber(
          totalAmount,
        );

      if (
        parsedSubtotal ===
          undefined ||
        parsedDiscount ===
          undefined ||
        parsedTotalAmount ===
          undefined
      ) {
        response.status(400).json({
          success: false,
          message:
            "Subtotal, discount, and total amount must be valid non-negative amounts.",
        });
        return;
      }

      let parsedCashTendered:
        | number
        | null = null;

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

      let parsedChangeAmount:
        | number
        | null = null;

      if (
        changeAmount !== undefined &&
        changeAmount !== null &&
        changeAmount !== ""
      ) {
        parsedChangeAmount =
          parseNonNegativeNumber(
            changeAmount,
          );

        if (
          parsedChangeAmount ===
          undefined
        ) {
          response.status(400).json({
            success: false,
            message:
              "Change amount must be a valid non-negative amount.",
          });
          return;
        }
      }

      const parsedDate =
        date !== undefined
          ? parseDate(date)
          : new Date();

      if (!parsedDate) {
        response.status(400).json({
          success: false,
          message:
            "Invalid transaction date.",
        });
        return;
      }

      let parsedPrescriptionDate:
        | Date
        | null = null;

      if (
        prescriptionDate !==
          undefined &&
        prescriptionDate !== null &&
        prescriptionDate !== ""
      ) {
        parsedPrescriptionDate =
          parseDate(
            prescriptionDate,
          ) ?? null;

        if (
          !parsedPrescriptionDate
        ) {
          response.status(400).json({
            success: false,
            message:
              "Invalid prescription date.",
          });
          return;
        }
      }

      const rawItems =
        Array.isArray(items)
          ? items
          : Array.isArray(
                prescriptionItems,
              )
            ? prescriptionItems
            : [];

      if (rawItems.length === 0) {
        response.status(400).json({
          success: false,
          message:
            "At least one prescription item is required.",
        });
        return;
      }

      if (
        patientType ===
        "REGISTERED"
      ) {
        if (
          typeof patientId !==
            "string" ||
          !patientId.trim()
        ) {
          response.status(400).json({
            success: false,
            message:
              "A patient ID is required for a registered patient.",
          });
          return;
        }
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            /**
             * Verify the authenticated user exists.
             *
             * The user must also have a membership in the
             * current organization.
             */
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

            /**
             * Verify patient ownership.
             */
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
                      id: patientId.trim(),
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

            /**
             * Validate every drug against the current
             * organization before creating anything.
             */
            const normalizedItems: Array<{
              drugId: string;
              drugCode: string;
              drugName: string;
              batchNo: string;
              expiryDate: Date;
              availableQty: number;
              qty: number;
              unitPrice: Prisma.Decimal;
              frequency:
                | "OD"
                | "BD_BID"
                | "TID"
                | "QID"
                | "STAT"
                | "PRN"
                | "Q4H"
                | "Q6H"
                | "Q8H"
                | "Q12H"
                | "ON";
              route:
                | "ORAL"
                | "TOPICAL"
                | "INTRAVENOUS"
                | "INTRAMUSCULAR"
                | "SUBCUTANEOUS"
                | "INHALATION"
                | "OPHTHALMIC"
                | "OTIC"
                | "RECTAL"
                | "SUBLINGUAL";
              duration: number;
              durationUnit: string;
              specialInstructions:
                | string
                | null;
              lineTotal: Prisma.Decimal;
            }> = [];

            for (
              const rawItem of rawItems
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

              const drugId =
                typeof item.drugId ===
                  "string"
                  ? item.drugId.trim()
                  : "";

              if (!drugId) {
                throw new Error(
                  "INVALID_DRUG_ID",
                );
              }

              const drug =
                await tx.drug.findFirst(
                  {
                    where: {
                      id: drugId,
                      organizationId,
                    },
                  },
                );

              if (!drug) {
                throw new Error(
                  "DRUG_NOT_FOUND",
                );
              }

              const qty =
                parsePositiveInteger(
                  item.qty,
                );

              if (qty === undefined) {
                throw new Error(
                  "INVALID_ITEM_QUANTITY",
                );
              }

              if (
                qty > drug.qty
              ) {
                throw new Error(
                  `INSUFFICIENT_STOCK:${drug.id}`,
                );
              }

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

              const frequency =
                frequencyValues.includes(
                  item.frequency as
                    (typeof frequencyValues)[number],
                )
                  ? (item.frequency as
                      (typeof frequencyValues)[number])
                  : "OD";

              const route =
                routeValues.includes(
                  item.route as
                    (typeof routeValues)[number],
                )
                  ? (item.route as
                      (typeof routeValues)[number])
                  : "ORAL";

              const duration =
                parsePositiveInteger(
                  item.duration,
                ) ?? 1;

              const durationUnit =
                typeof item.durationUnit ===
                    "string" &&
                item.durationUnit.trim()
                  ? item.durationUnit.trim()
                  : "days";

              const unitPrice =
                new Prisma.Decimal(
                  item.unitPrice !==
                    undefined
                    ? Number(
                        item.unitPrice,
                      )
                    : Number(
                        drug.sellingPrice,
                      ),
                );

              if (
                !unitPrice.isFinite() ||
                unitPrice.lt(0)
              ) {
                throw new Error(
                  "INVALID_UNIT_PRICE",
                );
              }

              const lineTotal =
                item.lineTotal !==
                    undefined
                  ? new Prisma.Decimal(
                      Number(
                        item.lineTotal,
                      ),
                    )
                  : unitPrice.mul(qty);

              if (
                !lineTotal.isFinite() ||
                lineTotal.lt(0)
              ) {
                throw new Error(
                  "INVALID_LINE_TOTAL",
                );
              }

              normalizedItems.push({
                drugId: drug.id,
                drugCode: drug.code,
                drugName: drug.name,
                batchNo: drug.batchNo,
                expiryDate:
                  drug.expiryDate,
                availableQty:
                  drug.qty,
                qty,
                unitPrice,
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
                lineTotal,
              });
            }

            const transaction =
              await tx.dispenseTransaction.create(
                {
                  data: {
                    id:
                      typeof id ===
                          "string" &&
                      id.trim()
                        ? id.trim()
                        : undefined,
                    transactionNo:
                      transactionNo.trim(),
                    date: parsedDate,
                    patientType,
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
                      parsedPrescriptionDate,
                    diagnosis:
                      typeof diagnosis ===
                          "string" &&
                      diagnosis.trim()
                        ? diagnosis.trim()
                        : null,
                    subtotal:
                      new Prisma.Decimal(
                        parsedSubtotal.toFixed(
                          2,
                        ),
                      ),
                    discount:
                      new Prisma.Decimal(
                        parsedDiscount.toFixed(
                          2,
                        ),
                      ),
                    totalAmount:
                      new Prisma.Decimal(
                        parsedTotalAmount.toFixed(
                          2,
                        ),
                      ),
                    paymentMethod,
                    cashTendered:
                      parsedCashTendered ===
                      null
                        ? null
                        : new Prisma.Decimal(
                            parsedCashTendered.toFixed(
                              2,
                            ),
                          ),
                    changeAmount:
                      parsedChangeAmount ===
                      null
                        ? null
                        : new Prisma.Decimal(
                            parsedChangeAmount.toFixed(
                              2,
                            ),
                          ),
                    mpesaCode:
                      typeof mpesaCode ===
                          "string" &&
                      mpesaCode.trim()
                        ? mpesaCode.trim()
                        : null,
                    status:
                      status ===
                        "CANCELLED" ||
                      status ===
                        "PENDING"
                        ? status
                        : "COMPLETED",
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
              const item of normalizedItems
            ) {
              await tx.prescriptionItem.create(
                {
                  data: {
                    id:
                      typeof crypto !==
                        "undefined"
                        ? crypto.randomUUID()
                        : `${transaction.id}-${item.drugId}-${Date.now()}`,
                    drugId:
                      item.drugId,
                    drugCode:
                      item.drugCode,
                    drugName:
                      item.drugName,
                    batchNo:
                      item.batchNo,
                    expiryDate:
                      item.expiryDate,
                    availableQty:
                      item.availableQty,
                    qty: item.qty,
                    unitPrice:
                      item.unitPrice,
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
                    lineTotal:
                      item.lineTotal,
                    transactionId:
                      transaction.id,
                  },
                },
              );

              const drug =
                await tx.drug.findFirst(
                  {
                    where: {
                      id: item.drugId,
                      organizationId,
                    },
                  },
                );

              if (!drug) {
                throw new Error(
                  "DRUG_NOT_FOUND",
                );
              }

              const newQty =
                drug.qty - item.qty;

              await tx.drug.update({
                where: {
                  id: drug.id,
                },
                data: {
                  qty: newQty,
                  status:
                    calculateDrugStatus(
                      newQty,
                      drug.expiryDate,
                    ),
                },
              });
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
        );

      await recordAudit(
        request,
        {
          action: "CREATE",
          entity:
            "DispenseTransaction",
          entityId: result.id,
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
        data: result,
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

          case "DRUG_NOT_FOUND":
            response.status(404).json({
              success: false,
              message:
                "One of the selected drugs was not found in the current organization.",
            });
            return;

          case "INVALID_PRESCRIPTION_ITEM":
            response.status(400).json({
              success: false,
              message:
                "One or more prescription items are invalid.",
            });
            return;

          case "INVALID_DRUG_ID":
            response.status(400).json({
              success: false,
              message:
                "A valid drug ID is required for every prescription item.",
            });
            return;

          case "INVALID_ITEM_QUANTITY":
            response.status(400).json({
              success: false,
              message:
                "Every prescription item must have a valid positive quantity.",
            });
            return;

          case "INVALID_UNIT_PRICE":
            response.status(400).json({
              success: false,
              message:
                "Every prescription item must have a valid unit price.",
            });
            return;

          case "INVALID_LINE_TOTAL":
            response.status(400).json({
              success: false,
              message:
                "Every prescription item must have a valid line total.",
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
              "Insufficient stock for one or more selected drugs.",
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
              "A transaction with this transaction number already exists.",
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
      }

      next(error);
    }
  },
);

/**
 * PUT /api/transactions/:id
 *
 * Transaction records are operational records and should
 * not normally be edited after dispensing.
 *
 * Only ADMIN and PHARMACIST are allowed to change the
 * transaction status.
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
              id: request.params.id,
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
        body.status !==
          "COMPLETED" &&
        body.status !==
          "CANCELLED" &&
        body.status !==
          "PENDING"
      ) {
        response.status(400).json({
          success: false,
          message:
            "Status must be COMPLETED, CANCELLED, or PENDING.",
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
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
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

export default router;