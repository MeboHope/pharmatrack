import { Router } from "express";

import {
authService,
} from "../services/auth.js";

import {
authenticate,
type AuthenticatedRequest,
} from "../middleware/auth.js";

import {
recordAudit,
} from "../middleware/audit.js";

const router = Router();

const isNonEmptyString = (
value: unknown,
): value is string =>
typeof value === "string" &&
value.trim().length > 0;

router.post(
"/register",
async (req, res, next) => {
try {
const {
name,
email,
phone,
password,
role,
} = req.body ?? {};


  if (!isNonEmptyString(name)) {
    res.status(400).json({
      success: false,
      message: "Full name is required.",
    });
    return;
  }

  if (!isNonEmptyString(email)) {
    res.status(400).json({
      success: false,
      message: "Email address is required.",
    });
    return;
  }

  if (!isNonEmptyString(password)) {
    res.status(400).json({
      success: false,
      message: "Password is required.",
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({
      success: false,
      message:
        "Password must contain at least 8 characters.",
    });
    return;
  }

  const result =
    await authService.register({
      name,
      email,
      phone:
        isNonEmptyString(phone)
          ? phone
          : undefined,
      password,
      role:
        role === "ADMIN" ||
        role === "PHARMACIST" ||
        role === "CLINICIAN"
          ? role
          : undefined,
    });

  await recordAudit(
    req,
    {
      action: "USER_REGISTER",
      entity: "User",
      entityId: result.user.id,
      details: {
        email: result.user.email,
        role: result.user.role,
      },
    },
  );

  res.status(201).json({
    success: true,
    message:
      "Account created successfully.",
    data: result,
  });
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes(
      "already exists",
    )
  ) {
    res.status(409).json({
      success: false,
      message: error.message,
    });
    return;
  }

  next(error);
}


},
);

router.post(
"/login",
async (req, res, next) => {
try {
const {
email,
password,
} = req.body ?? {};


  if (!isNonEmptyString(email)) {
    res.status(400).json({
      success: false,
      message:
        "Email address is required.",
    });
    return;
  }

  if (!isNonEmptyString(password)) {
    res.status(400).json({
      success: false,
      message:
        "Password is required.",
    });
    return;
  }

  const result =
    await authService.login(
      email,
      password,
    );

  await recordAudit(
    req,
    {
      action: "USER_LOGIN",
      entity: "User",
      entityId: result.user.id,
      details: {
        email: result.user.email,
      },
    },
  );

  res.json({
    success: true,
    message:
      "Login successful.",
    data: result,
  });
} catch (error) {
  if (
    error instanceof Error &&
    (
      error.message ===
        "Invalid email or password." ||
      error.message ===
        "This account has not been verified."
    )
  ) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
    return;
  }

  next(error);
}


},
);

router.post(
"/refresh",
async (req, res, next) => {
try {
const {
refreshToken,
} = req.body ?? {};


  if (
    !isNonEmptyString(
      refreshToken,
    )
  ) {
    res.status(400).json({
      success: false,
      message:
        "Refresh token is required.",
    });
    return;
  }

  const result =
    authService.refresh(
      refreshToken,
    );

  res.json({
    success: true,
    message:
      "Access token refreshed.",
    data: result,
  });
} catch (error) {
  res.status(401).json({
    success: false,
    message:
      "Invalid or expired refresh token.",
  });
}


},
);

router.get(
"/me",
authenticate,
async (
req: AuthenticatedRequest,
res,
next,
) => {
try {
const userId =
req.auth?.sub;


  if (!userId) {
    res.status(401).json({
      success: false,
      message:
        "Authentication required.",
    });
    return;
  }

  const user =
    await import("../prisma.js")
      .then(({ prisma }) =>
        prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            createdAt: true,
          },
        }),
      );

  if (!user) {
    res.status(401).json({
      success: false,
      message:
        "User account no longer exists.",
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified:
        user.isVerified,
      createdAt:
        user.createdAt,
    },
  });
} catch (error) {
  next(error);
}


},
);

export default router;
