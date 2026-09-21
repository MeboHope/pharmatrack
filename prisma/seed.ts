import "dotenv/config";

import { prisma } from "../server/prisma.js";
import { hashPassword } from "../server/services/auth.js";

const DEFAULT_ORGANIZATION_ID =
  "pharmatrack-default-org";

const requiredEnv = [
  "BOOTSTRAP_ADMIN_NAME",
  "BOOTSTRAP_ADMIN_EMAIL",
  "BOOTSTRAP_ADMIN_PASSWORD",
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(
      `${key} is required in .env before running the database seed.`,
    );
  }
}

const adminName =
  process.env.BOOTSTRAP_ADMIN_NAME!.trim();

const adminEmail =
  process.env.BOOTSTRAP_ADMIN_EMAIL!
    .trim()
    .toLowerCase();

const adminPhone =
  process.env.BOOTSTRAP_ADMIN_PHONE?.trim() ||
  null;

const adminPassword =
  process.env.BOOTSTRAP_ADMIN_PASSWORD!;

async function main() {
  console.log("");
  console.log("==========================================");
  console.log("     PharmaTrack Bootstrap Seed");
  console.log("==========================================");

  /*
   * -------------------------------------------------------
   * 1. Ensure the default organization exists
   * -------------------------------------------------------
   */

  const organization =
    await prisma.organization.upsert({
      where: {
        id: DEFAULT_ORGANIZATION_ID,
      },
      update: {},
      create: {
        id: DEFAULT_ORGANIZATION_ID,
        name: "PharmaTrack",
        type: "PHARMACY",
        status: "ACTIVE",
      },
    });

  console.log("");
  console.log(
    `Organization ready: ${organization.name}`,
  );
  console.log(
    `Organization ID: ${organization.id}`,
  );

  /*
   * -------------------------------------------------------
   * 2. Find or create the bootstrap administrator
   * -------------------------------------------------------
   */

  let admin =
    await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

  if (admin) {
    console.log("");
    console.log(
      `Bootstrap administrator already exists: ${admin.email}`,
    );
    console.log(
      "Existing account credentials were preserved.",
    );
  } else {
    const passwordHash =
      await hashPassword(adminPassword);

    admin =
      await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
          passwordHash,
          role: "ADMIN",
          isVerified: true,
        },
      });

    console.log("");
    console.log(
      "Bootstrap administrator created.",
    );
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}`);
    console.log("");
    console.log(
      "The password was securely hashed before storage.",
    );
  }

  /*
   * -------------------------------------------------------
   * 3. Ensure the administrator has an organization
   *    membership
   * -------------------------------------------------------
   */

  const existingMembership =
    await prisma.organizationMembership.findUnique(
      {
        where: {
          organizationId_userId: {
            organizationId:
              DEFAULT_ORGANIZATION_ID,
            userId: admin.id,
          },
        },
      },
    );

  if (existingMembership) {
    console.log("");
    console.log(
      "Administrator organization membership already exists.",
    );
    console.log(
      `Membership role: ${existingMembership.role}`,
    );
  } else {
    await prisma.organizationMembership.create({
      data: {
        organizationId:
          DEFAULT_ORGANIZATION_ID,
        userId: admin.id,
        role: "ADMIN",
      },
    });

    console.log("");
    console.log(
      "Administrator organization membership created.",
    );
    console.log(
      "Membership role: ADMIN",
    );
  }

  /*
   * -------------------------------------------------------
   * 4. Ensure the administrator's global role remains
   *    compatible with the bootstrap account.
   *
   *    We deliberately do not overwrite an existing
   *    account's role here.
   * -------------------------------------------------------
   */

  console.log("");
  console.log("Bootstrap seed completed successfully.");
  console.log("");
  console.log(
    "No existing account password was changed.",
  );
  console.log(
    "No existing pharmacy data was deleted.",
  );
  console.log(
    "No database reset was performed.",
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "PharmaTrack bootstrap seed failed:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });