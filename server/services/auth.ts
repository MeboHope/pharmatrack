import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { prisma } from "../prisma";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "ADMIN" | "PHARMACIST" | "CLINICIAN";
  isVerified: boolean;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: AuthUser["role"];
  type: "access" | "refresh";
};

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "pharmatrack-development-secret-change-this";

const JWT_ACCESS_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const PASSWORD_SALT_BYTES = 16;

export const hashPassword = async (
  password: string,
): Promise<string> => {
  const salt = crypto
    .randomBytes(PASSWORD_SALT_BYTES)
    .toString("hex");

  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(
          `${salt}:${derivedKey.toString("hex")}`,
        );
      },
    );
  });
};

export const verifyPassword = async (
  password: string,
  storedHash: string,
): Promise<boolean> => {
  const [salt, storedKey] =
    storedHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        const storedBuffer =
          Buffer.from(storedKey, "hex");

        const derivedBuffer =
          Buffer.from(derivedKey);

        if (
          storedBuffer.length !==
          derivedBuffer.length
        ) {
          resolve(false);
          return;
        }

        resolve(
          crypto.timingSafeEqual(
            storedBuffer,
            derivedBuffer,
          ),
        );
      },
    );
  });
};

const createAccessToken = (
  user: AuthUser,
): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    } satisfies JwtPayload,
    JWT_SECRET,
    {
      expiresIn:
        JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );
};

const createRefreshToken = (
  user: AuthUser,
): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "refresh",
    } satisfies JwtPayload,
    JWT_SECRET,
    {
      expiresIn:
        JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );
};

const sanitizeUser = (
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: AuthUser["role"];
    isVerified: boolean;
  },
): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
});

export const authService = {
  async register(input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: AuthUser["role"];
  }) {
    const email =
      input.email.trim().toLowerCase();

    const existing =
      await prisma.user.findUnique({
        where: { email },
      });

    if (existing) {
      throw new Error(
        "An account with this email already exists.",
      );
    }

    const passwordHash =
      await hashPassword(input.password);

    const user =
      await prisma.user.create({
        data: {
          name: input.name.trim(),
          email,
          phone:
            input.phone?.trim() || null,
          passwordHash,
          role:
            input.role || "PHARMACIST",
          isVerified: true,
        },
      });

    const safeUser =
      sanitizeUser(user);

    return {
      user: safeUser,
      accessToken:
        createAccessToken(safeUser),
      refreshToken:
        createRefreshToken(safeUser),
    };
  },

  async login(
    emailInput: string,
    password: string,
  ) {
    const email =
      emailInput.trim().toLowerCase();

    const user =
      await prisma.user.findUnique({
        where: { email },
      });

    if (!user) {
      throw new Error(
        "Invalid email or password",
      );
    }

    const passwordValid =
      await verifyPassword(
        password,
        user.passwordHash,
      );

    if (!passwordValid) {
      throw new Error(
        "Invalid email or password",
      );
    }

    if (!user.isVerified) {
      throw new Error(
        "This account has not been verified.",
      );
    }

    const safeUser =
      sanitizeUser(user);

    return {
      user: safeUser,
      accessToken:
        createAccessToken(safeUser),
      refreshToken:
        createRefreshToken(safeUser),
    };
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user =
      await prisma.user.findUnique({
        where: { id: userId },
      });

    if (!user) {
      throw new Error(
        "User account could not be found.",
      );
    }

    const currentPasswordValid =
      await verifyPassword(
        currentPassword,
        user.passwordHash,
      );

    if (!currentPasswordValid) {
      throw new Error(
        "Current password is incorrect.",
      );
    }

    if (
      currentPassword === newPassword
    ) {
      throw new Error(
        "New password must be different from the current password.",
      );
    }

    if (newPassword.length < 8) {
      throw new Error(
        "New password must contain at least 8 characters.",
      );
    }

    const passwordHash =
      await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return {
      success: true,
    };
  },

  async adminResetPassword(
    targetUserId: string,
    newPassword: string,
  ) {
    if (newPassword.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters.",
      );
    }

    const user =
      await prisma.user.findUnique({
        where: { id: targetUserId },
      });

    if (!user) {
      throw new Error(
        "User account could not be found.",
      );
    }

    const passwordHash =
      await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
      },
    });

    return {
      success: true,
    };
  },

  refresh(
    refreshToken: string,
  ) {
    const payload =
      jwt.verify(
        refreshToken,
        JWT_SECRET,
      ) as JwtPayload;

    if (
      payload.type !== "refresh" ||
      !payload.sub
    ) {
      throw new Error(
        "Invalid refresh token.",
      );
    }

    const user: AuthUser = {
      id: payload.sub,
      name: "",
      email: payload.email,
      role: payload.role,
      isVerified: true,
    };

    return {
      accessToken:
        createAccessToken(user),
    };
  },

  verifyAccessToken(
    token: string,
  ): JwtPayload {
    const payload =
      jwt.verify(
        token,
        JWT_SECRET,
      ) as JwtPayload;

    if (
      payload.type !== "access" ||
      !payload.sub
    ) {
      throw new Error(
        "Invalid access token.",
      );
    }

    return payload;
  },
};

export default authService;