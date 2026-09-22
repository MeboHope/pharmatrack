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

function isInvitationRole(role: UserRole | string): role is InvitationRole {
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

  if (!isValidEmail(email)) {
    throw new Error("Please provide a valid email address.");
  }

  if (!isInvitationRole(input.role)) {
    throw new Error(
      "Invitation role must be ADMIN, PHARMACIST, or CLINICIAN.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    const existingMembership =
      await prisma.organizationMembership.findUnique({
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
    await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: input.organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

  if (pendingInvitation) {
    throw new Error(
      "There is already a pending invitation for this email address.",
    );
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiry();

  const invitation = await prisma.organizationInvitation.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      invitedById: input.invitedById,
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      role: input.role,
      tokenHash,
      expiresAt,
    },
  });

  const organization = await prisma.organization.findUnique({
    where: {
      id: input.organizationId,
    },
    select: {
      name: true,
    },
  });

  if (!organization) {
    await prisma.organizationInvitation.delete({
      where: {
        id: invitation.id,
      },
    });

    throw new Error("Organization not found.");
  }

  try {
    await sendInvitationEmail({
      to: email,
      recipientName: input.name.trim(),
      organizationName: organization.name,
      role: input.role,
      invitationToken: token,
      expiresAt,
    });
  } catch (error) {
    await prisma.organizationInvitation.delete({
      where: {
        id: invitation.id,
      },
    });

    throw error;
  }

  return {
    invitation: toInvitationRecord(invitation),
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

  const invitation =
    await prisma.organizationInvitation.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!invitation) {
    throw new Error("Invitation is invalid or has expired.");
  }

  if (invitation.acceptedAt) {
    throw new Error("This invitation has already been accepted.");
  }

  if (invitation.revokedAt) {
    throw new Error("This invitation has been revoked.");
  }

  if (invitation.expiresAt <= new Date()) {
    throw new Error("This invitation has expired.");
  }

  if (!isInvitationRole(invitation.role)) {
    throw new Error("This invitation contains an invalid role.");
  }

  if (!isStrongPassword(input.password)) {
    throw new Error(
      "Password must be 12–128 characters and contain uppercase, lowercase, number, and special character.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: invitation.email,
    },
    select: {
      id: true,
      isVerified: true,
    },
  });

  if (existingUser) {
    const existingMembership =
      await prisma.organizationMembership.findUnique({
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

    await prisma.$transaction([
      prisma.organizationMembership.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: invitation.organizationId,
          userId: existingUser.id,
          role: invitation.role,
        },
      }),

      prisma.organizationInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          acceptedAt: new Date(),
        },
      }),
    ]);

    return {
      userId: existingUser.id,
      organizationId: invitation.organizationId,
    };
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
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
    });

    await tx.organizationMembership.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: invitation.organizationId,
        userId: createdUser.id,
        role: invitation.role,
      },
    });

    await tx.organizationInvitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        acceptedAt: new Date(),
      },
    });

    return createdUser;
  });

  return {
    userId: user.id,
    organizationId: invitation.organizationId,
  };
}

export async function resendInvitation(
  invitationId: string,
): Promise<void> {
  const invitation =
    await prisma.organizationInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.acceptedAt) {
    throw new Error("This invitation has already been accepted.");
  }

  if (invitation.revokedAt) {
    throw new Error("This invitation has been revoked.");
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiry();

  const organization = await prisma.organization.findUnique({
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

  if (!isInvitationRole(invitation.role)) {
    throw new Error("Invalid invitation role.");
  }

  await prisma.organizationInvitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      tokenHash,
      expiresAt,
    },
  });

  try {
    await sendInvitationEmail({
      to: invitation.email,
      recipientName: invitation.name,
      organizationName: organization.name,
      role: invitation.role,
      invitationToken: token,
      expiresAt,
    });
  } catch (error) {
    throw error;
  }
}

export async function revokeInvitation(
  invitationId: string,
): Promise<void> {
  const invitation =
    await prisma.organizationInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.acceptedAt) {
    throw new Error("This invitation has already been accepted.");
  }

  if (invitation.revokedAt) {
    throw new Error("This invitation has already been revoked.");
  }

  await prisma.organizationInvitation.update({
    where: {
      id: invitationId,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}