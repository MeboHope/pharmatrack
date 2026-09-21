/*
  Multi-tenant foundation migration.

  Existing installation:
    Organization: PharmaTrack
    Type: PHARMACY
    Status: ACTIVE

  This migration:
    1. Creates the organization infrastructure.
    2. Adds SUPER_ADMIN to the platform role enum.
    3. Adds nullable organizationId fields to existing tenant-owned data.
    4. Creates the initial PharmaTrack organization.
    5. Backfills all existing tenant-owned records to PharmaTrack.
    6. Creates organization memberships for all existing users.
    7. Preserves each existing user's current role.
    8. Adds indexes and foreign keys.

  IMPORTANT:
    Existing data is intentionally backfilled before the foreign keys
    are added. No existing application data is deleted.
*/

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('PHARMACY', 'CLINIC');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "DispenseTransaction"
ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Drug"
ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Patient"
ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PharmacySettings"
ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "StockAdjustment"
ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Supplier"
ADD COLUMN "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PHARMACIST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_type_idx"
ON "Organization"("type");

-- CreateIndex
CREATE INDEX "Organization_status_idx"
ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx"
ON "Organization"("createdAt");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx"
ON "OrganizationMembership"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx"
ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_role_idx"
ON "OrganizationMembership"("role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key"
ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx"
ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "DispenseTransaction_organizationId_idx"
ON "DispenseTransaction"("organizationId");

-- CreateIndex
CREATE INDEX "Drug_organizationId_idx"
ON "Drug"("organizationId");

-- CreateIndex
CREATE INDEX "Patient_organizationId_idx"
ON "Patient"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySettings_organizationId_key"
ON "PharmacySettings"("organizationId");

-- CreateIndex
CREATE INDEX "PharmacySettings_organizationId_idx"
ON "PharmacySettings"("organizationId");

-- CreateIndex
CREATE INDEX "StockAdjustment_organizationId_idx"
ON "StockAdjustment"("organizationId");

-- CreateIndex
CREATE INDEX "Supplier_organizationId_idx"
ON "Supplier"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_idx"
ON "User"("role");

-- ============================================================
-- INITIAL ORGANIZATION
-- ============================================================

INSERT INTO "Organization" (
    "id",
    "name",
    "type",
    "status",
    "createdAt",
    "updatedAt"
)
VALUES (
    'pharmatrack-default-org',
    'PharmaTrack',
    'PHARMACY',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ============================================================
-- BACKFILL EXISTING TENANT-OWNED DATA
-- ============================================================

UPDATE "AuditLog"
SET "organizationId" = 'pharmatrack-default-org'
WHERE "organizationId" IS NULL;

UPDATE "DispenseTransaction"
SET "organizationId" = 'pharmatrack-default-org'
WHERE "organizationId" IS NULL;

UPDATE "Drug"
SET "organizationId" = 'pharmatrack-default-org'
WHERE "organizationId" IS NULL;

UPDATE "Patient"
SET "organizationId" = 'pharmatrack-default-org'
WHERE "organizationId" IS NULL;

UPDATE "PharmacySettings"
SET "organizationId" = 'pharmatrack-default-org'
WHERE "organizationId" IS NULL;

UPDATE "StockAdjustment"
SET "organizationId" = 'pharmatrack-default-org'
WHERE "organizationId" IS NULL;

UPDATE "Supplier"
SET "organizationId" = 'pharmatrack-default-org'
WHERE "organizationId" IS NULL;

-- ============================================================
-- CREATE MEMBERSHIPS FOR ALL EXISTING USERS
-- ============================================================
--
-- The user's existing User.role is copied into the membership role.
-- This preserves the current authorization model while establishing
-- organization-level roles for the new multi-tenant architecture.
--

INSERT INTO "OrganizationMembership" (
    "id",
    "organizationId",
    "userId",
    "role",
    "createdAt",
    "updatedAt"
)
SELECT
    'pharmatrack-membership-' || "id",
    'pharmatrack-default-org',
    "id",
    "role",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

-- AddForeignKey
ALTER TABLE "OrganizationMembership"
ADD CONSTRAINT "OrganizationMembership_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership"
ADD CONSTRAINT "OrganizationMembership_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseTransaction"
ADD CONSTRAINT "DispenseTransaction_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drug"
ADD CONSTRAINT "Drug_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient"
ADD CONSTRAINT "Patient_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySettings"
ADD CONSTRAINT "PharmacySettings_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment"
ADD CONSTRAINT "StockAdjustment_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier"
ADD CONSTRAINT "Supplier_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;