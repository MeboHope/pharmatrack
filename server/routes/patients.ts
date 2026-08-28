import { Router } from "express";

import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import {
  adminOnly,
  pharmacyStaff,
} from "../middleware/authorize";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  pharmacyStaff,
  async (_request, response) => {
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
      console.error(
        "Failed to fetch patients:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch patients.",
      });
    }
  },
);

router.get(
  "/:id",
  pharmacyStaff,
  async (request, response) => {
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
      console.error(
        "Failed to fetch patient:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch patient.",
      });
    }
  },
);

router.post(
  "/",
  pharmacyStaff,
  async (request, response) => {
    try {
      const {
        name,
        phone,
        email,
        age,
        gender,
        address,
        allergies,
      } = request.body;

      if (!name || !phone) {
        response.status(400).json({
          success: false,
          message:
            "Patient name and phone are required.",
        });
        return;
      }

      const patient =
        await prisma.patient.create({
          data: {
            name: String(name).trim(),
            phone: String(phone).trim(),
            email:
              email
                ? String(email).trim()
                : undefined,
            age:
              age !== undefined &&
              age !== null &&
              age !== ""
                ? Number(age)
                : undefined,
            gender:
              gender || undefined,
            address:
              address
                ? String(address).trim()
                : undefined,
            allergies:
              allergies
                ? String(allergies).trim()
                : undefined,
          },
        });

      response.status(201).json({
        success: true,
        data: patient,
      });
    } catch (error) {
      console.error(
        "Failed to create patient:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to create patient.",
      });
    }
  },
);

router.put(
  "/:id",
  pharmacyStaff,
  async (request, response) => {
    try {
      const patient =
        await prisma.patient.update({
          where: {
            id: request.params.id,
          },
          data: {
            name:
              request.body.name !== undefined
                ? String(
                    request.body.name,
                  ).trim()
                : undefined,
            phone:
              request.body.phone !== undefined
                ? String(
                    request.body.phone,
                  ).trim()
                : undefined,
            email:
              request.body.email !== undefined
                ? request.body.email
                : undefined,
            age:
              request.body.age !== undefined
                ? Number(
                    request.body.age,
                  )
                : undefined,
            gender:
              request.body.gender !== undefined
                ? request.body.gender
                : undefined,
            address:
              request.body.address !== undefined
                ? request.body.address
                : undefined,
            allergies:
              request.body.allergies !== undefined
                ? request.body.allergies
                : undefined,
            totalVisits:
              request.body.totalVisits !== undefined
                ? Number(
                    request.body.totalVisits,
                  )
                : undefined,
          },
        });

      response.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      console.error(
        "Failed to update patient:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to update patient.",
      });
    }
  },
);

router.delete(
  "/:id",
  adminOnly,
  async (request, response) => {
    try {
      await prisma.patient.delete({
        where: {
          id: request.params.id,
        },
      });

      response.json({
        success: true,
        message:
          "Patient deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Failed to delete patient:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to delete patient.",
      });
    }
  },
);

export default router;