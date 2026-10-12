-- AlterTable
ALTER TABLE "DispenseTransaction" ADD COLUMN     "clinicianId" TEXT;

-- CreateIndex
CREATE INDEX "DispenseTransaction_clinicianId_idx" ON "DispenseTransaction"("clinicianId");

-- CreateIndex
CREATE INDEX "DispenseTransaction_userId_idx" ON "DispenseTransaction"("userId");
