import "dotenv/config";
import { randomUUID } from "crypto";

import { prisma } from "../server/prisma.js";
import {
  hashPassword,
  isStrongPassword,
  isValidEmail,
} from "../server/services/auth.js";

const requiredEnv = [
  "SUPER_ADMIN_NAME",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PASSWORD",
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(
      `${key} is required in .env before running the Super Admin seed.`,
    );
  }
}

const adminName =
  process.env.SUPER_ADMIN_NAME!.trim();

const adminEmail =
  process.env.SUPER_ADMIN_EMAIL!
    .trim()
    .toLowerCase();

const adminPhone =
  process.env.SUPER_ADMIN_PHONE?.trim() ||
  null;

const adminPassword =
  process.env.SUPER_ADMIN_PASSWORD!;

if (!adminName) {
  throw new Error(
    "SUPER_ADMIN_NAME cannot be empty.",
  );
}

if (!isValidEmail(adminEmail)) {
  throw new Error(
    "SUPER_ADMIN_EMAIL must be a valid email address.",
  );
}

if (!isStrongPassword(adminPassword)) {
  throw new Error(
    "SUPER_ADMIN_PASSWORD does not meet the required password policy.",
  );
}

async function main() {
  console.log("");
  console.log("==========================================");
  console.log("       PharmaTrack Super Admin Seed");
  console.log("==========================================");

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

  if (existingUser) {
    if (existingUser.role === "SUPER_ADMIN") {
      console.log("");
      console.log(
        `Super Admin already exists: ${existingUser.email}`,
      );
      console.log(
        "No changes were made to the existing account.",
      );
      console.log("");

      return;
    }

    throw new Error(
      `A user already exists with email ${adminEmail}, but that user is not a SUPER_ADMIN. Choose a different email address.`,
    );
  }

  const passwordHash =
    await hashPassword(adminPassword);

  const superAdmin =
    await prisma.user.create({
      data: {
        id: randomUUID(),
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        passwordHash,
        role: "SUPER_ADMIN",
        isVerified: true,
      },
    });

  console.log("");
  console.log(
    "Super Admin created successfully.",
  );
  console.log(`Name:  ${superAdmin.name}`);
  console.log(`Email: ${superAdmin.email}`);
  console.log(`Role:  ${superAdmin.role}`);
  console.log("");
  console.log(
    "This account is platform-wide and does not belong to an organization.",
  );
  console.log(
    "The password was securely hashed before storage.",
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "Super Admin seed failed:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });