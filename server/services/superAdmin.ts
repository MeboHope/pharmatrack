import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../prisma.js";
import {
  isValidEmail,
} from "../middleware/security.js";
import {
  sendInvitationEmail,
  type InvitationRole,
} from "./invitationEmail.js";

const INVITATION_ROLE: InvitationRole = "ADMIN";
const INVITATION_EXPIRY_HOURS = 72;

export interface OnboardOrganizationInput {
  name: string;
  type: "PHARMACY" | "CLINIC";
  address?: string;
  phone?: string;
  email?: string;
  invitedById: string;
  initialAdmin: {
    name: string;
    email: string;
    phone?: string;
  };
}

function normalizeOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmed;
}

function normalizeEmail(
  value: unknown,
  fieldName: string,
): string {
  const email = normalizeRequiredString(
    value,
    fieldName,
  ).toLowerCase();

  if (!isValidEmail(email)) {
    throw new Error(
      `${fieldName} must be a valid email address.`,
    );
  }

  return email;
}

function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function createInvitationExpiry(): Date {
  return new Date(
    Date.now() +
      INVITATION_EXPIRY_HOURS *
        60 *
        60 *
        1000,
  );
}

export async function onboardOrganization(
  input: OnboardOrganizationInput,
) {
  const invitedById = normalizeRequiredString(
    input.invitedById,
    "Invited by user ID",
  );

  const organizationName =
    normalizeRequiredString(
      input.name,
      "Organization name",
    );

  const organizationType = input.type;

  if (
    organizationType !== "PHARMACY" &&
    organizationType !== "CLINIC"
  ) {
    throw new Error(
      "Organization type must be PHARMACY or CLINIC.",
    );
  }

  const initialAdminName =
    normalizeRequiredString(
      input.initialAdmin?.name,
      "Initial administrator name",
    );

  const initialAdminEmail =
    normalizeEmail(
      input.initialAdmin?.email,
      "Initial administrator email",
    );

  const organizationEmail =
    input.email !== undefined &&
    input.email !== null &&
    String(input.email).trim()
      ? normalizeEmail(
          input.email,
          "Organization email",
        )
      : null;

  const organizationPhone =
    normalizeOptionalString(
      input.phone,
    );

  const organizationAddress =
    normalizeOptionalString(
      input.address,
    );

  const initialAdminPhone =
    normalizeOptionalString(
      input.initialAdmin?.phone,
    );

  /*
   * Verify that the inviting user exists and is a
   * Super Admin.
   */
  const invitingUser =
    await prisma.user.findUnique({
      where: {
        id: invitedById,
      },
      select: {
        id: true,
        role: true,
      },
    });

  if (!invitingUser) {
    throw new Error(
      "The inviting user does not exist.",
    );
  }

  if (invitingUser.role !== "SUPER_ADMIN") {
    throw new Error(
      "Only Super Admins can onboard organizations.",
    );
  }

  /*
   * Check whether the email already belongs to a
   * platform user.
   *
   * A global user can potentially belong to multiple
   * organizations, so an existing user is not
   * automatically an error.
   */
  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: initialAdminEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
      },
    });

  /*
   * Never allow a Super Admin account to become the
   * initial administrator of an organization.
   */
  if (
    existingUser?.role === "SUPER_ADMIN"
  ) {
    throw new Error(
      "A Super Admin account cannot be assigned as an organization administrator.",
    );
  }

  /*
   * If the user already belongs to an organization,
   * do not silently create another membership through
   * onboarding. The Super Admin can use the existing
   * member-management workflow when appropriate.
   */
  if (existingUser) {
    const existingMembership =
      await prisma.organizationMembership.findFirst(
        {
          where: {
            userId: existingUser.id,
          },
          select: {
            id: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      );

    if (existingMembership) {
      throw new Error(
        `The administrator email is already associated with the organization "${existingMembership.organization.name}".`,
      );
    }
  }

  /*
   * Do not create another organization invitation
   * for the same email while one is still pending.
   */
  const pendingInvitation =
    await prisma.organizationInvitation.findFirst(
      {
        where: {
          email: initialAdminEmail,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    );

  if (pendingInvitation) {
    throw new Error(
      `A pending invitation already exists for this email address for "${pendingInvitation.organization.name}".`,
    );
  }

  /*
   * The token itself is sent only through the email.
   * The database receives only its SHA-256 hash.
   */
  const invitationToken =
    createInvitationToken();

  const tokenHash =
    hashInvitationToken(
      invitationToken,
    );

  const expiresAt =
    createInvitationExpiry();

  /*
   * The onboarding operation is transactional:
   *
   * 1. Create organization.
   * 2. Create initial ADMIN user if necessary.
   * 3. Create ADMIN membership.
   * 4. Create invitation.
   *
   * The email is deliberately sent after the transaction
   * succeeds because external email delivery cannot
   * participate in the PostgreSQL transaction.
   */
  const result =
    await prisma.$transaction(
      async (transaction) => {
        const organization =
          await transaction.organization.create(
            {
              data: {
                id: randomUUID(),
                name: organizationName,
                type: organizationType,
                address:
                  organizationAddress,
                phone:
                  organizationPhone,
                email:
                  organizationEmail,
              },
            },
          );

        let adminUserId =
          existingUser?.id;

        /*
         * If there is no existing global account,
         * create the user without a password.
         *
         * The invitation acceptance process will
         * establish the password.
         */
        if (!adminUserId) {
          const newUser =
            await transaction.user.create(
              {
                data: {
                  id: randomUUID(),
                  name: initialAdminName,
                  email:
                    initialAdminEmail,
                  phone:
                    initialAdminPhone,
                  role: "ADMIN",
                  passwordHash: "",
                  isVerified: false,
                },
              },
            );

          adminUserId = newUser.id;
        } else {
          /*
           * Keep the existing account's credentials
           * untouched. If the Super Admin supplied a
           * phone number, we may populate it only when
           * the existing account does not already have
           * one.
           */
          if (
            initialAdminPhone &&
            !existingUser?.phone
          ) {
            await transaction.user.update(
              {
                where: {
                  id: adminUserId,
                },
                data: {
                  phone:
                    initialAdminPhone,
                },
              },
            );
          }
        }

        const membership =
          await transaction.organizationMembership.create(
            {
              data: {
                id: randomUUID(),
                organizationId:
                  organization.id,
                userId:
                  adminUserId,
                role: "ADMIN",
              },
            },
          );

        const invitation =
          await transaction.organizationInvitation.create(
            {
              data: {
                id: randomUUID(),
                organizationId:
                  organization.id,
                invitedById,
                name:
                  initialAdminName,
                email:
                  initialAdminEmail,
                phone:
                  initialAdminPhone,
                role:
                  INVITATION_ROLE,
                tokenHash,
                expiresAt,
              },
            },
          );

        return {
          organization,
          membership,
          invitation,
          adminUserId,
        };
      },
    );

  /*
   * Send the invitation only after the database
   * transaction has completed successfully.
   */
  try {
    await sendInvitationEmail({
      to: initialAdminEmail,
      recipientName: initialAdminName,
      organizationName:
        organizationName,
      role: INVITATION_ROLE,
      invitationToken,
      expiresAt,
    });
  } catch (error) {
    /*
     * Email delivery failed. The invitation and
     * organization must not be left in a state where
     * the user believes onboarding completed.
     *
     * Remove the newly-created invitation,
     * membership and organization. If we created a
     * brand-new user, remove that user as well.
     */
    try {
      await prisma.$transaction(
        async (transaction) => {
          await transaction.organizationInvitation.delete(
            {
              where: {
                id:
                  result.invitation.id,
              },
            },
          );

          await transaction.organizationMembership.delete(
            {
              where: {
                id:
                  result.membership.id,
              },
            },
          );

          await transaction.organization.delete(
            {
              where: {
                id:
                  result.organization.id,
              },
            },
          );

          if (!existingUser) {
            await transaction.user.delete(
              {
                where: {
                  id:
                    result.adminUserId,
                },
              },
            );
          }
        },
      );
    } catch (rollbackError) {
      console.error(
        "Failed to roll back organization onboarding after invitation email failure:",
        rollbackError,
      );
    }

    console.error(
      "Failed to send initial administrator invitation:",
      error,
    );

    throw new Error(
      "The organization could not be completed because the administrator invitation email could not be sent.",
    );
  }

  return {
    organization:
      result.organization,
    invitation: {
      id:
        result.invitation.id,
      email:
        result.invitation.email,
      role:
        result.invitation.role,
      expiresAt:
        result.invitation.expiresAt,
    },
  };
}