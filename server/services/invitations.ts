import crypto from "node:crypto";

import type { UserRole } from "@prisma/client";

import { prisma } from "../prisma.js";
import {
  hashPassword,
  isStrongPassword,
} from "./auth.js";
import {
  isValidEmail,
} from "../middleware/security.js";
import {
  sendInvitationEmail,
  type InvitationRole,
} from "./invitationEmail.js";
import {
  assertUserLimit,
  lockOrganizationSubscriptionResources,
} from "./subscriptionLimits.js";

const INVITATION_EXPIRY_HOURS = 72;

export interface CreateInvitationInput {
  organizationId: string;
  invitedById: string;
  name: string;
  email: string;
  phone?: string | null;
  role: InvitationRole;
}

export interface InvitationRecord {
  id: string;
  organizationId: string;
  invitedById: string;
  name: string;
  email: string;
  phone: string | null;
  role: InvitationRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function isInvitationRole(
  role: UserRole | string,
): role is InvitationRole {
  return (
    role === "ADMIN" ||
    role === "PHARMACIST" ||
    role === "CLINICIAN"
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateInvitationToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function hashInvitationToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getInvitationExpiry(): Date {
  return new Date(
    Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
  );
}

function toInvitationRecord(
  invitation: {
    id: string;
    organizationId: string;
    invitedById: string;
    name: string;
    email: string;
    phone: string | null;
    role: UserRole;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
): InvitationRecord {
  if (!isInvitationRole(invitation.role)) {
    throw new Error("Invalid invitation role.");
  }

  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    invitedById: invitation.invitedById,
    name: invitation.name,
    email: invitation.email,
    phone: invitation.phone,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<{
  invitation: InvitationRecord;
  token: string;
}> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const phone = input.phone?.trim() || null;

  if (!isValidEmail(email)) {
    throw new Error("Please provide a valid email address.");
  }

  if (!isInvitationRole(input.role)) {
    throw new Error(
      "Invitation role must be ADMIN, PHARMACIST, or CLINICIAN.",
    );
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiry();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await lockOrganizationSubscriptionResources(
      tx,
      input.organizationId,
    );

    const existingUser = await tx.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      const existingMembership =
        await tx.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: input.organizationId,
              userId: existingUser.id,
            },
          },
          select: {
            id: true,
          },
        });

      if (existingMembership) {
        throw new Error(
          "This user is already a member of the organization.",
        );
      }
    }

    const pendingInvitation =
      await tx.organizationInvitation.findFirst({
        where: {
          organizationId: input.organizationId,
          email,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        select: {
          id: true,
        },
      });

    if (pendingInvitation) {
      throw new Error(
        "There is already a pending invitation for this email address.",
      );
    }

    await assertUserLimit(
      tx,
      input.organizationId,
      { now },
    );

    const organization = await tx.organization.findUnique({
      where: {
        id: input.organizationId,
      },
      select: {
        name: true,
      },
    });

    if (!organization) {
      throw new Error("Organization not found.");
    }

    const invitation =
      await tx.organizationInvitation.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          invitedById: input.invitedById,
          name,
          email,
          phone,
          role: input.role,
          tokenHash,
          expiresAt,
        },
      });

    return {
      invitation,
      organizationName: organization.name,
    };
  });

  // Send email after the transaction commits.
  try {
    await sendInvitationEmail({
      to: email,
      recipientName: name,
      organizationName: result.organizationName,
      role: input.role,
      invitationToken: token,
      expiresAt,
    });
  } catch (error) {
    // Preserve the existing behavior of deleting an invitation
    // when email delivery fails.
    await prisma.organizationInvitation.delete({
      where: {
        id: result.invitation.id,
      },
    });

    throw error;
  }

  return {
    invitation: toInvitationRecord(result.invitation),
    token,
  };
}

export async function listOrganizationInvitations(
  organizationId: string,
): Promise<InvitationRecord[]> {
  const invitations =
    await prisma.organizationInvitation.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return invitations.map(toInvitationRecord);
}

export async function validateInvitation(token: string): Promise<{
  valid: boolean;
  invitation?: InvitationRecord;
}> {
  const tokenHash = hashInvitationToken(token);

  const invitation =
    await prisma.organizationInvitation.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!invitation) {
    return {
      valid: false,
    };
  }

  if (invitation.acceptedAt) {
    return {
      valid: false,
    };
  }

  if (invitation.revokedAt) {
    return {
      valid: false,
    };
  }

  if (invitation.expiresAt <= new Date()) {
    return {
      valid: false,
    };
  }

  return {
    valid: true,
    invitation: toInvitationRecord(invitation),
  };
}

export async function acceptInvitation(input: {
  token: string;
  password: string;
  name?: string;
}): Promise<{
  userId: string;
  organizationId: string;
}> {
  const tokenHash = hashInvitationToken(input.token);

  const initialInvitation =
    await prisma.organizationInvitation.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!initialInvitation) {
    throw new Error("Invitation is invalid or has expired.");
  }

  if (initialInvitation.acceptedAt) {
    throw new Error("This invitation has already been accepted.");
  }

  if (initialInvitation.revokedAt) {
    throw new Error("This invitation has been revoked.");
  }

  if (initialInvitation.expiresAt <= new Date()) {
    throw new Error("This invitation has expired.");
  }

  if (!isInvitationRole(initialInvitation.role)) {
    throw new Error("This invitation contains an invalid role.");
  }

  if (!isStrongPassword(input.password)) {
    throw new Error(
      "Password must be 12-128 characters and contain uppercase, lowercase, number, and special character.",
    );
  }

  // Hash the password before opening the database transaction.
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await lockOrganizationSubscriptionResources(
      tx,
      initialInvitation.organizationId,
    );

    // Reload and revalidate after acquiring the lock.
    const invitation =
      await tx.organizationInvitation.findUnique({
        where: {
          id: initialInvitation.id,
        },
      });

    if (!invitation || invitation.tokenHash !== tokenHash) {
      throw new Error("Invitation is invalid or has expired.");
    }

    if (invitation.acceptedAt) {
      throw new Error("This invitation has already been accepted.");
    }

    if (invitation.revokedAt) {
      throw new Error("This invitation has been revoked.");
    }

    if (invitation.expiresAt <= now) {
      throw new Error("This invitation has expired.");
    }

    if (!isInvitationRole(invitation.role)) {
      throw new Error("This invitation contains an invalid role.");
    }

    // Exclude the invitation being accepted from pending seat usage.
    await assertUserLimit(
      tx,
      invitation.organizationId,
      {
        excludeInvitationId: invitation.id,
        now,
      },
    );

    const existingUser = await tx.user.findUnique({
      where: {
        email: invitation.email,
      },
      select: {
        id: true,
      },
    });

    let userId: string;

    if (existingUser) {
      const existingMembership =
        await tx.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId: existingUser.id,
            },
          },
          select: {
            id: true,
          },
        });

      if (existingMembership) {
        throw new Error(
          "This user is already a member of the organization.",
        );
      }

      userId = existingUser.id;
    } else {
      const createdUser = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email: invitation.email,
          passwordHash,
          name:
            input.name?.trim() ||
            invitation.name.trim(),
          phone: invitation.phone,
          role: invitation.role,
          isVerified: true,
        },
        select: {
          id: true,
        },
      });

      userId = createdUser.id;
    }

    await tx.organizationMembership.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
      },
    });

    // Conditionally consume the invitation. If it is no longer
    // available, throw so the user/membership writes roll back.
    const accepted =
      await tx.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          acceptedAt: now,
        },
      });

    if (accepted.count !== 1) {
      throw new Error(
        "This invitation is no longer available for acceptance.",
      );
    }

    return {
      userId,
      organizationId: invitation.organizationId,
    };
  });
}

export async function resendInvitation(
  invitationId: string,
): Promise<void> {
  const initialInvitation =
    await prisma.organizationInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

  if (!initialInvitation) {
    throw new Error("Invitation not found.");
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiry();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await lockOrganizationSubscriptionResources(
      tx,
      initialInvitation.organizationId,
    );

    const invitation =
      await tx.organizationInvitation.findUnique({
        where: {
          id: invitationId,
        },
      });

    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    if (invitation.acceptedAt) {
      throw new Error(
        "This invitation has already been accepted.",
      );
    }

    if (invitation.revokedAt) {
      throw new Error("This invitation has been revoked.");
    }

    if (invitation.expiresAt <= now) {
      throw new Error("This invitation has expired.");
    }

    if (!isInvitationRole(invitation.role)) {
      throw new Error("Invalid invitation role.");
    }

    const organization = await tx.organization.findUnique({
      where: {
        id: invitation.organizationId,
      },
      select: {
        name: true,
      },
    });

    if (!organization) {
      throw new Error("Organization not found.");
    }

    const updated =
      await tx.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          tokenHash,
          expiresAt,
        },
      });

    if (updated.count !== 1) {
      throw new Error(
        "This invitation is no longer available for resending.",
      );
    }

    return {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      organizationName: organization.name,
    };
  });

  // Send the email after the transaction commits.
  await sendInvitationEmail({
    to: result.email,
    recipientName: result.name,
    organizationName: result.organizationName,
    role: result.role,
    invitationToken: token,
    expiresAt,
  });
}

export async function revokeInvitation(
  invitationId: string,
): Promise<void> {
  const initialInvitation =
    await prisma.organizationInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

  if (!initialInvitation) {
    throw new Error("Invitation not found.");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await lockOrganizationSubscriptionResources(
      tx,
      initialInvitation.organizationId,
    );

    const invitation =
      await tx.organizationInvitation.findUnique({
        where: {
          id: invitationId,
        },
      });

    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    if (invitation.acceptedAt) {
      throw new Error(
        "This invitation has already been accepted.",
      );
    }

    if (invitation.revokedAt) {
      throw new Error(
        "This invitation has already been revoked.",
      );
    }

    const revoked =
      await tx.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

    if (revoked.count !== 1) {
      throw new Error(
        "This invitation is no longer available for revocation.",
      );
    }
  });
}