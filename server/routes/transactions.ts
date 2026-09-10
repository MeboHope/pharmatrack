import { Router } from "express";

import { prisma } from "../prisma";
import {
  authenticate,
  requireRole,
} from "../middleware/auth";
import { recordAudit } from "../middleware/audit";

const router = Router();

router.use(authenticate);

const pharmacyStaff = requireRole(
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
);

const pharmacistOnly = requireRole(
  "ADMIN",
  "PHARMACIST",
);

router.get(
  "/",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const transactions =
        await prisma.dispenseTransaction.findMany({
          include: {
            items: true,
            patient: true,
            user: {
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

router.get(
  "/:id",
  pharmacyStaff,
  async (request, response, next) => {
    try {
      const transaction =
        await prisma.dispenseTransaction.findUnique({
          where: {
            id: request.params.id,
          },
          include: {
            items: true,
            patient: true,
            user: {
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
          message: "Transaction not found.",
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

router.post(
  "/",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const {
        transactionNo,
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
      } = request.body ?? {};

      if (
        typeof patientName !== "string" ||
        !patientName.trim()
      ) {
        response.status(400).json({
          success: false,
          message: "Patient name is required.",
        });
        return;
      }

      if (
        typeof clinicianName !== "string" ||
        !clinicianName.trim()
      ) {
        response.status(400).json({
          success: false,
          message: "Clinician name is required.",
        });
        return;
      }

      if (
        !paymentMethod ||
        !["CASH", "MPESA"].includes(
          String(paymentMethod),
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid payment method is required.",
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
            "At least one transaction item is required.",
        });
        return;
      }

      const parsedItems = items.map(
        (
          item: Record<string, unknown>,
        ) => ({
          drugId: String(item.drugId ?? ""),
          drugCode: String(
            item.drugCode ?? "",
          ),
          drugName: String(
            item.drugName ?? "",
          ),
          batchNo: String(
            item.batchNo ?? "",
          ),
          expiryDate: String(
            item.expiryDate ?? "",
          ),
          availableQty: Number(
            item.availableQty ?? 0,
          ),
          qty: Number(item.qty),
          unitPrice: Number(
            item.unitPrice ?? 0,
          ),
          frequency: item.frequency,
          route: item.route,
          duration: Number(
            item.duration ?? 0,
          ),
          durationUnit: String(
            item.durationUnit ?? "Days",
          ),
          specialInstructions:
            item.specialInstructions
              ? String(
                  item.specialInstructions,
                )
              : undefined,
          lineTotal: Number(
            item.lineTotal ?? 0,
          ),
        }),
      );

      for (const item of parsedItems) {
        if (
          !item.drugId ||
          !Number.isInteger(item.qty) ||
          item.qty <= 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Each transaction item must contain a valid drug and positive quantity.",
          });
          return;
        }

        if (
          !Number.isFinite(
            item.unitPrice,
          ) ||
          item.unitPrice < 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Each transaction item must contain a valid unit price.",
          });
          return;
        }

        if (
          !Number.isFinite(
            item.lineTotal,
          ) ||
          item.lineTotal < 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Each transaction item must contain a valid line total.",
          });
          return;
        }
      }

      if (
        patientId !== undefined &&
        patientId !== null &&
        typeof patientId !== "string"
      ) {
        response.status(400).json({
          success: false,
          message: "Invalid patient ID.",
        });
        return;
      }

      const parsedSubtotal = Number(
        subtotal ?? 0,
      );
      const parsedDiscount = Number(
        discount ?? 0,
      );
      const parsedTotalAmount = Number(
        totalAmount ?? 0,
      );

      if (
        !Number.isFinite(
          parsedSubtotal,
        ) ||
        parsedSubtotal < 0 ||
        !Number.isFinite(
          parsedDiscount,
        ) ||
        parsedDiscount < 0 ||
        !Number.isFinite(
          parsedTotalAmount,
        ) ||
        parsedTotalAmount < 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invalid transaction totals.",
        });
        return;
      }

      const transaction =
        await prisma.$transaction(
          async (database) => {
            if (patientId) {
              const patient =
                await database.patient.findUnique(
                  {
                    where: {
                      id: patientId,
                    },
                  },
                );

              if (!patient) {
                throw new Error(
                  "The selected patient was not found.",
                );
              }
            }

            const drugSnapshots: Array<{
              id: string;
              code: string;
              name: string;
              batchNo: string;
              expiryDate: Date;
              availableQty: number;
              qty: number;
            }> = [];

            for (const item of parsedItems) {
              const drug =
                await database.drug.findUnique({
                  where: {
                    id: item.drugId,
                  },
                });

              if (!drug) {
                throw new Error(
                  `Drug ${item.drugId} was not found.`,
                );
              }

              if (
                drug.status ===
                "EXPIRED"
              ) {
                throw new Error(
                  `${drug.name} has expired and cannot be dispensed.`,
                );
              }

              if (
                drug.qty < item.qty
              ) {
                throw new Error(
                  `Insufficient stock for ${drug.name}. Available quantity: ${drug.qty}.`,
                );
              }

              drugSnapshots.push({
                id: drug.id,
                code: drug.code,
                name: drug.name,
                batchNo: drug.batchNo,
                expiryDate:
                  drug.expiryDate,
                availableQty: drug.qty,
                qty: item.qty,
              });
            }

            const finalTransactionNo =
              typeof transactionNo ===
                "string" &&
              transactionNo.trim()
                ? transactionNo
                    .trim()
                : `TXN-${Date.now()}`;

            const created =
              await database.dispenseTransaction.create(
                {
                  data: {
                    transactionNo:
                      finalTransactionNo,

                    patientType:
                      patientType ===
                      "REGISTERED"
                        ? "REGISTERED"
                        : "WALK_IN",

                    patientName:
                      patientName.trim(),

                    phone:
                      typeof phone ===
                        "string" &&
                      phone.trim()
                        ? phone.trim()
                        : undefined,

                    clinicianName:
                      clinicianName.trim(),

                    prescriptionDate:
                      prescriptionDate
                        ? new Date(
                            String(
                              prescriptionDate,
                            ),
                          )
                        : undefined,

                    diagnosis:
                      typeof diagnosis ===
                        "string" &&
                      diagnosis.trim()
                        ? diagnosis.trim()
                        : undefined,

                    subtotal:
                      parsedSubtotal,

                    discount:
                      parsedDiscount,

                    totalAmount:
                      parsedTotalAmount,

                    paymentMethod:
                      paymentMethod ===
                      "MPESA"
                        ? "MPESA"
                        : "CASH",

                    cashTendered:
                      cashTendered !==
                        undefined &&
                      cashTendered !==
                        null
                        ? Number(
                            cashTendered,
                          )
                        : undefined,

                    changeAmount:
                      changeAmount !==
                        undefined &&
                      changeAmount !==
                        null
                        ? Number(
                            changeAmount,
                          )
                        : undefined,

                    mpesaCode:
                      typeof mpesaCode ===
                        "string" &&
                      mpesaCode.trim()
                        ? mpesaCode.trim()
                        : undefined,

                    status:
                      status ===
                      "PENDING"
                        ? "PENDING"
                        : status ===
                            "CANCELLED"
                          ? "CANCELLED"
                          : "COMPLETED",

                    patientId:
                      patientId ||
                      undefined,

                    userId:
                      request.auth?.sub,

                    items: {
                      create:
                        parsedItems.map(
                          (
                            item,
                            index,
                          ) => {
                            const drug =
                              drugSnapshots[
                                index
                              ];

                            return {
                              drugId:
                                drug.id,

                              drugCode:
                                drug.code,

                              drugName:
                                drug.name,

                              batchNo:
                                drug.batchNo,

                              expiryDate:
                                drug.expiryDate,

                              availableQty:
                                drug.availableQty,

                              qty:
                                item.qty,

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
                            };
                          },
                        ),
                    },
                  },

                  include: {
                    items: true,
                  },
                },
              );

            for (const item of parsedItems) {
              const drug =
                await database.drug.findUnique({
                  where: {
                    id: item.drugId,
                  },
                });

              if (!drug) {
                throw new Error(
                  `Drug ${item.drugId} was not found.`,
                );
              }

              const newQty =
                drug.qty -
                item.qty;

              const newStatus =
                newQty === 0
                  ? "OUT_OF_STOCK"
                  : newQty <= 10
                    ? "LOW_STOCK"
                    : "IN_STOCK";

              await database.drug.update({
                where: {
                  id: drug.id,
                },
                data: {
                  qty: newQty,
                  status:
                    newStatus,
                },
              });
            }

            if (patientId) {
              await database.patient.update(
                {
                  where: {
                    id: patientId,
                  },
                  data: {
                    totalVisits: {
                      increment: 1,
                    },
                  },
                },
              );
            }

            return created;
          },
        );

      await recordAudit(
        request,
        {
          action:
            "TRANSACTION_CREATED",
          entity:
            "DispenseTransaction",
          entityId:
            transaction.id,
          details: {
            transactionNo:
              transaction.transactionNo,
            patientName:
              transaction.patientName,
            totalAmount:
              transaction.totalAmount,
            paymentMethod:
              transaction.paymentMethod,
            itemCount:
              transaction.items.length,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;