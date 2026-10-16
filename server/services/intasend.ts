
const INTASEND_CHECKOUT_URL =
  "https://api.intasend.com/api/v1/checkout/";

export interface IntaSendCheckoutInput {
  amount: string;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  apiRef: string;
  redirectUrl: string;
}

export interface IntaSendCheckoutResult {
  id: string;
  url: string;
  signature?: string;
  amount?: number | string;
  currency?: string;
  paid?: boolean;
}

interface IntaSendErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

function getPublicKey(): string {
  const key = process.env.INTASEND_PUBLIC_KEY?.trim();

  if (!key) {
    throw new Error("INTASEND_PUBLIC_KEY is not configured.");
  }

  return key;
}

function getSecretKey(): string {
  const key = process.env.INTASEND_SECRET_KEY?.trim();

  if (!key) {
    throw new Error("INTASEND_SECRET_KEY is not configured.");
  }

  return key;
}

async function readProviderError(
  response: Response,
): Promise<string> {
  try {
    const body =
      (await response.json()) as IntaSendErrorResponse;

    return (
      body.detail ??
      body.message ??
      body.error ??
      `IntaSend returned HTTP ${response.status}.`
    );
  } catch {
    return `IntaSend returned HTTP ${response.status}.`;
  }
}

/**
 * Creates a hosted checkout session.
 *
 * The caller must calculate the amount from the database.
 * Never pass card details through PharmaTrack.
 */
export async function createIntaSendCheckout(
  input: IntaSendCheckoutInput,
): Promise<IntaSendCheckoutResult> {
  const response = await fetch(INTASEND_CHECKOUT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IntaSend-Public-API-Key": getPublicKey(),
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone_number: input.phoneNumber,
      api_ref: input.apiRef,
      redirect_url: input.redirectUrl,
      unique_api_ref: true,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(await readProviderError(response));
  }

  const result =
    (await response.json()) as Partial<IntaSendCheckoutResult>;

  if (
    typeof result.id !== "string" ||
    typeof result.url !== "string" ||
    !result.url.startsWith("https://")
  ) {
    throw new Error(
      "IntaSend returned an invalid checkout response.",
    );
  }

  return {
    id: result.id,
    url: result.url,
    signature: result.signature,
    amount: result.amount,
    currency: result.currency,
    paid: result.paid,
  };
}

/**
 * Verifies a payment with IntaSend's server-side status API.
 *
 * A browser redirect or a webhook payload alone must not
 * be treated as proof that payment succeeded.
 */
export async function getIntaSendPaymentStatus(
  invoiceId: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "https://api.intasend.com/api/v1/payment/status/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invoice_id: invoiceId,
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );

  if (!response.ok) {
    throw new Error(await readProviderError(response));
  }

  const result: unknown = await response.json();

  if (
    typeof result !== "object" ||
    result === null ||
    Array.isArray(result)
  ) {
    throw new Error(
      "IntaSend returned an invalid payment-status response.",
    );
  }

  return result as Record<string, unknown>;
}
