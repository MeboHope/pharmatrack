-- Allow a payment to exist before its subscription is created.
ALTER TABLE "BillingPayment"
ALTER COLUMN "subscriptionId" DROP NOT NULL;

-- Link checkout attempts to their originating plan-change request.
ALTER TABLE "BillingPayment"
ADD COLUMN "subscriptionChangeRequestId" TEXT;

-- Support efficient payment-history and status queries by request.
CREATE INDEX "BillingPayment_subscriptionChangeRequestId_status_idx"
ON "BillingPayment"("subscriptionChangeRequestId", "status");

-- Preserve referential integrity for plan-change payments.
ALTER TABLE "BillingPayment"
ADD CONSTRAINT "BillingPayment_subscriptionChangeRequestId_fkey"
FOREIGN KEY ("subscriptionChangeRequestId")
REFERENCES "SubscriptionChangeRequest"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
