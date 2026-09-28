-- AlterTable
ALTER TABLE "StockAdjustment" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "quantityDelta" INTEGER,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT,
ALTER COLUMN "drugId" DROP NOT NULL,
ALTER COLUMN "drugName" DROP NOT NULL,
ALTER COLUMN "batchNo" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "StockAdjustment_productId_idx" ON "StockAdjustment"("productId");

-- CreateIndex
CREATE INDEX "StockAdjustment_batchId_idx" ON "StockAdjustment"("batchId");

-- CreateIndex
CREATE INDEX "StockAdjustment_type_idx" ON "StockAdjustment"("type");

-- CreateIndex
CREATE INDEX "StockAdjustment_referenceType_referenceId_idx" ON "StockAdjustment"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DrugBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
