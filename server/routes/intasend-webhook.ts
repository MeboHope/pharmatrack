import { timingSafeEqual } from "node:crypto";
import express from "express";

import { prisma } from "../prisma.js";
import {
  activateVerifiedIntaSendPayment,
  BillingPaymentActivationError,
} from "../services/billingPaymentActivation.js";
import { verifyIntaSendStatus } from "../services/intasendStatus.js";

const router = express.Router();

const PROVIDER = "INTASEND";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  record: JsonRecord,
  key: string,
): string | null {
  const value = record[key];

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function challengeMatches(
  received: unknown,
  expected: string,
): boolean {
  if (typeof received !== "string" || !received) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

router.post("/", async (request, response) => {
  const expectedChallenge =
    process.env.INTASEND_WEBHOOK_CHALLENGE?.trim();

  if (!expectedChallenge) {
    console.error(
      "INTASEND_WEBHOOK_CHALLENGE is not configured.",
    );

    return response.status(503).json({
      success: false,
      message: "Payment webhook is not configured.",
    });
  }

  const body = isRecord(request.body) ? request.body : {};

  if (
    !challengeMatches(body.challenge, expectedChallenge)
  ) {
    return response.status(401).json({
      success: false,
      message: "Invalid webhook challenge.",
    });
  }

  /*
   * IntaSend webhook payloads may contain payment details directly
   * or inside a resource/data object. Accept only object-shaped
   * payloads and extract the fields needed for correlation.
   */
  const nestedResource = isRecord(body.invoice)
    ? body.invoice
    : isRecord(body.data)
      ? body.data
      : isRecord(body.resource)
        ? body.resource
        : body;

  const invoiceId =
    getString(nestedResource, "invoice_id") ??
    getString(body, "invoice_id");

  const apiRef =
    getString(nestedResource, "api_ref") ??
    getString(body, "api_ref");

  const state =
    getString(nestedResource, "state") ??
    getString(body, "state");

  const topic = getString(body, "topic");

  if (!invoiceId || !state) {
    return response.status(400).json({
      success: false,
      message: "Webhook is missing required payment details.",
    });
  }

  /*
   * The provider does not always supply a stable event identifier.
   * This deterministic key deduplicates repeated notifications for
   * the same invoice/state/reference combination.
   */
  const eventId = [
    invoiceId,
    state.toUpperCase(),
    apiRef ?? "no-api-ref",
  ].join(":");

  const safePayload = {
    topic,
    invoice_id: invoiceId,
    api_ref: apiRef,
    state: state.toUpperCase(),
    value:
      typeof nestedResource.value === "string" ||
      typeof nestedResource.value === "number"
        ? nestedResource.value
        : null,
    currency: getString(nestedResource, "currency"),
    provider_ref: getString(nestedResource, "provider_ref"),
  };

  let webhookEvent;

  try {
    webhookEvent = await prisma.billingWebhookEvent.upsert({
      where: {
        provider_eventId: {
          provider: PROVIDER,
          eventId,
        },
      },
      create: {
        provider: PROVIDER,
        eventId,
        eventType: topic ?? state.toUpperCase(),
        payload: safePayload,
      },
      update: {
        /*
         * Do not clear processedAt on duplicate deliveries.
         * A previously completed event must remain completed.
         */
        payload: safePayload,
      },
      select: {
        id: true,
        processedAt: true,
        processingError: true,
      },
    });
  } catch (error) {
    console.error(
      "Could not record IntaSend webhook event:",
      error,
    );

    return response.status(500).json({
      success: false,
      message: "Unable to record payment notification.",
    });
  }

  if (webhookEvent.processedAt) {
    return response.json({
      success: true,
      received: true,
      duplicate: true,
    });
  }

  try {
    /*
     * Prefer api_ref, which checkout creation sets to BillingPayment.id.
     * Never use browser-supplied organization identifiers.
     */
    if (!apiRef) {
      throw new Error(
        "IntaSend webhook did not include api_ref; payment cannot be correlated safely.",
      );
    }

    const payment = await prisma.billingPayment.findFirst({
      where: {
        id: apiRef,
        provider: PROVIDER,
      },
      select: {
        id: true,
        status: true,
        providerReference: true,
        providerCheckoutId: true,
        subscriptionId: true,
      },
    });

    if (!payment) {
      /*
       * A notification with an unknown api_ref cannot authorize
       * any subscription. Record the issue and acknowledge it so
       * unrelated provider notifications are not retried forever.
       */
      await prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processedAt: new Date(),
          processingError:
            "No matching IntaSend payment was found for api_ref.",
        },
      });

      console.warn(
        "Ignoring IntaSend webhook for an unknown payment reference.",
      );

      return response.json({
        success: true,
        received: true,
        ignored: true,
      });
    }

    if (payment.status === "SUCCEEDED" && payment.subscriptionId) {
      await prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processedAt: new Date(),
          processingError: null,
        },
      });

      return response.json({
        success: true,
        received: true,
        duplicate: true,
      });
    }

    /*
     * Verify with IntaSend's API rather than trusting the webhook's
     * state, amount, or currency. Use the invoice ID from the event.
     */
    const verified = await verifyIntaSendStatus({
      invoiceId,
    });

    if (verified.apiRef !== payment.id) {
      throw new Error(
        "The verified provider reference does not match the payment record.",
      );
    }

    if (verified.state === "COMPLETE") {
      await activateVerifiedIntaSendPayment(
        payment.id,
        verified,
      );
    } else if (
      verified.state === "FAILED" ||
      verified.state === "CANCELED"
    ) {
      const status =
        verified.state === "CANCELED"
          ? "CANCELED"
          : "FAILED";

      /*
       * A delayed failure notification must never downgrade a
       * payment that has already succeeded.
       */
      await prisma.billingPayment.updateMany({
        where: {
          id: payment.id,
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
        data: {
          status,
          failedAt: new Date(),
          failureCode: verified.state,
          failureMessage:
            `IntaSend confirmed payment state: ${verified.state}`,
        },
      });
    } else if (
      verified.state === "PROCESSING" ||
      verified.state === "RETRY" ||
      verified.state === "PARTIAL"
    ) {
      await prisma.billingPayment.updateMany({
        where: {
          id: payment.id,
          status: "PENDING",
        },
        data: {
          status: "PROCESSING",
        },
      });
    }

    await prisma.billingWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processedAt: new Date(),
        processingError: null,
      },
    });

    return response.json({
      success: true,
      received: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown webhook processing error.";

    try {
      await prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingError: message.slice(0, 1000),
        },
      });
    } catch (recordError) {
      console.error(
        "Could not record IntaSend webhook processing error:",
        recordError,
      );
    }

    if (error instanceof BillingPaymentActivationError) {
      /*
       * These checks cannot succeed by blindly retrying the same
       * event. Keep the error for investigation and acknowledge it.
       */
      const permanentCodes = new Set([
        "PAYMENT_REFERENCE_MISMATCH",
        "PAYMENT_AMOUNT_MISMATCH",
        "PAYMENT_CURRENCY_MISMATCH",
        "PLAN_PRICE_MISMATCH",
        "PLAN_CURRENCY_MISMATCH",
        "REQUEST_ALREADY_APPLIED",
        "REQUEST_NOT_APPROVED",
        "PLAN_INACTIVE",
        "INVALID_BILLING_INTERVAL",
      ]);

      if (permanentCodes.has(error.code)) {
        console.error(
          "IntaSend webhook requires billing review:",
          error.code,
        );

        await prisma.billingWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            processedAt: new Date(),
            processingError: `${error.code}: ${message}`.slice(
              0,
              1000,
            ),
          },
        });

        return response.json({
          success: true,
          received: true,
          reviewRequired: true,
        });
      }
    }

    console.error("IntaSend webhook processing failed:", error);

    /*
     * Leave processedAt null so a provider retry can try again.
     */
    return response.status(500).json({
      success: false,
      message: "Payment notification processing failed.",
    });
  }
});

export default router;