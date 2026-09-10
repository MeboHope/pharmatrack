import { Router } from "express";

import { prisma } from "../prisma";
import {
  authenticate,
  requireRole,
} from "../middleware/auth";
import { recordAudit } from "../middleware/audit";

const router = Router();

router.use(authenticate);

const pharmacistOnly = requireRole(
  "ADMIN",
  "PHARMACIST",
);

router.get(
  "/",
  pharmacistOnly,
  async (_request, response, next) => {
    try {
      const suppliers =
        await prisma.supplier.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });

      response.json({
        success: true,
        data: suppliers,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const supplier =
        await prisma.supplier.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!supplier) {
        response.status(404).json({
          success: false,
          message: "Supplier not found.",
        });
        return;
      }

      response.json({
        success: true,
        data: supplier,
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
        name,
        contactPerson,
        phone,
        email,
        address,
        leadTimeDays,
      } = request.body ?? {};

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof contactPerson !==
          "string" ||
        !contactPerson.trim() ||
        typeof phone !== "string" ||
        !phone.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof address !== "string" ||
        !address.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Required supplier information is missing.",
        });
        return;
      }

      const parsedLeadTime =
        Number(
          leadTimeDays ?? 0,
        );

      if (
        !Number.isInteger(
          parsedLeadTime,
        ) ||
        parsedLeadTime < 0
      ) {
        response.status(400).json({
          success: false,
          message:
            "Lead time must be a non-negative whole number.",
        });
        return;
      }

      const supplier =
        await prisma.supplier.create({
          data: {
            name: name.trim(),
            contactPerson:
              contactPerson.trim(),
            phone: phone.trim(),
            email:
              email.trim().toLowerCase(),
            address: address.trim(),
            leadTimeDays:
              parsedLeadTime,
          },
        });

      await recordAudit(
        request,
        {
          action:
            "SUPPLIER_CREATED",
          entity: "Supplier",
          entityId:
            supplier.id,
          details: {
            name: supplier.name,
            email: supplier.email,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const existing =
        await prisma.supplier.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message: "Supplier not found.",
        });
        return;
      }

      const {
        name,
        contactPerson,
        phone,
        email,
        address,
        leadTimeDays,
      } = request.body ?? {};

      let parsedLeadTime:
        | number
        | undefined;

      if (
        leadTimeDays !==
        undefined
      ) {
        parsedLeadTime =
          Number(
            leadTimeDays,
          );

        if (
          !Number.isInteger(
            parsedLeadTime,
          ) ||
          parsedLeadTime < 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Lead time must be a non-negative whole number.",
          });
          return;
        }
      }

      const updated =
        await prisma.supplier.update({
          where: {
            id: request.params.id,
          },
          data: {
            ...(name !==
              undefined && {
              name:
                String(name).trim(),
            }),

            ...(contactPerson !==
              undefined && {
              contactPerson:
                String(
                  contactPerson,
                ).trim(),
            }),

            ...(phone !==
              undefined && {
              phone:
                String(
                  phone,
                ).trim(),
            }),

            ...(email !==
              undefined && {
              email:
                String(
                  email,
                )
                  .trim()
                  .toLowerCase(),
            }),

            ...(address !==
              undefined && {
              address:
                String(
                  address,
                ).trim(),
            }),

            ...(parsedLeadTime !==
              undefined && {
              leadTimeDays:
                parsedLeadTime,
            }),
          },
        });

      await recordAudit(
        request,
        {
          action:
            "SUPPLIER_UPDATED",
          entity: "Supplier",
          entityId:
            updated.id,
          details: {
            name: updated.name,
            email: updated.email,
          },
        },
      );

      response.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  pharmacistOnly,
  async (request, response, next) => {
    try {
      const existing =
        await prisma.supplier.findUnique({
          where: {
            id: request.params.id,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message: "Supplier not found.",
        });
        return;
      }

      await prisma.supplier.delete({
        where: {
          id: request.params.id,
        },
      });

      await recordAudit(
        request,
        {
          action:
            "SUPPLIER_DELETED",
          entity: "Supplier",
          entityId:
            existing.id,
          details: {
            name: existing.name,
            email: existing.email,
          },
        },
      );

      response.json({
        success: true,
        message:
          "Supplier deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;