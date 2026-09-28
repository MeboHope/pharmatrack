-- DropForeignKey
ALTER TABLE "PrescriptionItem" DROP CONSTRAINT "PrescriptionItem_drugId_fkey";

-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "productId" TEXT,
ALTER COLUMN "drugId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DispenseAllocation" (
    "id" TEXT NOT NULL,
    "transactionItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispenseAllocation_transactionItemId_idx" ON "DispenseAllocation"("transactionItemId");

-- CreateIndex
CREATE INDEX "DispenseAllocation_productId_idx" ON "DispenseAllocation"("productId");

-- CreateIndex
CREATE INDEX "DispenseAllocation_batchId_idx" ON "DispenseAllocation"("batchId");

-- CreateIndex
CREATE INDEX "DispenseAllocation_createdAt_idx" ON "DispenseAllocation"("createdAt");

-- CreateIndex
CREATE INDEX "DispenseTransaction_status_idx" ON "DispenseTransaction"("status");

-- CreateIndex
CREATE INDEX "PrescriptionItem_productId_idx" ON "PrescriptionItem"("productId");

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseAllocation" ADD CONSTRAINT "DispenseAllocation_transactionItemId_fkey" FOREIGN KEY ("transactionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseAllocation" ADD CONSTRAINT "DispenseAllocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseAllocation" ADD CONSTRAINT "DispenseAllocation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DrugBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
