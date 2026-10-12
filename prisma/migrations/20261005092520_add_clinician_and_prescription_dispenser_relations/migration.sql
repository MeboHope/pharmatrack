-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "DispenseTransaction" ADD CONSTRAINT "DispenseTransaction_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
