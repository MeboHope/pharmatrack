import { Router } from "express";

import { prisma } from "../prisma.js";

import {
  authenticate,
  requireRole,
} from "../middleware/auth.js";

import { recordAudit } from "../middleware/audit.js";

const router = Router();

router.use(authenticate);

const patientStaff = requireRole(
  "ADMIN",
  "PHARMACIST",
  "CLINICIAN",
);

const adminOnly = requireRole("ADMIN");

router.get(
  "/",
  patientStaff,
  async (_request, response, next) => {
    try {
      const patients =
        await prisma.patient.findMany({
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

router.get(
  "/:id",
  patientStaff,
  async (request, response, next) => {
    try {
      const patient =
        await prisma.patient.findUnique({
          where: {
            id: request.params.id,
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

router.post(
  "/",
  patientStaff,
  async (request, response, next) => {
    try {
      const {
        name,
        phone,
        email,
        age,
        gender,
        address,
        allergies,
      } = request.body ?? {};

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

      let parsedAge:
        | number
        | undefined;

      if (
        age !== undefined &&
        age !== null &&
        age !== ""
      ) {
        parsedAge = Number(age);

        if (
          !Number.isInteger(parsedAge) ||
          parsedAge < 0 ||
          parsedAge > 150
        ) {
          response.status(400).json({
            success: false,
            message:
              "Patient age must be a valid whole number between 0 and 150.",
          });
          return;
        }
      }

      const validGenders = [
        "MALE",
        "FEMALE",
        "OTHER",
      ];

      if (
        gender !== undefined &&
        gender !== null &&
        gender !== "" &&
        !validGenders.includes(
          String(gender).toUpperCase(),
        )
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invalid patient gender.",
        });
        return;
      }

      const patient =
        await prisma.patient.create({
          data: {
            name: name.trim(),
            phone: phone.trim(),
            email:
              typeof email === "string" &&
              email.trim()
                ? email.trim().toLowerCase()
                : null,
            age: parsedAge,
            gender:
              gender !== undefined &&
              gender !== null &&
              gender !== ""
                ? String(gender).toUpperCase() as
                    "MALE" |
                    "FEMALE" |
                    "OTHER"
                : undefined,
            address:
              typeof address === "string" &&
              address.trim()
                ? address.trim()
                : null,
            allergies:
              typeof allergies === "string" &&
              allergies.trim()
                ? allergies.trim()
                : null,
          },
        });

      await recordAudit(request, {
        action: "PATIENT_CREATED",
        entity: "Patient",
        entityId: patient.id,
        details: {
          patientId: patient.id,
          name: patient.name,
        },
      });

      response.status(201).json({
        success: true,
        data: patient,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  patientStaff,
  async (request, response, next) => {
    try {
      const existing =
        await prisma.patient.findUnique({
          where: {
            id: request.params.id,
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

      const data: {
        name?: string;
        phone?: string;
        email?: string | null;
        age?: number | null;
        gender?:
          | "MALE"
          | "FEMALE"
          | "OTHER"
          | null;
        address?: string | null;
        allergies?: string | null;
        totalVisits?: number;
      } = {};

      if (body.name !== undefined) {
        if (
          typeof body.name !== "string" ||
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

      if (body.phone !== undefined) {
        if (
          typeof body.phone !== "string" ||
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

      if (body.email !== undefined) {
        data.email =
          typeof body.email === "string" &&
          body.email.trim()
            ? body.email
                .trim()
                .toLowerCase()
            : null;
      }

      if (body.age !== undefined) {
        if (
          body.age === null ||
          body.age === ""
        ) {
          data.age = null;
        } else {
          const parsedAge =
            Number(body.age);

          if (
            !Number.isInteger(
              parsedAge,
            ) ||
            parsedAge < 0 ||
            parsedAge > 150
          ) {
            response.status(400).json({
              success: false,
              message:
                "Patient age must be a valid whole number between 0 and 150.",
            });
            return;
          }

          data.age = parsedAge;
        }
      }

      if (body.gender !== undefined) {
        if (
          body.gender === null ||
          body.gender === ""
        ) {
          data.gender = null;
        } else {
          const gender =
            String(
              body.gender,
            ).toUpperCase();

          if (
            ![
              "MALE",
              "FEMALE",
              "OTHER",
            ].includes(gender)
          ) {
            response.status(400).json({
              success: false,
              message:
                "Invalid patient gender.",
            });
            return;
          }

          data.gender =
            gender as
              | "MALE"
              | "FEMALE"
              | "OTHER";
        }
      }

      if (body.address !== undefined) {
        data.address =
          typeof body.address === "string" &&
          body.address.trim()
            ? body.address.trim()
            : null;
      }

      if (
        body.allergies !==
        undefined
      ) {
        data.allergies =
          typeof body.allergies === "string" &&
          body.allergies.trim()
            ? body.allergies.trim()
            : null;
      }

      if (
        body.totalVisits !==
        undefined
      ) {
        const totalVisits =
          Number(
            body.totalVisits,
          );

        if (
          !Number.isInteger(
            totalVisits,
          ) ||
          totalVisits < 0
        ) {
          response.status(400).json({
            success: false,
            message:
              "Total visits must be a valid non-negative whole number.",
          });
          return;
        }

        data.totalVisits =
          totalVisits;
      }

      const patient =
        await prisma.patient.update({
          where: {
            id: existing.id,
          },
          data,
        });

      await recordAudit(request, {
        action: "PATIENT_UPDATED",
        entity: "Patient",
        entityId: patient.id,
        details: {
          patientId: patient.id,
          name: patient.name,
        },
      });

      response.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  adminOnly,
  async (request, response, next) => {
    try {
      const existing =
        await prisma.patient.findUnique({
          where: {
            id: request.params.id,
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

      await recordAudit(request, {
        action: "PATIENT_DELETED",
        entity: "Patient",
        entityId: existing.id,
        details: {
          patientId: existing.id,
          name: existing.name,
        },
      });

      response.json({
        success: true,
        message:
          "Patient deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;