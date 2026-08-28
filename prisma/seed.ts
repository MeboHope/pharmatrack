import "dotenv/config";

import { prisma } from "../server/prisma.js";
import { hashPassword } from "../server/services/auth.js";

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
  console.log("     PharmaTrack Bootstrap Admin Seed");
  console.log("==========================================");

  const existingAdmin =
    await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

  if (existingAdmin) {
    console.log(
      `Admin already exists: ${existingAdmin.email}`,
    );
    console.log(
      "No changes were made to the existing account.",
    );
    return;
  }

  const passwordHash =
    await hashPassword(adminPassword);

  const admin =
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
  console.log("Bootstrap administrator created.");
  console.log(`Name:  ${admin.name}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Role:  ${admin.role}`);
  console.log("");
  console.log(
    "The password was securely hashed before storage.",
  );
  console.log(
    "Future credential changes should be performed through the application.",
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "Bootstrap admin seed failed:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });