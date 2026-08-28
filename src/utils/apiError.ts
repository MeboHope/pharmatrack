
/**
 * Centralized API error handling for PharmaTrack.
 *
 * This utility converts errors returned by the frontend API layer,
 * Axios, fetch, or the backend into safe, user-friendly messages.
 *
 * It deliberately avoids exposing raw server/database errors to users.
 */

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string | string[]>;
  details?: unknown;
  statusCode?: number;
}

export interface NormalizedApiError {
  message: string;
  statusCode?: number;
  validationErrors: string[];
  originalError?: unknown;
}

const DEFAULT_API_ERROR =
  "Something went wrong while communicating with the PharmaTrack server.";

const NETWORK_ERROR =
  "Unable to connect to the PharmaTrack server. Please check that the server is running and try again.";

const TIMEOUT_ERROR =
  "The request took too long to complete. Please try again.";

const UNAUTHORIZED_ERROR =
  "Your session has expired or you are not authorized to perform this action. Please log in again.";

const FORBIDDEN_ERROR =
  "You do not have permission to perform this action.";

const NOT_FOUND_ERROR =
  "The requested PharmaTrack record could not be found.";

const CONFLICT_ERROR =
  "This operation conflicts with existing data. Please review the information and try again.";

const SERVER_ERROR =
  "The PharmaTrack server encountered an error. Please try again shortly.";

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);

const extractString = (
  value: unknown,
): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const extractValidationErrors = (
  value: unknown,
): string[] => {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return value.trim()
      ? [value.trim()]
      : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      extractValidationErrors(item),
    );
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(
      ([field, fieldErrors]) => {
        const messages =
          extractValidationErrors(
            fieldErrors,
          );

        if (messages.length === 0) {
          return [];
        }

        return messages.map((message) =>
          field
            ? `${formatFieldName(field)}: ${message}`
            : message,
        );
      },
    );
  }

  return [];
};

const formatFieldName = (
 field: string,
): string => {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) =>
      character.toUpperCase(),
    );
};

const getStatusCode = (
  error: unknown,
): number | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  const response = error.response;

  if (isRecord(response)) {
    const status = response.status;

    if (
      typeof status === "number" &&
      Number.isFinite(status)
    ) {
      return status;
    }
  }

  const status =
    error.status ??
    error.statusCode;

  if (
    typeof status === "number" &&
    Number.isFinite(status)
  ) {
    return status;
  }

  return undefined;
};

const getResponseData = (
  error: unknown,
): unknown => {
  if (!isRecord(error)) {
    return undefined;
  }

  const response = error.response;

  if (isRecord(response)) {
    return response.data;
  }

  return error.data;
};

const getErrorCode = (
  error: unknown,
): string | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  return (
    extractString(error.code) ||
    undefined
  );
};

const getErrorMessage = (
  error: unknown,
): string | undefined => {
  if (!isRecord(error)) {
    return extractString(error);
  }

  return (
    extractString(error.message) ||
    undefined
  );
};

const getBackendMessage = (
  data: unknown,
): string | undefined => {
  if (typeof data === "string") {
    return extractString(data);
  }

  if (!isRecord(data)) {
    return undefined;
  }

  return (
    extractString(data.message) ||
    extractString(data.error)
  );
};

const getBackendValidationErrors = (
  data: unknown,
): string[] => {
  if (!isRecord(data)) {
    return [];
  }

  return extractValidationErrors(
    data.errors,
  );
};

const statusMessage = (
  statusCode?: number,
): string | undefined => {
  switch (statusCode) {
    case 400:
      return "The request contains invalid information.";

    case 401:
      return UNAUTHORIZED_ERROR;

    case 403:
      return FORBIDDEN_ERROR;

    case 404:
      return NOT_FOUND_ERROR;

    case 409:
      return CONFLICT_ERROR;

    case 422:
      return "Some of the information provided is invalid.";

    case 429:
      return "Too many requests were made. Please wait a moment and try again.";

    case 500:
    case 502:
    case 503:
    case 504:
      return SERVER_ERROR;

    default:
      return undefined;
  }
};

const isNetworkError = (
  error: unknown,
): boolean => {
  const code = getErrorCode(error);

  if (
    code === "ERR_NETWORK" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND"
  ) {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  if (error.name === "TypeError") {
    const message =
      getErrorMessage(error)?.toLowerCase() ||
      "";

    return (
      message.includes("failed to fetch") ||
      message.includes("network error") ||
      message.includes("fetch failed")
    );
  }

  return false;
};

const isTimeoutError = (
  error: unknown,
): boolean => {
  const code = getErrorCode(error);

  if (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    code === "TIMEOUT"
  ) {
    return true;
  }

  const message =
    getErrorMessage(error)?.toLowerCase() ||
    "";

  return message.includes("timeout");
};

export const normalizeApiError = (
  error: unknown,
): NormalizedApiError => {
  const statusCode =
    getStatusCode(error);

  const responseData =
    getResponseData(error);

  const validationErrors =
    getBackendValidationErrors(
      responseData,
    );

  if (isNetworkError(error)) {
    return {
      message: NETWORK_ERROR,
      statusCode,
      validationErrors,
      originalError: error,
    };
  }

  if (isTimeoutError(error)) {
    return {
      message: TIMEOUT_ERROR,
      statusCode,
      validationErrors,
      originalError: error,
    };
  }

  if (statusCode === 401) {
    return {
      message: UNAUTHORIZED_ERROR,
      statusCode,
      validationErrors,
      originalError: error,
    };
  }

  if (statusCode === 403) {
    return {
      message: FORBIDDEN_ERROR,
      statusCode,
      validationErrors,
      originalError: error,
    };
  }

  const backendMessage =
    getBackendMessage(responseData);

  const genericStatusMessage =
    statusMessage(statusCode);

  const rawMessage =
    backendMessage ||
    genericStatusMessage ||
    getErrorMessage(error);

  /*
   * Avoid exposing common low-level database/server
   * implementation details directly to users.
   */
  const safeMessage =
    sanitizeApiMessage(
      rawMessage,
    );

  return {
    message:
      safeMessage ||
      DEFAULT_API_ERROR,
    statusCode,
    validationErrors,
    originalError: error,
  };
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = DEFAULT_API_ERROR,
): string => {
  const normalized =
    normalizeApiError(error);

  return (
    normalized.message ||
    fallback
  );
};

export const getApiValidationErrors = (
  error: unknown,
): string[] => {
  return normalizeApiError(error)
    .validationErrors;
};

export const isApiUnauthorizedError = (
  error: unknown,
): boolean => {
  return (
    normalizeApiError(error)
      .statusCode === 401
  );
};

export const isApiForbiddenError = (
  error: unknown,
): boolean => {
  return (
    normalizeApiError(error)
      .statusCode === 403
  );
};

export const isApiNotFoundError = (
  error: unknown,
): boolean => {
  return (
    normalizeApiError(error)
      .statusCode === 404
  );
};

export const isApiValidationError = (
  error: unknown,
): boolean => {
  const normalized =
    normalizeApiError(error);

  return (
    normalized.statusCode === 400 ||
    normalized.statusCode === 422 ||
    normalized.validationErrors.length > 0
  );
};

const sanitizeApiMessage = (
  message?: string,
): string | undefined => {
  if (!message) {
    return undefined;
  }

  const normalized =
    message.trim();

  if (!normalized) {
    return undefined;
  }

  const lower =
    normalized.toLowerCase();

  const sensitivePatterns = [
    "prisma",
    "prismaclient",
    "postgresql",
    "postgres",
    "sqlstate",
    "database connection",
    "query failed",
    "relation does not exist",
    "column does not exist",
    "stack trace",
    "node_modules",
    " at ",
  ];

  const containsSensitiveDetail =
    sensitivePatterns.some(
      (pattern) =>
        lower.includes(pattern),
    );

  if (containsSensitiveDetail) {
    return SERVER_ERROR;
  }

  return normalized;
};

export default {
  normalizeApiError,
  getApiErrorMessage,
  getApiValidationErrors,
  isApiUnauthorizedError,
  isApiForbiddenError,
  isApiNotFoundError,
  isApiValidationError,
};

