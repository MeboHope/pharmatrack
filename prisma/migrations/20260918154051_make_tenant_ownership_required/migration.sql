/*
  Warnings:

  - Made the column `organizationId` on table `DispenseTransaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Drug` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Patient` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `PharmacySettings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `StockAdjustment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Supplier` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DispenseTransaction" DROP CONSTRAINT "DispenseTransaction_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Drug" DROP CONSTRAINT "Drug_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PharmacySettings" DROP CONSTRAINT "PharmacySettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "StockAdjustment" DROP CONSTRAINT "StockAdjustment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Supplier" DROP CONSTRAINT "Supplier_organizationId_fkey";

-- AlterTable
ALTER TABLE "DispenseTransaction" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Drug" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PharmacySettings" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StockAdjustment" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "organizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "DispenseTransaction" ADD CONSTRAINT "DispenseTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drug" ADD CONSTRAINT "Drug_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacySettings" ADD CONSTRAINT "PharmacySettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
