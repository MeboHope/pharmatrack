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

const pharmacistOnly = requireRole(
  "ADMIN",
  "PHARMACIST",
);

/**
 * GET /api/suppliers
 *
 * ADMIN + PHARMACIST
 *
 * Returns only suppliers belonging to the
 * authenticated user's organization.
 */
router.get(
  "/",
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

      const suppliers =
        await prisma.supplier.findMany({
          where: {
            organizationId,
          },
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

/**
 * GET /api/suppliers/:id
 *
 * ADMIN + PHARMACIST
 */
router.get(
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

      const supplier =
        await prisma.supplier.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
        });

      if (!supplier) {
        response.status(404).json({
          success: false,
          message:
            "Supplier not found.",
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

/**
 * POST /api/suppliers
 *
 * ADMIN + PHARMACIST
 *
 * organizationId comes exclusively from the
 * authenticated organization context.
 */
router.post(
  "/",
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

      const body =
        request.body ?? {};

      const {
        id,
        name,
        contactPerson,
        phone,
        email,
        address,
        leadTimeDays,
      } = body;

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Supplier name is required.",
        });
        return;
      }

      if (
        typeof contactPerson !==
          "string" ||
        !contactPerson.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Contact person is required.",
        });
        return;
      }

      if (
        typeof phone !== "string" ||
        !phone.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Supplier phone number is required.",
        });
        return;
      }

      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Supplier email is required.",
        });
        return;
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim(),
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid supplier email address is required.",
        });
        return;
      }

      if (
        typeof address !== "string" ||
        !address.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Supplier address is required.",
        });
        return;
      }

      let parsedLeadTimeDays = 0;

      if (
        leadTimeDays !== undefined
      ) {
        const parsed =
          Number(leadTimeDays);

        if (
          !Number.isInteger(parsed) ||
          parsed < 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Lead time must be a non-negative whole number.",
          });
          return;
        }

        parsedLeadTimeDays = parsed;
      }

      const supplier =
        await prisma.supplier.create({
          data: {
            id:
              typeof id === "string" &&
              id.trim()
                ? id.trim()
                : undefined,
            name: name.trim(),
            contactPerson:
              contactPerson.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            leadTimeDays:
              parsedLeadTimeDays,
            organizationId,
          },
        });

      await recordAudit(
        request,
        {
          action: "CREATE",
          entity: "Supplier",
          entityId: supplier.id,
          details: {
            name: supplier.name,
            contactPerson:
              supplier.contactPerson,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
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
              "A supplier with this identifier already exists.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * PUT /api/suppliers/:id
 *
 * ADMIN + PHARMACIST
 *
 * Existing supplier must belong to the current
 * organization before it can be modified.
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
        await prisma.supplier.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "Supplier not found.",
        });
        return;
      }

      const body =
        request.body ?? {};

      const data:
        Prisma.SupplierUpdateInput = {};

      if (
        body.name !== undefined
      ) {
        if (
          typeof body.name !==
            "string" ||
          !body.name.trim()
        ) {
          response.status(400).json({
            success: false,
            message:
              "Supplier name cannot be empty.",
          });
          return;
        }

        data.name =
          body.name.trim();
      }

      if (
        body.contactPerson !==
        undefined
      ) {
        if (
          typeof body.contactPerson !==
            "string" ||
          !body.contactPerson.trim()
        ) {
          response.status(400).json({
            success: false,
            message:
              "Contact person cannot be empty.",
          });
          return;
        }

        data.contactPerson =
          body.contactPerson.trim();
      }

      if (
        body.phone !== undefined
      ) {
        if (
          typeof body.phone !==
            "string" ||
          !body.phone.trim()
        ) {
          response.status(400).json({
            success: false,
            message:
              "Supplier phone number cannot be empty.",
          });
          return;
        }

        data.phone =
          body.phone.trim();
      }

      if (
        body.email !== undefined
      ) {
        if (
          typeof body.email !==
            "string" ||
          !body.email.trim()
        ) {
          response.status(400).json({
            success: false,
            message:
              "Supplier email cannot be empty.",
          });
          return;
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            body.email.trim(),
          )
        ) {
          response.status(400).json({
            success: false,
            message:
              "A valid supplier email address is required.",
          });
          return;
        }

        data.email =
          body.email.trim();
      }

      if (
        body.address !== undefined
      ) {
        if (
          typeof body.address !==
            "string" ||
          !body.address.trim()
        ) {
          response.status(400).json({
            success: false,
            message:
              "Supplier address cannot be empty.",
          });
          return;
        }

        data.address =
          body.address.trim();
      }

      if (
        body.leadTimeDays !==
        undefined
      ) {
        const parsed =
          Number(
            body.leadTimeDays,
          );

        if (
          !Number.isInteger(parsed) ||
          parsed < 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Lead time must be a non-negative whole number.",
          });
          return;
        }

        data.leadTimeDays =
          parsed;
      }

      const supplier =
        await prisma.supplier.update({
          where: {
            id: existing.id,
          },
          data,
        });

      await recordAudit(
        request,
        {
          action: "UPDATE",
          entity: "Supplier",
          entityId: supplier.id,
          details: {
            name: supplier.name,
            contactPerson:
              supplier.contactPerson,
          },
        },
      );

      response.json({
        success: true,
        data: supplier,
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
              "Supplier not found.",
          });
          return;
        }

        if (
          error.code === "P2002"
        ) {
          response.status(409).json({
            success: false,
            message:
              "A supplier with this identifier already exists.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * DELETE /api/suppliers/:id
 *
 * ADMIN + PHARMACIST
 */
router.delete(
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
        await prisma.supplier.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "Supplier not found.",
        });
        return;
      }

      await prisma.supplier.delete({
        where: {
          id: existing.id,
        },
      });

      await recordAudit(
        request,
        {
          action: "DELETE",
          entity: "Supplier",
          entityId: existing.id,
          details: {
            name: existing.name,
            contactPerson:
              existing.contactPerson,
          },
        },
      );

      response.json({
        success: true,
        message:
          "Supplier deleted successfully.",
      });
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (
          error.code === "P2003"
        ) {
          response.status(409).json({
            success: false,
            message:
              "This supplier cannot be deleted because it is referenced by existing records.",
          });
          return;
        }

        if (
          error.code === "P2025"
        ) {
          response.status(404).json({
            success: false,
            message:
              "Supplier not found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

export default router;