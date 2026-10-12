import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { prisma } from "../prisma.js";

import {
  isStrongPassword,
  isValidEmail,
  isEmailDomainConfigured,
} from "../middleware/security.js";

export {
  isStrongPassword,
  isValidEmail,
  isEmailDomainConfigured,
};

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: AppRole;
  isVerified: boolean;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationType?:
    | "PHARMACY"
    | "CLINIC"
    | null;
}

export interface UserOrganization {
  id: string;
  name: string;
  type: "PHARMACY" | "CLINIC";
  status: "ACTIVE" | "SUSPENDED";
  role:
    | "ADMIN"
    | "PHARMACIST"
    | "CLINICIAN";
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: AppRole;
  type: "access" | "refresh";
  organizationId?: string;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResult {
  user: AuthUser;
  verificationCode: string;
}

export interface PasswordResetRequestResult {
  requested: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not configured.",
  );
}

const JWT_SECRET_FINAL =
  JWT_SECRET as string;

const ACCESS_TOKEN_EXPIRES_IN =
  process.env.ACCESS_TOKEN_EXPIRES_IN ||
  "15m";

const REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN ||
  "7d";

const VERIFICATION_CODE_EXPIRY_MINUTES = 15;

const MAX_VERIFICATION_ATTEMPTS = 5;

const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 30;

export const DEFAULT_ORGANIZATION_ID =
  "pharmatrack-default-org";

/* ============================================================
   GENERAL HELPERS
   ============================================================ */

function normalizeEmail(
  email: string,
): string {
  return email.trim().toLowerCase();
}

function generateVerificationCode(): string {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

function hashVerificationCode(
  code: string,
): string {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

function generateRefreshToken(): string {
  return crypto
    .randomBytes(64)
    .toString("hex");
}

function hashRefreshToken(
  token: string,
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function generatePasswordResetToken(): string {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function hashPasswordResetToken(
  token: string,
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/* ============================================================
   TOKEN EXPIRY
   ============================================================ */

function parseDurationToMilliseconds(
  value: string,
  fallbackMilliseconds: number,
): number {
  const match = value.match(
    /^(\d+)(s|m|h|d)$/,
  );

  if (!match) {
    return fallbackMilliseconds;
  }

  const amount = Number(match[1]);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return fallbackMilliseconds;
  }

  switch (match[2]) {
    case "s":
      return amount * 1000;

    case "m":
      return amount * 60 * 1000;

    case "h":
      return amount * 60 * 60 * 1000;

    case "d":
      return amount *
        24 *
        60 *
        60 *
        1000;

    default:
      return fallbackMilliseconds;
  }
}

function getRefreshTokenExpiryDate(): Date {
  const milliseconds =
    parseDurationToMilliseconds(
      REFRESH_TOKEN_EXPIRES_IN,
      7 *
        24 *
        60 *
        60 *
        1000,
    );

  return new Date(
    Date.now() + milliseconds,
  );
}

function getAccessTokenExpirySeconds(): number {
  const milliseconds =
    parseDurationToMilliseconds(
      ACCESS_TOKEN_EXPIRES_IN,
      15 * 60 * 1000,
    );

  return Math.floor(
    milliseconds / 1000,
  );
}

/* ============================================================
   PASSWORD HASHING
   ============================================================ */

export function hashPassword(
  password: string,
): string {
  const salt =
    crypto
      .randomBytes(16)
      .toString("hex");

  const derivedKey =
    crypto.scryptSync(
      password,
      salt,
      64,
    );

  return `${salt}:${derivedKey.toString(
    "hex",
  )}`;
}

export function verifyPassword(
  password: string,
  storedHash: string,
): boolean {
  const [salt, key] =
    storedHash.split(":");

  if (!salt || !key) {
    return false;
  }

  try {
    const derivedKey =
      crypto.scryptSync(
        password,
        salt,
        64,
      );

    const storedKey =
      Buffer.from(key, "hex");

    if (
      storedKey.length !==
      derivedKey.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      storedKey,
      derivedKey,
    );
  } catch {
    return false;
  }
}

/* ============================================================
   ORGANIZATION CONTEXT
   ============================================================ */

async function getUserOrganizationContext(
  userId: string,
  organizationId?: string | null,
) {
  if (organizationId) {
    const membership =
      await prisma.organizationMembership.findFirst(
        {
          where: {
            userId,
            organizationId,
            organization: {
              status: "ACTIVE",
            },
          },
          include: {
            organization: true,
          },
        },
      );

    if (!membership) {
      return null;
    }

    return {
      organizationId:
        membership.organizationId,

      organizationName:
        membership.organization.name,

      organizationType:
        membership.organization.type,

      role:
        membership.role as AppRole,
    };
  }

  const membership =
    await prisma.organizationMembership.findFirst(
      {
        where: {
          userId,
          organization: {
            status: "ACTIVE",
          },
        },
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    );

  if (!membership) {
    return null;
  }

  return {
    organizationId:
      membership.organizationId,

    organizationName:
      membership.organization.name,

    organizationType:
      membership.organization.type,

    role:
      membership.role as AppRole,
  };
}

async function buildAuthenticatedUser(
  userId: string,
  organizationId?: string | null,
): Promise<AuthUser | null> {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!user) {
    return null;
  }

  if (!user.isVerified) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role:
        user.role as AppRole,
      isVerified: false,
      organizationId: null,
      organizationName: null,
      organizationType: null,
    };
  }

  if (user.role === "SUPER_ADMIN") {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: "SUPER_ADMIN",
      isVerified: user.isVerified,
      organizationId: null,
      organizationName: null,
      organizationType: null,
    };
  }

  const organization =
    await getUserOrganizationContext(
      user.id,
      organizationId,
    );

  if (!organization) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: organization.role,
    isVerified: user.isVerified,
    organizationId:
      organization.organizationId,
    organizationName:
      organization.organizationName,
    organizationType:
      organization.organizationType,
  };
}

/* ============================================================
   USER ORGANIZATIONS
   ============================================================ */

export async function getUserOrganizations(
  userId: string,
): Promise<UserOrganization[]> {
  const memberships =
    await prisma.organizationMembership.findMany(
      {
        where: {
          userId,
          organization: {
            status: "ACTIVE",
          },
        },
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    );

  return memberships.map(
    (membership) => ({
      id:
        membership.organization.id,

      name:
        membership.organization.name,

      type:
        membership.organization.type,

      status:
        membership.organization.status,

      role:
        membership.role as
          | "ADMIN"
          | "PHARMACIST"
          | "CLINICIAN",
    }),
  );
}

/* ============================================================
   ACCESS TOKEN
   ============================================================ */

export function createAccessToken(
  user: AuthUser,
): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "access",
  };

  if (
    user.role !== "SUPER_ADMIN" &&
    user.organizationId
  ) {
    payload.organizationId =
      user.organizationId;
  }

  return jwt.sign(
    payload,
    JWT_SECRET_FINAL,
    {
      expiresIn:
        ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );
}

/* ============================================================
   REFRESH TOKEN
   ============================================================ */

async function createRefreshToken(
  userId: string,
  organizationId?: string | null,
): Promise<string> {
  const rawToken =
    generateRefreshToken();

  const tokenHash =
    hashRefreshToken(rawToken);

  const expiresAt =
    getRefreshTokenExpiryDate();

  await prisma.refreshToken.create({
    data: {
      id: crypto.randomUUID(),
      tokenHash,
      userId,
      organizationId:
        organizationId ?? null,
      expiresAt,
    },
  });

  return rawToken;
}

/* ============================================================
   TOKEN VALIDATION
   ============================================================ */

export function verifyAccessToken(
  token: string,
): JwtPayload {
  const decoded =
    jwt.verify(
      token,
      JWT_SECRET_FINAL,
    ) as unknown as JwtPayload;

  if (decoded.type !== "access") {
    throw new Error(
      "Invalid access token.",
    );
  }

  const allowedRoles: AppRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "PHARMACIST",
    "CLINICIAN",
  ];

  if (
    !allowedRoles.includes(
      decoded.role,
    )
  ) {
    throw new Error(
      "Invalid role.",
    );
  }

  if (
    decoded.role !==
      "SUPER_ADMIN" &&
    !decoded.organizationId
  ) {
    throw new Error(
      "Organization context is required.",
    );
  }

  return decoded;
}

export function verifyRefreshToken(
  token: string,
): JwtPayload {
  const decoded =
    jwt.verify(
      token,
      JWT_SECRET_FINAL,
    ) as unknown as JwtPayload;

  if (decoded.type !== "refresh") {
    throw new Error(
      "Invalid refresh token.",
    );
  }

  const allowedRoles: AppRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "PHARMACIST",
    "CLINICIAN",
  ];

  if (
    !allowedRoles.includes(
      decoded.role,
    )
  ) {
    throw new Error(
      "Invalid role.",
    );
  }

  if (
    decoded.role !==
      "SUPER_ADMIN" &&
    !decoded.organizationId
  ) {
    throw new Error(
      "Organization context is required.",
    );
  }

  return decoded;
}

/* ============================================================
   REGISTRATION
   ============================================================ */

export async function registerUser(
  input: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
    role?: AppRole;
  },
): Promise<RegisterResult> {
  const name =
    input.name.trim();

  const email =
    normalizeEmail(input.email);

  if (!name) {
    throw new Error(
      "Name is required.",
    );
  }

  if (!isValidEmail(email)) {
    throw new Error(
      "Please enter a valid email address.",
    );
  }

  const emailDomainConfigured =
    await isEmailDomainConfigured(
      email,
    );

  if (!emailDomainConfigured) {
    throw new Error(
      "This email address cannot be verified because its domain does not appear to accept email. Please use a valid, active email address.",
    );
  }

  if (
    !isStrongPassword(
      input.password,
    )
  ) {
    throw new Error(
      "Password must be 12-128 characters and contain uppercase, lowercase, number, and special character.",
    );
  }

  if (
    input.role === "ADMIN" ||
    input.role ===
      "SUPER_ADMIN"
  ) {
    throw new Error(
      "This role cannot be assigned during public registration.",
    );
  }

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (existingUser) {
    throw new Error(
      "An account with this email already exists.",
    );
  }

  const verificationCode =
    generateVerificationCode();

  const codeHash =
    hashVerificationCode(
      verificationCode,
    );

  const expiresAt =
    new Date(
      Date.now() +
        VERIFICATION_CODE_EXPIRY_MINUTES *
          60 *
          1000,
    );

  const passwordHash =
    hashPassword(
      input.password,
    );

  const role: AppRole =
    input.role ===
      "CLINICIAN"
      ? "CLINICIAN"
      : "PHARMACIST";

  const result =
    await prisma.$transaction(
      async (tx) => {
        const user =
          await tx.user.create({
            data: {
              id: crypto.randomUUID(),
              name,
              email,
              phone:
                input.phone?.trim() ||
                null,
              role,
              passwordHash,
              isVerified: false,
            },
          });

        const organization =
          await tx.organization.findUnique(
            {
              where: {
                id: DEFAULT_ORGANIZATION_ID,
              },
            },
          );

        if (!organization) {
          throw new Error(
            "Default organization does not exist.",
          );
        }

        if (
          organization.status !==
          "ACTIVE"
        ) {
          throw new Error(
            "The organization is currently unavailable.",
          );
        }

        await tx.organizationMembership.create(
          {
            data: {
              id: crypto.randomUUID(),
              organizationId:
                DEFAULT_ORGANIZATION_ID,
              userId: user.id,
              role,
            },
          },
        );

        await tx.emailVerification.create(
          {
            data: {
              codeHash,
              expiresAt,
              attempts: 0,

              user: {
                connect: {
                  id: user.id,
                },
              },
            },
          },
        );

        return user;
      },
    );

  const user =
    await buildAuthenticatedUser(
      result.id,
      DEFAULT_ORGANIZATION_ID,
    );

  if (!user) {
    throw new Error(
      "Unable to build authenticated user.",
    );
  }

  return {
    user,
    verificationCode,
  };
}

/* ============================================================
   EMAIL VERIFICATION
   ============================================================ */

export async function verifyEmail(
  userId: string,
  code: string,
): Promise<AuthUser> {
  const verification =
    await prisma.emailVerification.findUnique(
      {
        where: {
          userId,
        },
      },
    );

  if (!verification) {
    throw new Error(
      "No email verification request found.",
    );
  }

  if (
    verification.expiresAt <
    new Date()
  ) {
    throw new Error(
      "Verification code has expired.",
    );
  }

  if (
    verification.attempts >=
    MAX_VERIFICATION_ATTEMPTS
  ) {
    throw new Error(
      "Too many verification attempts.",
    );
  }

  const normalizedCode =
    code.trim();

  const suppliedHash =
    hashVerificationCode(
      normalizedCode,
    );

  const storedHashBuffer =
    Buffer.from(
      verification.codeHash,
      "hex",
    );

  const suppliedHashBuffer =
    Buffer.from(
      suppliedHash,
      "hex",
    );

  if (
    storedHashBuffer.length !==
    suppliedHashBuffer.length
  ) {
    throw new Error(
      "Invalid verification code.",
    );
  }

  const hashesMatch =
    crypto.timingSafeEqual(
      suppliedHashBuffer,
      storedHashBuffer,
    );

  if (!hashesMatch) {
    await prisma.emailVerification.update(
      {
        where: {
          userId,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      },
    );

    throw new Error(
      "Invalid verification code.",
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isVerified: true,
      },
    }),

    prisma.emailVerification.delete({
      where: {
        userId,
      },
    }),
  ]);

  const user =
    await buildAuthenticatedUser(
      userId,
    );

  if (!user) {
    throw new Error(
      "Unable to load verified user.",
    );
  }

  return user;
}

/* ============================================================
   RESEND VERIFICATION
   ============================================================ */

export async function resendVerificationCode(
  userId: string,
): Promise<string> {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!user) {
    throw new Error(
      "User not found.",
    );
  }

  if (user.isVerified) {
    throw new Error(
      "Email is already verified.",
    );
  }

  const verificationCode =
    generateVerificationCode();

  const codeHash =
    hashVerificationCode(
      verificationCode,
    );

  const expiresAt =
    new Date(
      Date.now() +
        VERIFICATION_CODE_EXPIRY_MINUTES *
          60 *
          1000,
    );

  await prisma.emailVerification.upsert(
    {
      where: {
        userId,
      },

      update: {
        codeHash,
        expiresAt,
        attempts: 0,
      },

      create: {
        codeHash,
        expiresAt,
        attempts: 0,

        user: {
          connect: {
            id: userId,
          },
        },
      },
    },
  );

  return verificationCode;
}

/* ============================================================
   LOGIN
   ============================================================ */

export async function loginUser(
  input: {
    email: string;
    password: string;
  },
): Promise<LoginResult> {
  const email =
    normalizeEmail(input.email);

  const user =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (
    !user ||
    !verifyPassword(
      input.password,
      user.passwordHash,
    )
  ) {
    throw new Error(
      "Invalid email or password.",
    );
  }

  if (!user.isVerified) {
    throw new Error(
      "Please verify your email before logging in.",
    );
  }

  const authenticatedUser =
    await buildAuthenticatedUser(
      user.id,
    );

  if (!authenticatedUser) {
    throw new Error(
      "Your account is not assigned to an active organization.",
    );
  }

  const accessToken =
    createAccessToken(
      authenticatedUser,
    );

  const refreshToken =
    await createRefreshToken(
      user.id,
      authenticatedUser.organizationId,
    );

  return {
    user: authenticatedUser,
    accessToken,
    refreshToken,
  };
}

/* ============================================================
   REFRESH ACCESS TOKEN
   ============================================================ */

export async function refreshAccessToken(
  rawRefreshToken: string,
): Promise<{
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}> {
  const tokenHash =
    hashRefreshToken(
      rawRefreshToken,
    );

  const storedToken =
    await prisma.refreshToken.findUnique(
      {
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      },
    );

  if (!storedToken) {
    throw new Error(
      "Invalid refresh token.",
    );
  }

  if (storedToken.revokedAt) {
    if (
      storedToken.replacedByTokenId
    ) {
      await prisma.refreshToken.updateMany(
        {
          where: {
            userId:
              storedToken.userId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        },
      );
    }

    throw new Error(
      "Refresh token has been revoked.",
    );
  }

  if (
    storedToken.expiresAt <
    new Date()
  ) {
    await prisma.refreshToken.update(
      {
        where: {
          id: storedToken.id,
        },
        data: {
          revokedAt: new Date(),
        },
      },
    );

    throw new Error(
      "Refresh token has expired.",
    );
  }

  const authenticatedUser =
    await buildAuthenticatedUser(
      storedToken.userId,
      storedToken.organizationId,
    );

  if (!authenticatedUser) {
    throw new Error(
      "Unable to authenticate user in the selected organization.",
    );
  }

  const newRefreshToken =
    generateRefreshToken();

  const newRefreshTokenHash =
    hashRefreshToken(
      newRefreshToken,
    );

  const newExpiresAt =
    getRefreshTokenExpiryDate();

  await prisma.$transaction(
    async (tx) => {
      const replacement =
        await tx.refreshToken.create({
          data: {
            id: crypto.randomUUID(),
            tokenHash:
              newRefreshTokenHash,
            userId:
              storedToken.userId,
            organizationId:
              storedToken.organizationId,
            expiresAt:
              newExpiresAt,
          },
        });

      await tx.refreshToken.update({
        where: {
          id: storedToken.id,
        },
        data: {
          revokedAt:
            new Date(),
          replacedByTokenId:
            replacement.id,
        },
      });
    },
  );

  const accessToken =
    createAccessToken(
      authenticatedUser,
    );

  return {
    user: authenticatedUser,
    accessToken,
    refreshToken:
      newRefreshToken,
  };
}

/* ============================================================
   ORGANIZATION SWITCHING
   ============================================================ */

export async function switchOrganization(
  userId: string,
  organizationId: string,
  currentRefreshToken?: string,
): Promise<{
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}> {
  const normalizedOrganizationId =
    organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new Error(
      "Organization ID is required.",
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!user) {
    throw new Error(
      "User account no longer exists.",
    );
  }

  if (user.role === "SUPER_ADMIN") {
    throw new Error(
      "Super Admin accounts do not use organization switching.",
    );
  }

  if (!user.isVerified) {
    throw new Error(
      "Email verification is required.",
    );
  }

  const membership =
    await prisma.organizationMembership.findFirst(
      {
        where: {
          userId,
          organizationId:
            normalizedOrganizationId,
          organization: {
            status: "ACTIVE",
          },
        },
        include: {
          organization: true,
        },
      },
    );

  if (!membership) {
    throw new Error(
      "You are not a member of that active organization.",
    );
  }

  const authenticatedUser =
    await buildAuthenticatedUser(
      userId,
      membership.organizationId,
    );

  if (!authenticatedUser) {
    throw new Error(
      "Unable to load the selected organization.",
    );
  }

  const newRefreshToken =
    generateRefreshToken();

  const newRefreshTokenHash =
    hashRefreshToken(
      newRefreshToken,
    );

  const newExpiresAt =
    getRefreshTokenExpiryDate();

  await prisma.$transaction(
    async (tx) => {
      if (currentRefreshToken) {
        const currentHash =
          hashRefreshToken(
            currentRefreshToken,
          );

        const currentToken =
          await tx.refreshToken.findUnique(
            {
              where: {
                tokenHash:
                  currentHash,
              },
            },
          );

        if (!currentToken) {
          throw new Error(
            "Current refresh token is invalid.",
          );
        }

        if (
          currentToken.revokedAt
        ) {
          throw new Error(
            "Current refresh token has already been revoked.",
          );
        }

        if (
          currentToken.expiresAt <
          new Date()
        ) {
          throw new Error(
            "Current refresh token has expired.",
          );
        }

        const replacement =
          await tx.refreshToken.create(
            {
              data: {
                id: crypto.randomUUID(),
                tokenHash:
                  newRefreshTokenHash,
                userId,
                organizationId:
                  membership.organizationId,
                expiresAt:
                  newExpiresAt,
              },
            },
          );

        await tx.refreshToken.update({
          where: {
            id: currentToken.id,
          },

          data: {
            revokedAt:
              new Date(),
            replacedByTokenId:
              replacement.id,
          },
        });

        return;
      }

      await tx.refreshToken.create({
        data: {
          id: crypto.randomUUID(),
          tokenHash:
            newRefreshTokenHash,
          userId,
          organizationId:
            membership.organizationId,
          expiresAt:
            newExpiresAt,
        },
      });
    },
  );

  const accessToken =
    createAccessToken(
      authenticatedUser,
    );

  return {
    user: authenticatedUser,
    accessToken,
    refreshToken:
      newRefreshToken,
  };
}

/* ============================================================
   LOGOUT
   ============================================================ */

export async function logoutUser(
  rawRefreshToken: string,
): Promise<void> {
  const tokenHash =
    hashRefreshToken(
      rawRefreshToken,
    );

  await prisma.refreshToken.updateMany(
    {
      where: {
        tokenHash,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    },
  );
}

export async function revokeAllRefreshTokens(
  userId: string,
): Promise<void> {
  await prisma.refreshToken.updateMany(
    {
      where: {
        userId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    },
  );
}

/* ============================================================
   PASSWORD MANAGEMENT
   ============================================================ */

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (
    !isStrongPassword(
      newPassword,
    )
  ) {
    throw new Error(
      "Password must be 12-128 characters and contain uppercase, lowercase, number, and special character.",
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!user) {
    throw new Error(
      "User not found.",
    );
  }

  if (
    !verifyPassword(
      currentPassword,
      user.passwordHash,
    )
  ) {
    throw new Error(
      "Current password is incorrect.",
    );
  }

  if (
    verifyPassword(
      newPassword,
      user.passwordHash,
    )
  ) {
    throw new Error(
      "New password must be different from the current password.",
    );
  }

  const passwordHash =
    hashPassword(
      newPassword,
    );

  await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      passwordHash,
    },
  });

  await revokeAllRefreshTokens(
    userId,
  );
}

export async function adminResetPassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  if (
    !isStrongPassword(
      newPassword,
    )
  ) {
    throw new Error(
      "Password must be 12-128 characters and contain uppercase, lowercase, number, and special character.",
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!user) {
    throw new Error(
      "User not found.",
    );
  }

  const passwordHash =
    hashPassword(newPassword);

  await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      passwordHash,
    },
  });

  await revokeAllRefreshTokens(
    userId,
  );
}

/* ============================================================
   SELF-SERVICE PASSWORD RESET
   ============================================================ */

/**
 * Creates a password reset token for a verified account.
 *
 * Security properties:
 * - Raw token is never stored.
 * - Token is cryptographically random.
 * - Existing reset tokens are invalidated.
 * - Token expires after 30 minutes.
 * - Caller receives the raw token only once.
 */
export async function createPasswordResetToken(
  email: string,
): Promise<{
  requested: boolean;
  userId?: string;
  email?: string;
  name?: string;
  token?: string;
  expiresAt?: Date;
}> {
  const normalizedEmail =
    normalizeEmail(email);

  const user =
    await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
      },
    });

  /*
   * Never reveal whether an email belongs to
   * an account.
   */
  if (!user || !user.isVerified) {
    return {
      requested: true,
    };
  }

  const rawToken =
    generatePasswordResetToken();

  const tokenHash =
    hashPasswordResetToken(
      rawToken,
    );

  const expiresAt =
    new Date(
      Date.now() +
        PASSWORD_RESET_TOKEN_EXPIRY_MINUTES *
          60 *
          1000,
    );

  await prisma.$transaction(
    async (tx) => {
      /*
       * Invalidate all older reset tokens for
       * this account.
       */
      await tx.passwordResetToken.deleteMany(
        {
          where: {
            userId: user.id,
          },
        },
      );

      await tx.passwordResetToken.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    },
  );

  return {
    requested: true,
    userId: user.id,
    email: user.email,
    name: user.name,
    token: rawToken,
    expiresAt,
  };
}

/**
 * Completes a password reset using a one-time
 * password reset token.
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<{
  userId: string;
  organizationId?: string | null;
}> {
  if (!isStrongPassword(newPassword)) {
    throw new Error(
      "Password must be 12-128 characters and contain uppercase, lowercase, number, and special character.",
    );
  }

  const token =
    rawToken.trim();

  if (
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    throw new Error(
      "Invalid or expired password reset link.",
    );
  }

  const tokenHash =
    hashPasswordResetToken(token);

  const resetRecord =
    await prisma.passwordResetToken.findUnique(
      {
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      },
    );

  if (!resetRecord) {
    throw new Error(
      "Invalid or expired password reset link.",
    );
  }

  if (resetRecord.usedAt) {
    throw new Error(
      "This password reset link has already been used.",
    );
  }

  if (
    resetRecord.expiresAt <
    new Date()
  ) {
    throw new Error(
      "Invalid or expired password reset link.",
    );
  }

  const user =
    resetRecord.user;

  if (
    verifyPassword(
      newPassword,
      user.passwordHash,
    )
  ) {
    throw new Error(
      "New password must be different from the current password.",
    );
  }

  const passwordHash =
    hashPassword(
      newPassword,
    );

  let organizationId:
    | string
    | null =
    null;

  const result =
    await prisma.$transaction(
      async (tx) => {
        /*
         * Claim the token atomically.
         *
         * This prevents the same reset token from
         * being successfully consumed by two
         * simultaneous requests.
         */
        const claimed =
          await tx.passwordResetToken.updateMany(
            {
              where: {
                id: resetRecord.id,
                usedAt: null,
                expiresAt: {
                  gt: new Date(),
                },
              },
              data: {
                usedAt: new Date(),
              },
            },
          );

        if (claimed.count !== 1) {
          throw new Error(
            "Invalid or expired password reset link.",
          );
        }

        const updatedUser =
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              passwordHash,
            },
            select: {
              id: true,
            },
          });

        /*
         * A password reset invalidates every
         * existing authenticated session.
         */
        await tx.refreshToken.updateMany(
          {
            where: {
              userId: user.id,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          },
        );

        /*
         * Remove all remaining reset tokens for
         * this account. The consumed token is
         * removed as well after it has been
         * atomically claimed.
         */
        await tx.passwordResetToken.deleteMany(
          {
            where: {
              userId: user.id,
            },
          },
        );

        const membership =
          await tx.organizationMembership.findFirst(
            {
              where: {
                userId: user.id,
              },
              orderBy: {
                createdAt: "asc",
              },
              select: {
                organizationId: true,
              },
            },
          );

        organizationId =
          membership?.organizationId ??
          null;

        return updatedUser;
      },
    );

  return {
    userId: result.id,
    organizationId,
  };
}

/* ============================================================
   AUTHENTICATED USER
   ============================================================ */

export async function getAuthenticatedUser(
  userId: string,
  organizationId?: string | null,
): Promise<AuthUser | null> {
  return buildAuthenticatedUser(
    userId,
    organizationId,
  );
}

export async function getUserById(
  userId: string,
): Promise<AuthUser | null> {
  return buildAuthenticatedUser(
    userId,
  );
}

export async function createVerificationCode(
  userId: string,
): Promise<string> {
  return resendVerificationCode(
    userId,
  );
}

export function getAccessTokenLifetimeSeconds(): number {
  return getAccessTokenExpirySeconds();
}

/* ============================================================
   SERVICE EXPORT
   ============================================================ */

export const authService = {
  registerUser,

  verifyEmail,

  resendVerificationCode,

  createVerificationCode,

  login: loginUser,

  loginUser,

  refreshAccessToken,

  switchOrganization,

  getUserOrganizations,

  logoutUser,

  revokeAllRefreshTokens,

  changePassword,

  adminResetPassword,

  createPasswordResetToken,

  resetPassword,

  getAuthenticatedUser,

  getUserById,

  createAccessToken,

  verifyAccessToken,

  verifyRefreshToken,

  getAccessTokenLifetimeSeconds,

  isStrongPassword,

  isValidEmail,

  isEmailDomainConfigured,

  hashPassword,

  verifyPassword,
};