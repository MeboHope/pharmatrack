import crypto from "node:crypto";

import { prisma } from "../prisma.js";
import {
  hashPassword,
  isStrongPassword,
  verifyPassword,
} from "./auth.js";

const PASSWORD_RESET_EXPIRY_MINUTES = 30;
const PASSWORD_RESET_TOKEN_BYTES = 32;

const hashResetToken = (token: string): string => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const generateResetToken = (): string => {
  return crypto
    .randomBytes(PASSWORD_RESET_TOKEN_BYTES)
    .toString("hex");
};

export interface PasswordResetRequestResult {
  userId: string;
  email: string;
  name: string;
  token: string;
  expiresAt: Date;
}

/**
 * Creates a new password-reset token for an existing user.
 *
 * SECURITY:
 * - The raw token is returned only to the email-delivery layer.
 * - Only the SHA-256 hash is stored in the database.
 * - Existing unused reset tokens are invalidated first.
 */
export async function createPasswordResetToken(
  email: string,
): Promise<PasswordResetRequestResult | null> {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  /*
   * Deliberately return null without revealing
   * whether the account exists.
   */
  if (!user) {
    return null;
  }

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);

  const expiresAt = new Date(
    Date.now() +
      PASSWORD_RESET_EXPIRY_MINUTES *
        60 *
        1000,
  );

  /*
   * A user should have only one active reset
   * credential at a time.
   */
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    }),

    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    token,
    expiresAt,
  };
}

/**
 * Completes a password reset using a one-time token.
 *
 * SECURITY:
 * - Token must exist.
 * - Token must not already be used.
 * - Token must not be expired.
 * - Password must satisfy the application's strong-password policy.
 * - Password must differ from the current password.
 * - The reset token is consumed atomically.
 * - All existing refresh sessions are revoked atomically.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ userId: string }> {
  const normalizedToken =
    typeof token === "string"
      ? token.trim()
      : "";

  if (!normalizedToken) {
    throw new Error(
      "Invalid or expired password reset link.",
    );
  }

  if (!isStrongPassword(newPassword)) {
    throw new Error(
      "Password must be 12-128 characters and contain uppercase, lowercase, number, and special character.",
    );
  }

  const tokenHash =
    hashResetToken(normalizedToken);

  const resetToken =
    await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            id: true,
            passwordHash: true,
          },
        },
      },
    });

  if (!resetToken) {
    throw new Error(
      "Invalid or expired password reset link.",
    );
  }

  if (resetToken.usedAt) {
    throw new Error(
      "Invalid or expired password reset link.",
    );
  }

  if (
    resetToken.expiresAt.getTime() <=
    Date.now()
  ) {
    /*
     * Mark the expired token as consumed so that
     * it cannot ever become usable again.
     */
    await prisma.passwordResetToken.update({
      where: {
        id: resetToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    throw new Error(
      "Invalid or expired password reset link.",
    );
  }

  /*
   * Prevent resetting to the same password.
   */
  if (
    verifyPassword(
      newPassword,
      resetToken.user.passwordHash,
    )
  ) {
    throw new Error(
      "New password must be different from your current password.",
    );
  }

  const passwordHash =
    hashPassword(newPassword);

  /*
   * Password replacement, reset-token consumption,
   * cleanup of other reset tokens, and refresh-session
   * revocation all happen in one database transaction.
   */
  await prisma.$transaction(
    async (transaction) => {
      const now = new Date();

      const consumed =
        await transaction.passwordResetToken.updateMany(
          {
            where: {
              id: resetToken.id,
              usedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            data: {
              usedAt: now,
            },
          },
        );

      /*
       * This protects against two concurrent requests
       * attempting to consume the same reset token.
       */
      if (consumed.count !== 1) {
        throw new Error(
          "Invalid or expired password reset link.",
        );
      }

      await transaction.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash,
        },
      });

      /*
       * Invalidate every other outstanding reset token
       * for this account.
       */
      await transaction.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          id: {
            not: resetToken.id,
          },
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });

      /*
       * A password reset is a security-sensitive account
       * event. Existing refresh sessions must no longer
       * be trusted.
       */
      await transaction.refreshToken.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    },
  );

  return {
    userId: resetToken.userId,
  };
}

export const passwordResetService = {
  createPasswordResetToken,
  resetPassword,
  PASSWORD_RESET_EXPIRY_MINUTES,
};