import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const isProduction = process.env.NODE_ENV === "production";

const connectionString = isProduction
  ? process.env.DATABASE_RUNTIME_URL
  : process.env.DATABASE_RUNTIME_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isProduction
      ? "DATABASE_RUNTIME_URL is not configured for production."
      : "DATABASE_RUNTIME_URL or DATABASE_URL is not configured.",
  );
}

const adapter = new PrismaPg({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 10000,
});

export const prisma = new PrismaClient({
  adapter,
});