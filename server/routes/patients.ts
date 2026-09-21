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

const patientStaff = requireRole(
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
);

const adminOnly = requireRole("ADMIN");

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const parseOptionalAge = (
  value: unknown,
): number | null | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const age = Number(value);

  if (
    !Number.isInteger(age) ||
    age < 0 ||
    age > 150
  ) {
    return undefined;
  }

  return age;
};

const normalizeGender = (
  value: unknown,
):
  | "MALE"
  | "FEMALE"
  | "OTHER"
  | null
  | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    value === "MALE" ||
    value === "FEMALE" ||
    value === "OTHER"
  ) {
    return value;
  }

  return undefined;
};

/**
 * GET /api/patients
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Only patients belonging to the authenticated
 * user's organization are returned.
 */
router.get(
  "/",
  patientStaff,
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

      const patients =
        await prisma.patient.findMany({
          where: {
            organizationId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      response.json({
        success: true,
        data: patients,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/patients/:id
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * Organization ownership is checked as part of
 * the database lookup.
 */
router.get(
  "/:id",
  patientStaff,
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

      const patient =
        await prisma.patient.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
        });

      if (!patient) {
        response.status(404).json({
          success: false,
          message: "Patient not found.",
        });
        return;
      }

      response.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/patients
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * organizationId is taken from the authenticated
 * organization context and cannot be supplied by
 * the client.
 */
router.post(
  "/",
  patientStaff,
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
        phone,
        email,
        age,
        gender,
        address,
        allergies,
      } = body;

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        response.status(400).json({
          success: false,
          message:
            "Patient name is required.",
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
            "Patient phone number is required.",
        });
        return;
      }

      if (
        email !== undefined &&
        email !== null &&
        email !== ""
      ) {
        if (
          typeof email !== "string" ||
          !isValidEmail(email.trim())
        ) {
          response.status(400).json({
            success: false,
            message:
              "A valid email address is required.",
          });
          return;
        }
      }

      const parsedAge =
        parseOptionalAge(age);

      if (
        parsedAge === undefined
      ) {
        response.status(400).json({
          success: false,
          message:
            "Age must be a valid whole number between 0 and 150.",
        });
        return;
      }

      const parsedGender =
        normalizeGender(gender);

      if (
        parsedGender === undefined
      ) {
        response.status(400).json({
          success: false,
          message:
            "Gender must be MALE, FEMALE, or OTHER.",
        });
        return;
      }

      const patientId =
        typeof id === "string" &&
        id.trim()
          ? id.trim()
          : undefined;

      const patient =
        await prisma.patient.create({
          data: {
            ...(patientId && { id: patientId }),
            name: name.trim(),
            phone: phone.trim(),
            email:
              typeof email ===
                "string" &&
              email.trim()
                ? email.trim()
                : null,
            age: parsedAge,
            gender: parsedGender,
            address:
              typeof address ===
                "string" &&
              address.trim()
                ? address.trim()
                : null,
            allergies:
              typeof allergies ===
                "string" &&
              allergies.trim()
                ? allergies.trim()
                : null,
            organizationId,
          },
        });

      await recordAudit(
        request,
        {
          action: "CREATE",
          entity: "Patient",
          entityId: patient.id,
          details: {
            name: patient.name,
            phone: patient.phone,
          },
        },
      );

      response.status(201).json({
        success: true,
        data: patient,
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
              "A patient with this identifier already exists.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * PUT /api/patients/:id
 *
 * ADMIN + PHARMACIST + CLINICIAN
 *
 * The existing patient must belong to the
 * authenticated organization before it can be changed.
 */
router.put(
  "/:id",
  patientStaff,
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
        await prisma.patient.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message: "Patient not found.",
        });
        return;
      }

      const body =
        request.body ?? {};

      const data:
        Prisma.PatientUpdateInput = {};

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
              "Patient name cannot be empty.",
          });
          return;
        }

        data.name =
          body.name.trim();
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
              "Patient phone number cannot be empty.",
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
          body.email !== null &&
          body.email !== ""
        ) {
          if (
            typeof body.email !==
              "string" ||
            !isValidEmail(
              body.email.trim(),
            )
          ) {
            response.status(400).json({
              success: false,
              message:
                "A valid email address is required.",
            });
            return;
          }

          data.email =
            body.email.trim();
        } else {
          data.email = null;
        }
      }

      if (
        body.age !== undefined
      ) {
        const parsedAge =
          parseOptionalAge(
            body.age,
          );

        if (
          parsedAge === undefined
        ) {
          response.status(400).json({
            success: false,
            message:
              "Age must be a valid whole number between 0 and 150.",
          });
          return;
        }

        data.age = parsedAge;
      }

      if (
        body.gender !== undefined
      ) {
        const parsedGender =
          normalizeGender(
            body.gender,
          );

        if (
          parsedGender === undefined
        ) {
          response.status(400).json({
            success: false,
            message:
              "Gender must be MALE, FEMALE, or OTHER.",
          });
          return;
        }

        data.gender =
          parsedGender;
      }

      if (
        body.address !== undefined
      ) {
        data.address =
          typeof body.address ===
            "string" &&
          body.address.trim()
            ? body.address.trim()
            : null;
      }

      if (
        body.allergies !==
        undefined
      ) {
        data.allergies =
          typeof body.allergies ===
            "string" &&
          body.allergies.trim()
            ? body.allergies.trim()
            : null;
      }

      const patient =
        await prisma.patient.update({
          where: {
            id: existing.id,
          },
          data,
        });

      await recordAudit(
        request,
        {
          action: "UPDATE",
          entity: "Patient",
          entityId: patient.id,
          details: {
            name: patient.name,
            phone: patient.phone,
          },
        },
      );

      response.json({
        success: true,
        data: patient,
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
              "Patient not found.",
          });
          return;
        }

        if (
          error.code === "P2002"
        ) {
          response.status(409).json({
            success: false,
            message:
              "A patient with this identifier already exists.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

/**
 * DELETE /api/patients/:id
 *
 * ADMIN ONLY
 *
 * Only patients belonging to the authenticated
 * organization may be deleted.
 */
router.delete(
  "/:id",
  adminOnly,
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
        await prisma.patient.findFirst({
          where: {
            id: request.params.id,
            organizationId,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message: "Patient not found.",
        });
        return;
      }

      await prisma.patient.delete({
        where: {
          id: existing.id,
        },
      });

      await recordAudit(
        request,
        {
          action: "DELETE",
          entity: "Patient",
          entityId: existing.id,
          details: {
            name: existing.name,
            phone: existing.phone,
          },
        },
      );

      response.json({
        success: true,
        message:
          "Patient deleted successfully.",
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
              "This patient cannot be deleted because they are referenced by existing transactions.",
          });
          return;
        }

        if (
          error.code === "P2025"
        ) {
          response.status(404).json({
            success: false,
            message:
              "Patient not found.",
          });
          return;
        }
      }

      next(error);
    }
  },
);

export default router;