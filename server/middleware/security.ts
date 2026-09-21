import type { RequestHandler } from "express";

export const securityHeaders: RequestHandler = (
  _request,
  response,
  next,
) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  next();
};

export const isValidEmail = (value: unknown): value is string => {
  if (typeof value !== "string") {
    return false;
  }

  const email = value.trim();

  if (email.length < 6 || email.length > 254) {
    return false;
  }

  // Basic RFC-compatible structure:
  // local-part@domain
  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  if (!localPart || !domain) {
    return false;
  }

  if (localPart.length > 64 || domain.length > 253) {
    return false;
  }

  // Local part cannot begin/end with a dot or contain consecutive dots.
  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return false;
  }

  // Allow common email characters in the local part.
  if (
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(
      localPart,
    )
  ) {
    return false;
  }

  // Domain must contain at least one dot.
  if (!domain.includes(".")) {
    return false;
  }

  // Domain must not begin/end with a dot or hyphen.
  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.startsWith("-") ||
    domain.endsWith("-") ||
    domain.includes("..")
  ) {
    return false;
  }

  // Validate each domain label.
  const domainLabels = domain.split(".");

  if (domainLabels.some((label) => label.length === 0)) {
    return false;
  }

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

  // Require a conventional alphabetic TLD of 2-63 characters.
  const topLevelDomain =
    domainLabels[domainLabels.length - 1];

  if (
    !/^[A-Za-z]{2,63}$/.test(
      topLevelDomain,
    )
  ) {
    return false;
  }

  return true;
};

export const isStrongPassword = (
  value: unknown,
): value is string => {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length < 12 || value.length > 128) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  return (
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial
  );
};