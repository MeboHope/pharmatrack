import { Router } from "express";

import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import {
  pharmacistOnly,
  pharmacyStaff,
} from "../middleware/authorize";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  pharmacyStaff,
  async (_request, response) => {
    try {
      const transactions =
        await prisma.dispenseTransaction.findMany({
          include: {
            items: true,
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
      console.error(
        "Failed to fetch transactions:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch transactions.",
      });
    }
  },
);

router.get(
  "/:id",
  pharmacyStaff,
  async (request, response) => {
    try {
      const transaction =
        await prisma.dispenseTransaction.findUnique({
          where: {
            id: request.params.id,
          },
          include: {
            items: true,
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
      console.error(
        "Failed to fetch transaction:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch transaction.",
      });
    }
  },
);

router.post(
  "/",
  pharmacistOnly,
  async (request, response) => {
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
      } = request.body;

      if (
        !patientName ||
        !clinicianName ||
        !paymentMethod ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Incomplete transaction information.",
        });
        return;
      }

      const transaction =
        await prisma.$transaction(
          async (database) => {
            for (const item of items) {
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
                Number(item.qty) <= 0
              ) {
                throw new Error(
                  "Transaction quantity must be greater than zero.",
                );
              }

              if (
                drug.qty <
                Number(item.qty)
              ) {
                throw new Error(
                  `Insufficient stock for ${drug.name}.`,
                );
              }
            }

            const created =
              await database.dispenseTransaction.create(
                {
                  data: {
                    transactionNo:
                      transactionNo ||
                      `TXN-${Date.now()}`,
                    patientType:
                      patientType ||
                      "WALK_IN",
                    patientName:
                      String(
                        patientName,
                      ).trim(),
                    phone:
                      phone
                        ? String(phone).trim()
                        : undefined,
                    clinicianName:
                      String(
                        clinicianName,
                      ).trim(),
                    prescriptionDate:
                      prescriptionDate
                        ? new Date(
                            prescriptionDate,
                          )
                        : undefined,
                    diagnosis:
                      diagnosis
                        ? String(
                            diagnosis,
                          ).trim()
                        : undefined,
                    subtotal:
                      Number(
                        subtotal ?? 0,
                      ),
                    discount:
                      Number(
                        discount ?? 0,
                      ),
                    totalAmount:
                      Number(
                        totalAmount ?? 0,
                      ),
                    paymentMethod,
                    cashTendered:
                      cashTendered !==
                      undefined
                        ? Number(
                            cashTendered,
                          )
                        : undefined,
                    changeAmount:
                      changeAmount !==
                      undefined
                        ? Number(
                            changeAmount,
                          )
                        : undefined,
                    mpesaCode:
                      mpesaCode
                        ? String(
                            mpesaCode,
                          ).trim()
                        : undefined,
                    status:
                      status ||
                      "COMPLETED",
                    patientId:
                      patientId ||
                      undefined,
                    userId:
                      request.user?.id,
                    items: {
                      create:
                        items.map(
                          (
                            item: Record<
                              string,
                              unknown
                            >,
                          ) => ({
                            drugId:
                              String(
                                item.drugId,
                              ),
                            drugCode:
                              String(
                                item.drugCode,
                              ),
                            drugName:
                              String(
                                item.drugName,
                              ),
                            batchNo:
                              String(
                                item.batchNo,
                              ),
                            expiryDate:
                              new Date(
                                String(
                                  item.expiryDate,
                                ),
                              ),
                            availableQty:
                              Number(
                                item.availableQty ??
                                  0,
                              ),
                            qty:
                              Number(
                                item.qty,
                              ),
                            unitPrice:
                              Number(
                                item.unitPrice ??
                                  0,
                              ),
                            frequency:
                              item.frequency,
                            route:
                              item.route,
                            duration:
                              Number(
                                item.duration ??
                                  0,
                              ),
                            durationUnit:
                              String(
                                item.durationUnit ??
                                  "Days",
                              ),
                            specialInstructions:
                              item.specialInstructions
                                ? String(
                                    item.specialInstructions,
                                  )
                                : undefined,
                            lineTotal:
                              Number(
                                item.lineTotal ??
                                  0,
                              ),
                          }),
                        ),
                    },
                  },
                  include: {
                    items: true,
                  },
                },
              );

            for (const item of items) {
              const drug =
                await database.drug.findUnique({
                  where: {
                    id: item.drugId,
                  },
                });

              if (!drug) {
                continue;
              }

              const newQty =
                drug.qty -
                Number(item.qty);

              const status =
                newQty === 0
                  ? "OUT_OF_STOCK"
                  : newQty <= 10
                    ? "LOW_STOCK"
                    : "IN_STOCK";

              await database.drug.update(
                {
                  where: {
                    id: drug.id,
                  },
                  data: {
                    qty: newQty,
                    status,
                  },
                },
              );
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

      response.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error(
        "Failed to create transaction:",
        error,
      );

      response.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to complete transaction.",
      });
    }
  },
);

export default router;