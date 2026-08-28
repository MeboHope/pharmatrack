import { Router } from "express";

import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import {
  adminOnly,
  pharmacistOnly,
} from "../middleware/authorize";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  pharmacistOnly,
  async (_request, response) => {
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
      console.error(
        "Failed to fetch suppliers:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch suppliers.",
      });
    }
  },
);

router.get(
  "/:id",
  pharmacistOnly,
  async (request, response) => {
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
      console.error(
        "Failed to fetch supplier:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to fetch supplier.",
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
        name,
        contactPerson,
        phone,
        email,
        address,
        leadTimeDays,
      } = request.body;

      if (
        !name ||
        !contactPerson ||
        !phone ||
        !email ||
        !address
      ) {
        response.status(400).json({
          success: false,
          message:
            "Required supplier information is missing.",
        });
        return;
      }

      const supplier =
        await prisma.supplier.create({
          data: {
            name: String(name).trim(),
            contactPerson:
              String(
                contactPerson,
              ).trim(),
            phone: String(phone).trim(),
            email: String(email).trim(),
            address:
              String(address).trim(),
            leadTimeDays: Number(
              leadTimeDays ?? 0,
            ),
          },
        });

      response.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      console.error(
        "Failed to create supplier:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to create supplier.",
      });
    }
  },
);

router.put(
  "/:id",
  pharmacistOnly,
  async (request, response) => {
    try {
      const supplier =
        await prisma.supplier.update({
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
            contactPerson:
              request.body.contactPerson !==
              undefined
                ? String(
                    request.body
                      .contactPerson,
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
                ? String(
                    request.body.email,
                  ).trim()
                : undefined,
            address:
              request.body.address !==
              undefined
                ? String(
                    request.body.address,
                  ).trim()
                : undefined,
            leadTimeDays:
              request.body.leadTimeDays !==
              undefined
                ? Number(
                    request.body
                      .leadTimeDays,
                  )
                : undefined,
          },
        });

      response.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      console.error(
        "Failed to update supplier:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to update supplier.",
      });
    }
  },
);

router.delete(
  "/:id",
  adminOnly,
  async (request, response) => {
    try {
      await prisma.supplier.delete({
        where: {
          id: request.params.id,
        },
      });

      response.json({
        success: true,
        message:
          "Supplier deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Failed to delete supplier:",
        error,
      );

      response.status(500).json({
        success: false,
        message:
          "Failed to delete supplier.",
      });
    }
  },
);

export default router;