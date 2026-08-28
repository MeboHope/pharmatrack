import type { NextFunction, Request, Response } from "express";

export type ValidationRule<T = unknown> = (
  value: T,
  request: Request,
) => string | null;

export interface ValidationSchema {
  body?: Record<string, ValidationRule>;
  query?: Record<string, ValidationRule>;
  params?: Record<string, ValidationRule>;
}

interface ValidationErrors {
  body?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

const isEmpty = (value: unknown): boolean => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" &&
      value.trim() === "")
  );
};

const validateSection = (
  source: unknown,
  rules: Record<string, ValidationRule>,
  request: Request,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const values =
    typeof source === "object" &&
    source !== null
      ? source as Record<string, unknown>
      : {};

  for (const [field, rule] of Object.entries(rules)) {
    try {
      const error = rule(
        values[field],
        request,
      );

      if (error) {
        errors[field] = error;
      }
    } catch {
      errors[field] =
        "Invalid value.";
    }
  }

  return errors;
};

export const validate = (
  schema: ValidationSchema,
) => {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const errors: ValidationErrors = {};

    if (schema.body) {
      const bodyErrors =
        validateSection(
          request.body,
          schema.body,
          request,
        );

      if (
        Object.keys(bodyErrors).length > 0
      ) {
        errors.body = bodyErrors;
      }
    }

    if (schema.query) {
      const queryErrors =
        validateSection(
          request.query,
          schema.query,
          request,
        );

      if (
        Object.keys(queryErrors).length > 0
      ) {
        errors.query = queryErrors;
      }
    }

    if (schema.params) {
      const paramsErrors =
        validateSection(
          request.params,
          schema.params,
          request,
        );

      if (
        Object.keys(paramsErrors).length > 0
      ) {
        errors.params = paramsErrors;
      }
    }

    if (
      Object.keys(errors).length > 0
    ) {
      response.status(400).json({
        success: false,
        message:
          "Please correct the highlighted information.",
        errors,
      });

      return;
    }

    next();
  };
};

/*
 * ---------------------------------------------------------
 * REUSABLE VALIDATION RULES
 * ---------------------------------------------------------
 */

export const required =
  (fieldName: string): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return `${fieldName} is required.`;
    }

    return null;
  };

export const optionalString =
  (
    fieldName: string,
    maxLength = 500,
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return null;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be text.`;
    }

    if (value.trim().length > maxLength) {
      return `${fieldName} must not exceed ${maxLength} characters.`;
    }

    return null;
  };

export const stringValue =
  (
    fieldName: string,
    maxLength = 500,
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return `${fieldName} is required.`;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be text.`;
    }

    if (value.trim().length > maxLength) {
      return `${fieldName} must not exceed ${maxLength} characters.`;
    }

    return null;
  };

export const positiveInteger =
  (
    fieldName: string,
  ): ValidationRule =>
  (value) => {
    if (value === undefined || value === null) {
      return `${fieldName} is required.`;
    }

    const numberValue =
      typeof value === "number"
        ? value
        : Number(value);

    if (
      !Number.isInteger(numberValue) ||
      numberValue < 0
    ) {
      return `${fieldName} must be a valid non-negative whole number.`;
    }

    return null;
  };

export const positiveNumber =
  (
    fieldName: string,
  ): ValidationRule =>
  (value) => {
    if (value === undefined || value === null) {
      return `${fieldName} is required.`;
    }

    const numberValue =
      typeof value === "number"
        ? value
        : Number(value);

    if (
      !Number.isFinite(numberValue) ||
      numberValue < 0
    ) {
      return `${fieldName} must be a valid non-negative number.`;
    }

    return null;
  };

export const idValue =
  (
    fieldName: string,
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return `${fieldName} is required.`;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be a valid identifier.`;
    }

    if (value.trim().length === 0) {
      return `${fieldName} is required.`;
    }

    return null;
  };

export const emailValue =
  (
    fieldName = "Email",
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return `${fieldName} is required.`;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be a valid email address.`;
    }

    const email =
      value.trim();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return `${fieldName} must be a valid email address.`;
    }

    return null;
  };

export const optionalEmail =
  (
    fieldName = "Email",
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return null;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be a valid email address.`;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(value.trim())) {
      return `${fieldName} must be a valid email address.`;
    }

    return null;
  };

export const enumValue =
  <T extends string>(
    fieldName: string,
    allowedValues: readonly T[],
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return `${fieldName} is required.`;
    }

    if (
      typeof value !== "string" ||
      !allowedValues.includes(
        value as T,
      )
    ) {
      return `${fieldName} contains an invalid value.`;
    }

    return null;
  };

export const dateValue =
  (
    fieldName: string,
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return `${fieldName} is required.`;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be a valid date.`;
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return `${fieldName} must be a valid date.`;
    }

    return null;
  };

export const optionalDate =
  (
    fieldName: string,
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return null;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be a valid date.`;
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return `${fieldName} must be a valid date.`;
    }

    return null;
  };

export const phoneValue =
  (
    fieldName = "Phone number",
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return `${fieldName} is required.`;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be valid.`;
    }

    const cleaned =
      value.replace(
        /[\s()+-]/g,
        "",
      );

    if (
      !/^\d{9,15}$/.test(
        cleaned,
      )
    ) {
      return `${fieldName} must contain a valid phone number.`;
    }

    return null;
  };

export const optionalPhone =
  (
    fieldName = "Phone number",
  ): ValidationRule =>
  (value) => {
    if (isEmpty(value)) {
      return null;
    }

    if (typeof value !== "string") {
      return `${fieldName} must be valid.`;
    }

    const cleaned =
      value.replace(
        /[\s()+-]/g,
        "",
      );

    if (
      !/^\d{9,15}$/.test(
        cleaned,
      )
    ) {
      return `${fieldName} must contain a valid phone number.`;
    }

    return null;
  };