import "dotenv/config";

import { prisma } from "../prisma.js";
import {
  hashPassword,
  isStrongPassword,
} from "../services/auth.js";

const SUPER_ADMIN_NAME =
  process.env.BOOTSTRAP_SUPER_ADMIN_NAME;

const SUPER_ADMIN_EMAIL =
  process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;

const SUPER_ADMIN_PHONE =
  process.env.BOOTSTRAP_SUPER_ADMIN_PHONE;

const SUPER_ADMIN_PASSWORD =
  process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;

async function main() {
  if (
    !SUPER_ADMIN_NAME ||
    !SUPER_ADMIN_EMAIL ||
    !SUPER_ADMIN_PASSWORD
  ) {
    throw new Error(
      [
        "Bootstrap Super Admin variables are missing.",
        "",
        "Required:",
        "BOOTSTRAP_SUPER_ADMIN_NAME",
        "BOOTSTRAP_SUPER_ADMIN_EMAIL",
        "BOOTSTRAP_SUPER_ADMIN_PASSWORD",
      ].join("\n"),
    );
  }

  if (!isStrongPassword(SUPER_ADMIN_PASSWORD)) {
    throw new Error(
      [
        "BOOTSTRAP_SUPER_ADMIN_PASSWORD does not meet the PharmaTrack password policy.",
        "",
        "Password requirements:",
        "- 12 to 128 characters",
        "- At least one uppercase letter",
        "- At least one lowercase letter",
        "- At least one number",
        "- At least one special character",
      ].join("\n"),
    );
  }

  const email =
    SUPER_ADMIN_EMAIL.trim().toLowerCase();

  if (!email) {
    throw new Error(
      "BOOTSTRAP_SUPER_ADMIN_EMAIL cannot be empty.",
    );
  }

  const name =
    SUPER_ADMIN_NAME.trim();

  if (!name) {
    throw new Error(
      "BOOTSTRAP_SUPER_ADMIN_NAME cannot be empty.",
    );
  }

  console.log(
    "==========================================",
  );
  console.log(
    "PharmaTrack SUPER ADMIN password repair",
  );
  console.log(
    "==========================================",
  );
  console.log(
    `Looking up: ${email}`,
  );

  const existing =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (!existing) {
    throw new Error(
      [
        "No user was found with the supplied Super Admin email.",
        "",
        "This repair script intentionally does NOT create",
        "a new Super Admin account.",
        "",
        `Email: ${email}`,
      ].join("\n"),
    );
  }

  if (existing.role !== "SUPER_ADMIN") {
    throw new Error(
      [
        "The supplied account is not a SUPER_ADMIN.",
        "",
        `Email: ${existing.email}`,
        `Current role: ${existing.role}`,
        "",
        "No changes were made.",
      ].join("\n"),
    );
  }

  const passwordHash =
    hashPassword(
      SUPER_ADMIN_PASSWORD,
    );

  const updated =
    await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        name,
        phone:
          SUPER_ADMIN_PHONE?.trim() ||
          null,
        role: "SUPER_ADMIN",
        isVerified: true,
        passwordHash,
      },
    });

  console.log(
    "==========================================",
  );
  console.log(
    "Super Admin password repaired successfully.",
  );
  console.log(
    "==========================================",
  );
  console.log(
    `Name:  ${updated.name}`,
  );
  console.log(
    `Email: ${updated.email}`,
  );
  console.log(
    `Role:  ${updated.role}`,
  );
  console.log(
    `Verified: ${updated.isVerified}`,
  );
  console.log(
    "Password hash: updated",
  );
  console.log(
    "Organization membership: unchanged",
  );
  console.log(
    "==========================================",
  );
  console.log(
    "You can now test Super Admin login.",
  );
  console.log(
    "==========================================",
  );
}

main()
  .catch((error) => {
    console.error(
      "SUPER ADMIN bootstrap failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });