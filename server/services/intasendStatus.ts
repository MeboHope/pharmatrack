const INTASEND_STATUS_URL =
  "https://api.intasend.com/api/v1/payment/status/";

const INTASEND_INVOICES_URL =
  "https://api.intasend.com/api/v1/invoices/";

export interface IntaSendVerifiedStatus {
  invoiceId: string;
  apiRef: string;
  state: string;
  amount: number | string;
  currency: string;
  providerReference: string | null;
}

type JsonRecord = Record<string, unknown>;

interface InvoiceCandidate {
  invoiceId: string;
  apiRef: string;
  state: string;
  amount: number | string;
  currency: string;
  createdAt: number;
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requiredString(
  record: JsonRecord,
  key: string,
): string {
  const value = record[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `IntaSend response is missing ${key}.`,
    );
  }

  return value.trim();
}

function validAmount(
  value: unknown,
): value is number | string {
  return (
    (typeof value === "number" ||
      typeof value === "string") &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  );
}

async function readErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const payload: unknown = await response.json();

    if (isRecord(payload)) {
      for (const key of ["detail", "message", "error"]) {
        const value = payload[key];

        if (typeof value === "string" && value.trim()) {
          return value.trim().slice(0, 300);
        }
      }
    }
  } catch {
    // Use the HTTP status if the response isn't JSON.
  }

  return `IntaSend returned HTTP ${response.status}.`;
}

function getSecretKey(): string {
  const key = process.env.INTASEND_SECRET_KEY?.trim();

  if (!key) {
    throw new Error(
      "INTASEND_SECRET_KEY is not configured.",
    );
  }

  return key;
}

async function getInvoiceCandidates(
  apiRef: string,
  expectedAmount: number | string,
  expectedCurrency: string,
): Promise<InvoiceCandidate[]> {
  const candidates: InvoiceCandidate[] = [];
  const visited = new Set<string>();

  const expectedMinorUnits = Math.round(
    Number(expectedAmount) * 100,
  );

  let nextUrl: string | null = INTASEND_INVOICES_URL;
  let pageCount = 0;
  const MAX_PAGES = 20;

  while (nextUrl) {
    if (pageCount >= MAX_PAGES) {
      throw new Error(
        "IntaSend invoice discovery exceeded its page limit. Payment status was not changed.",
      );
    }

    const url: URL = new URL(nextUrl);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "api.intasend.com"
    ) {
      throw new Error(
        "IntaSend returned an unexpected invoice pagination URL.",
      );
    }

    if (visited.has(url.href)) {
      throw new Error(
        "IntaSend returned a repeated invoice pagination URL.",
      );
    }

    visited.add(url.href);
    pageCount++;

    const response = await fetch(url.href, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(
        `Unable to discover IntaSend invoices: ${await readErrorMessage(response)}`,
      );
    }

    const payload: unknown = await response.json();

    if (
      !isRecord(payload) ||
      !Array.isArray(payload.results)
    ) {
      throw new Error(
        "IntaSend returned an invalid invoice-list response.",
      );
    }

    for (const item of payload.results) {
      if (!isRecord(item)) continue;
      if (item.api_ref !== apiRef) continue;

      const invoiceId = item.invoice_id;
      const state = item.state;
      const currency = item.currency;
      const amount = item.value;

      if (
        typeof invoiceId !== "string" ||
        !invoiceId.trim() ||
        typeof state !== "string" ||
        !validAmount(amount) ||
        typeof currency !== "string"
      ) {
        throw new Error(
          "A matching IntaSend invoice has incomplete verification data.",
        );
      }

      if (
        Math.round(Number(amount) * 100) !==
          expectedMinorUnits ||
        currency.trim().toUpperCase() !==
          expectedCurrency.trim().toUpperCase()
      ) {
        throw new Error(
          "A matching IntaSend invoice has a different amount or currency. Manual reconciliation is required.",
        );
      }

      const createdAt =
        typeof item.created_at === "string"
          ? Date.parse(item.created_at)
          : 0;

      candidates.push({
        invoiceId: invoiceId.trim(),
        apiRef,
        state: state.toUpperCase(),
        amount,
        currency: currency.trim(),
        createdAt: Number.isFinite(createdAt)
          ? createdAt
          : 0,
      });
    }

    const next = payload.next;

    if (next === null || next === undefined || next === "") {
      nextUrl = null;
    } else if (typeof next === "string") {
      nextUrl = new URL(next, url).href;
    } else {
      throw new Error(
        "IntaSend returned an invalid pagination link.",
      );
    }
  }

  // Remove any duplicate invoice IDs returned across pages.
  const uniqueCandidates = [
    ...new Map(
      candidates.map((candidate) => [
        candidate.invoiceId,
        candidate,
      ]),
    ).values(),
  ];

  return uniqueCandidates.sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

async function resolveInvoiceId(input: {
  apiRef: string;
  expectedAmount: number | string;
  expectedCurrency: string;
}): Promise<string> {
  const candidates = await getInvoiceCandidates(
    input.apiRef,
    input.expectedAmount,
    input.expectedCurrency,
  );

  if (candidates.length === 0) {
    throw new Error(
      "No IntaSend invoice was found for this payment reference. The payment remains unchanged.",
    );
  }

  // A verified successful attempt takes precedence.
  const completed = candidates.find(
    (candidate) => candidate.state === "COMPLETE",
  );

  if (completed) return completed.invoiceId;

  // Do not treat a failed attempt as final while another attempt
  // is still in progress.
  const inProgress = candidates.find((candidate) =>
    ["PROCESSING", "RETRY", "PARTIAL", "PENDING"].includes(
      candidate.state,
    ),
  );

  if (inProgress) return inProgress.invoiceId;

  // All matching attempts are terminal. Verify the newest one
  // directly before the route decides whether to mark failure.
  return candidates[0].invoiceId;
}

export async function verifyIntaSendStatus(input: {
  invoiceId?: string | null;
  checkoutId?: string | null;
  signature?: string | null;
  apiRef: string;
  expectedAmount: number | string;
  expectedCurrency: string;
}): Promise<IntaSendVerifiedStatus> {
  const apiRef = input.apiRef.trim();

  if (!apiRef) {
    throw new Error(
      "The PharmaTrack payment reference is required.",
    );
  }

  let invoiceId = input.invoiceId?.trim() || null;

  if (!invoiceId) {
    invoiceId = await resolveInvoiceId({
      apiRef,
      expectedAmount: input.expectedAmount,
      expectedCurrency: input.expectedCurrency,
    });
  }

  const response = await fetch(INTASEND_STATUS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(
      `IntaSend status verification failed: ${await readErrorMessage(response)}`,
    );
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload)) {
    throw new Error(
      "IntaSend returned an invalid status response.",
    );
  }

  if (typeof payload.detail === "string") {
    throw new Error(
      `IntaSend could not verify this payment: ${payload.detail.slice(0, 300)}`,
    );
  }

  const invoice = isRecord(payload.invoice)
    ? payload.invoice
    : payload;

  const returnedInvoiceId = requiredString(
    invoice,
    "invoice_id",
  );

  const verifiedApiRef = requiredString(invoice, "api_ref");
  const state = requiredString(invoice, "state");
  const currency = requiredString(invoice, "currency");
  const amount = invoice.value;

  if (!validAmount(amount)) {
    throw new Error(
      "IntaSend status response is missing a valid payment amount.",
    );
  }

  if (returnedInvoiceId !== invoiceId) {
    throw new Error(
      "IntaSend returned a different invoice than the one requested.",
    );
  }

  if (verifiedApiRef !== apiRef) {
    throw new Error(
      "The provider payment reference does not match this payment record.",
    );
  }

  if (
    Math.round(Number(amount) * 100) !==
    Math.round(Number(input.expectedAmount) * 100)
  ) {
    throw new Error(
      "The verified payment amount does not match the recorded amount.",
    );
  }

  if (
    currency.trim().toUpperCase() !==
    input.expectedCurrency.trim().toUpperCase()
  ) {
    throw new Error(
      "The verified payment currency does not match the recorded currency.",
    );
  }

  return {
    invoiceId: returnedInvoiceId,
    apiRef: verifiedApiRef,
    state: state.toUpperCase(),
    amount,
    currency,
    providerReference:
      typeof invoice.provider_ref === "string"
        ? invoice.provider_ref
        : null,
  };
}