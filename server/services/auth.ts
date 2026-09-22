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

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not configured.",
  );
}

// Type assertion: JWT_SECRET is guaranteed to be a string after the check above
const JWT_SECRET_FINAL = JWT_SECRET as string;

const ACCESS_TOKEN_EXPIRES_IN =
  process.env.ACCESS_TOKEN_EXPIRES_IN ||
  "15m";

const REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN ||
  "7d";

const VERIFICATION_CODE_EXPIRY_MINUTES = 15;

const MAX_VERIFICATION_ATTEMPTS = 5;

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

  /*
   * First validate the structure.
   */
  if (!isValidEmail(email)) {
    throw new Error(
      "Please enter a valid email address.",
    );
  }

  /*
   * Then verify that the email domain has
   * usable mail/DNS configuration.
   *
   * This prevents registration using domains
   * that clearly cannot receive email.
   */
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

        /*
         * Prisma relation name is "user".
         *
         * The schema defines:
         *
         * user User @relation(...)
         *
         * Therefore we connect through the
         * relation instead of supplying userId
         * directly to the checked create input.
         */
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

  /*
   * We deliberately do not run DNS validation
   * here.
   *
   * The original registration already passed
   * domain validation, and the user may simply
   * be requesting another verification code.
   */
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