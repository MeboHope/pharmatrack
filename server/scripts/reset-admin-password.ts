import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { prisma } from "../prisma.js";
import { hashPassword } from "../services/auth.js";

const rl = readline.createInterface({
  input,
  output,
});

async function main() {
  try {
    const email = (
      await rl.question("Admin email: ")
    )
      .trim()
      .toLowerCase();

    if (!email) {
      throw new Error("Admin email is required.");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error(`No user found for ${email}.`);
    }

    if (user.role !== "ADMIN") {
      throw new Error(
        "The specified account is not an ADMIN account.",
      );
    }

    const password = await rl.question(
      "Enter the new admin password: ",
    );

    if (password.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters.",
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isVerified: true,
      },
    });

    console.log("");
    console.log("==========================================");
    console.log("       ADMIN PASSWORD RESET SUCCESSFUL");
    console.log("==========================================");
    console.log(`Account: ${user.email}`);
    console.log("Password hash updated in PostgreSQL.");
    console.log("The plaintext password was not stored.");
    console.log("");
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("");
  console.error("Password reset failed:");
  console.error(
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});