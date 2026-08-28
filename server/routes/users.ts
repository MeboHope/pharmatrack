// server/routes/users.ts

import {
  Router,
} from "express";

import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth";

import {
  requireAdmin,
} from "../middleware/roles";

import {
  recordAudit,
} from "../middleware/audit";

import {
  prisma,
} from "../prisma";

import {
  hashPassword,
} from "../services/auth";

const router =
  Router();

router.use(authenticate);
router.use(requireAdmin);

const sanitizeUser = (
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role:
      | "ADMIN"
      | "PHARMACIST"
      | "CLINICIAN";
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified:
    user.isVerified,
  createdAt:
    user.createdAt,
  updatedAt:
    user.updatedAt,
});

router.get(
  "/",
  async (
    _request,
    response,
    next,
  ) => {
    try {
      const users =
        await prisma.user.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });

      response.json({
        success: true,
        data: users.map(
          sanitizeUser,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const {
        name,
        email,
        phone,
        password,
        role,
      } =
        request.body ?? {};

      if (
        typeof name !==
          "string" ||
        name.trim().length < 2
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid name is required.",
        });
        return;
      }

      if (
        typeof email !==
          "string" ||
        !email
          .trim()
          .includes("@")
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid email address is required.",
        });
        return;
      }

      if (
        typeof password !==
          "string" ||
        password.length < 8
      ) {
        response.status(400).json({
          success: false,
          message:
            "Password must contain at least 8 characters.",
        });
        return;
      }

      if (
        ![
          "ADMIN",
          "PHARMACIST",
          "CLINICIAN",
        ].includes(role)
      ) {
        response.status(400).json({
          success: false,
          message:
            "A valid user role is required.",
        });
        return;
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const existing =
        await prisma.user.findUnique({
          where: {
            email:
              normalizedEmail,
          },
        });

      if (existing) {
        response.status(409).json({
          success: false,
          message:
            "An account with this email already exists.",
        });
        return;
      }

      const passwordHash =
        await hashPassword(
          password,
        );

      const user =
        await prisma.user.create({
          data: {
            name:
              name.trim(),
            email:
              normalizedEmail,
            phone:
              typeof phone ===
                "string" &&
              phone.trim()
                ? phone.trim()
                : null,
            passwordHash,
            role,
            isVerified: true,
          },
        });

      await recordAudit(
        request,
        {
          action:
            "USER_CREATED",
          entity: "User",
          entityId:
            user.id,
          details: {
            name:
              user.name,
            email:
              user.email,
            role:
              user.role,
          },
        },
      );

      response.status(201).json({
        success: true,
        message:
          "User account created successfully.",
        data:
          sanitizeUser(
            user,
          ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const userId =
        request.params.id;

      const {
        name,
        email,
        phone,
        role,
        isVerified,
      } =
        request.body ?? {};

      const existing =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "User account could not be found.",
        });
        return;
      }

      if (
        userId ===
        request.auth?.sub &&
        role &&
        role !==
          existing.role
      ) {
        response.status(400).json({
          success: false,
          message:
            "You cannot change your own role.",
        });
        return;
      }

      if (
        role &&
        ![
          "ADMIN",
          "PHARMACIST",
          "CLINICIAN",
        ].includes(role)
      ) {
        response.status(400).json({
          success: false,
          message:
            "Invalid user role.",
        });
        return;
      }

      const normalizedEmail =
        typeof email ===
          "string"
          ? email
              .trim()
              .toLowerCase()
          : undefined;

      if (
        normalizedEmail &&
        normalizedEmail !==
          existing.email
      ) {
        const emailOwner =
          await prisma.user.findUnique({
            where: {
              email:
                normalizedEmail,
            },
          });

        if (
          emailOwner &&
          emailOwner.id !==
            userId
        ) {
          response.status(409).json({
            success: false,
            message:
              "That email address is already assigned to another account.",
          });
          return;
        }
      }

      const updated =
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            ...(typeof name ===
              "string" && {
              name:
                name.trim(),
            }),

            ...(normalizedEmail && {
              email:
                normalizedEmail,
            }),

            ...(phone !==
              undefined && {
              phone:
                typeof phone ===
                  "string" &&
                phone.trim()
                  ? phone.trim()
                  : null,
            }),

            ...(role && {
              role,
            }),

            ...(typeof isVerified ===
              "boolean" && {
              isVerified,
            }),
          },
        });

      await recordAudit(
        request,
        {
          action:
            "USER_UPDATED",
          entity: "User",
          entityId:
            updated.id,
          details: {
            name:
              updated.name,
            email:
              updated.email,
            role:
              updated.role,
            isVerified:
              updated.isVerified,
          },
        },
      );

      response.json({
        success: true,
        message:
          "User account updated successfully.",
        data:
          sanitizeUser(
            updated,
          ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  async (
    request: AuthenticatedRequest,
    response,
    next,
  ) => {
    try {
      const userId =
        request.params.id;

      if (
        userId ===
        request.auth?.sub
      ) {
        response.status(400).json({
          success: false,
          message:
            "You cannot delete your own account.",
        });
        return;
      }

      const existing =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

      if (!existing) {
        response.status(404).json({
          success: false,
          message:
            "User account could not be found.",
        });
        return;
      }

      await prisma.user.delete({
        where: {
          id: userId,
        },
      });

      await recordAudit(
        request,
        {
          action:
            "USER_DELETED",
          entity: "User",
          entityId:
            userId,
          details: {
            name:
              existing.name,
            email:
              existing.email,
            role:
              existing.role,
          },
        },
      );

      response.json({
        success: true,
        message:
          "User account deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;