import { promises as dns } from "node:dns";
import type { RequestHandler } from "express";

export const securityHeaders: RequestHandler = (
  _request,
  response,
  next,
) => {
  response.setHeader(
    "X-Content-Type-Options",
    "nosniff",
  );

  response.setHeader(
    "X-Frame-Options",
    "DENY",
  );

  response.setHeader(
    "Referrer-Policy",
    "no-referrer",
  );

  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  next();
};

/**
 * Validates the structure of an email address.
 *
 * This checks syntax only.
 * It does NOT claim that the mailbox itself exists.
 */
export const isValidEmail = (
  value: unknown,
): value is string => {
  if (typeof value !== "string") {
    return false;
  }

  const email = value.trim();

  if (
    email.length < 6 ||
    email.length > 254
  ) {
    return false;
  }

  /*
   * An email address must contain exactly
   * one @ separator.
   */
  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  if (!localPart || !domain) {
    return false;
  }

  if (
    localPart.length > 64 ||
    domain.length > 253
  ) {
    return false;
  }

  /*
   * Local part cannot begin/end with a dot
   * or contain consecutive dots.
   */
  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return false;
  }

  /*
   * Allow common RFC-compatible characters
   * in the local part.
   */
  if (
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(
      localPart,
    )
  ) {
    return false;
  }

  /*
   * Domain must contain at least one dot.
   */
  if (!domain.includes(".")) {
    return false;
  }

  /*
   * Domain cannot begin/end with a dot or
   * hyphen, or contain consecutive dots.
   */
  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.startsWith("-") ||
    domain.endsWith("-") ||
    domain.includes("..")
  ) {
    return false;
  }

  const domainLabels =
    domain.split(".");

  if (
    domainLabels.some(
      (label) => label.length === 0,
    )
  ) {
    return false;
  }

  /*
   * Validate every DNS label.
   */
  if (
    domainLabels.some(
      (label) =>
        label.length > 63 ||
        label.startsWith("-") ||
        label.endsWith("-") ||
        !/^[A-Za-z0-9-]+$/.test(label),
    )
  ) {
    return false;
  }

  /*
   * Require a conventional alphabetic
   * top-level domain.
   */
  const topLevelDomain =
    domainLabels[
      domainLabels.length - 1
    ];

  if (
    !/^[A-Za-z]{2,63}$/.test(
      topLevelDomain,
    )
  ) {
    return false;
  }

  return true;
};

/**
 * Checks whether the email domain has
 * usable DNS/mail configuration.
 *
 * This does NOT prove that an individual
 * mailbox exists.
 *
 * The actual mailbox ownership check is
 * performed through email verification.
 */
export async function isEmailDomainConfigured(
  email: string,
): Promise<boolean> {
  if (!isValidEmail(email)) {
    return false;
  }

  const domain =
    email
      .trim()
      .toLowerCase()
      .split("@")[1];

  if (!domain) {
    return false;
  }

  /*
   * First check MX records.
   *
   * A normal mail-receiving domain should
   * publish one or more MX records.
   */
  try {
    const mxRecords =
      await dns.resolveMx(domain);

    /*
     * RFC 7505 null MX:
     *
     * exchange "." explicitly means that
     * the domain does not accept email.
     */
    const usableMxRecords =
      mxRecords.filter(
        (record) =>
          record.exchange !== ".",
      );

    if (usableMxRecords.length > 0) {
      return true;
    }

    /*
     * If the domain explicitly publishes
     * a null MX, it should be treated as
     * unable to receive email.
     */
    if (
      mxRecords.some(
        (record) =>
          record.exchange === ".",
      )
    ) {
      return false;
    }
  } catch {
    /*
     * No MX record was found.
     *
     * SMTP can fall back to the domain's
     * address records, so check A/AAAA below.
     */
  }

  /*
   * RFC mail delivery permits fallback to
   * the domain's address records when no
   * MX record exists.
   */
  try {
    const ipv4Records =
      await dns.resolve4(domain);

    if (ipv4Records.length > 0) {
      return true;
    }
  } catch {
    // Continue to IPv6 check.
  }

  try {
    const ipv6Records =
      await dns.resolve6(domain);

    if (ipv6Records.length > 0) {
      return true;
    }
  } catch {
    // Domain has no usable address record.
  }

  return false;
}

export const isStrongPassword = (
  value: unknown,
): value is string => {
  if (typeof value !== "string") {
    return false;
  }

  if (
    value.length < 12 ||
    value.length > 128
  ) {
    return false;
  }

  const hasUppercase =
    /[A-Z]/.test(value);

  const hasLowercase =
    /[a-z]/.test(value);

  const hasNumber =
    /\d/.test(value);

  const hasSpecial =
    /[^A-Za-z0-9]/.test(value);

  return (
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial
  );
};