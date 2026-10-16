-- CreateEnum
CREATE TYPE "SubscriptionChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateTable
CREATE TABLE "SubscriptionChangeRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedPlanId" TEXT NOT NULL,
    "requestedInterval" "BillingInterval" NOT NULL,
    "status" "SubscriptionChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_organizationId_status_createdAt_idx" ON "SubscriptionChangeRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_status_createdAt_idx" ON "SubscriptionChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_requestedById_idx" ON "SubscriptionChangeRequest"("requestedById");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_reviewedById_idx" ON "SubscriptionChangeRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_requestedPlanId_idx" ON "SubscriptionChangeRequest"("requestedPlanId");

-- AddForeignKey
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_requestedPlanId_fkey" FOREIGN KEY ("requestedPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
