-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "RefreshToken_organizationId_idx" ON "RefreshToken"("organizationId");
