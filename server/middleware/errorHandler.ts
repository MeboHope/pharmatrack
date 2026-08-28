import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

interface ErrorWithStatus
  extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  type?: string;
  errors?: unknown;
}

const isProduction =
  process.env.NODE_ENV ===
  "production";

const isErrorWithStatus = (
  error: unknown,
): error is ErrorWithStatus => {
  return (
    error instanceof Error
  );
};

const getStatusCode = (
  error: unknown,
): number => {
  if (
    !isErrorWithStatus(error)
  ) {
    return 500;
  }

  if (
    typeof error.statusCode ===
      "number" &&
    error.statusCode >= 400 &&
    error.statusCode < 600
  ) {
    return error.statusCode;
  }

  if (
    typeof error.status ===
      "number" &&
    error.status >= 400 &&
    error.status < 600
  ) {
    return error.status;
  }

  return 500;
};

const isPrismaError = (
  error: unknown,
): boolean => {
  if (
    !isErrorWithStatus(error)
  ) {
    return false;
  }

  return (
    error.name.includes(
      "Prisma",
    ) ||
    error.name.includes(
      "PrismaClient",
    )
  );
};

const getPrismaStatus = (
  error: unknown,
): number => {
  if (
    !isErrorWithStatus(error)
  ) {
    return 500;
  }

  switch (error.code) {
    case "P2002":
      return 409;

    case "P2025":
      return 404;

    case "P2003":
      return 409;

    case "P2014":
      return 409;

    default:
      return 500;
  }
};

const getPrismaMessage = (
  error: unknown,
): string => {
  if (
    !isErrorWithStatus(error)
  ) {
    return "Database operation failed.";
  }

  switch (error.code) {
    case "P2002":
      return "A record with the same unique information already exists.";

    case "P2025":
      return "The requested record could not be found.";

    case "P2003":
      return "This operation cannot be completed because related records exist.";

    case "P2014":
      return "This operation violates a required relationship between records.";

    default:
      return "A database operation could not be completed.";
  }
};

const getSafeMessage = (
  error: unknown,
  statusCode: number,
): string => {
  if (
    isPrismaError(error)
  ) {
    return getPrismaMessage(
      error,
    );
  }

  if (
    statusCode === 400
  ) {
    return "The request contains invalid information.";
  }

  if (
    statusCode === 401
  ) {
    return "Authentication is required.";
  }

  if (
    statusCode === 403
  ) {
    return "You do not have permission to perform this action.";
  }

  if (
    statusCode === 404
  ) {
    return "The requested resource could not be found.";
  }

  if (
    statusCode === 409
  ) {
    return "The requested operation conflicts with existing data.";
  }

  if (
    statusCode === 422
  ) {
    return "The submitted information could not be processed.";
  }

  if (
    statusCode === 429
  ) {
    return "Too many requests. Please try again later.";
  }

  if (
    statusCode >= 500
  ) {
    return "The PharmaTrack server encountered an internal error.";
  }

  if (
    isErrorWithStatus(error) &&
    error.message
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
};

const buildValidationErrors = (
  error: unknown,
): string[] => {
  if (
    !isErrorWithStatus(error) ||
    !error.errors
  ) {
    return [];
  }

  const errors =
    error.errors;

  if (
    Array.isArray(errors)
  ) {
    return errors
      .filter(
        (item): item is string =>
          typeof item ===
          "string",
      );
  }

  if (
    typeof errors ===
      "object" &&
    errors !== null
  ) {
    return Object.entries(
      errors as Record<
        string,
        unknown
      >,
    ).flatMap(
      ([field, value]) => {
        if (
          Array.isArray(value)
        ) {
          return value.map(
            (item) =>
              `${field}: ${String(item)}`,
          );
        }

        return [
          `${field}: ${String(value)}`,
        ];
      },
    );
  }

  return [];
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  const requestId =
    request.headers[
      "x-request-id"
    ];

  const statusCode =
    isPrismaError(error)
      ? getPrismaStatus(error)
      : getStatusCode(error);

  const safeMessage =
    getSafeMessage(
      error,
      statusCode,
    );

  const validationErrors =
    buildValidationErrors(
      error,
    );

  /*
   * Always log the real error on the server.
   * Never expose stack traces, Prisma details,
   * SQL statements, or internal paths to clients.
   */
  console.error(
    "PharmaTrack API Error:",
    {
      method:
        request.method,
      path:
        request.originalUrl,
      statusCode,
      requestId:
        typeof requestId ===
        "string"
          ? requestId
          : undefined,
      error,
    },
  );

  const payload: Record<
    string,
    unknown
  > = {
    success: false,
    message: safeMessage,
  };

  if (
    validationErrors.length > 0
  ) {
    payload.errors =
      validationErrors;
  }

  if (
    typeof requestId ===
    "string"
  ) {
    payload.requestId =
      requestId;
  }

  if (
    !isProduction &&
    isErrorWithStatus(error)
  ) {
    payload.debug = {
      name:
        error.name,
      code:
        error.code,
    };
  }

  response
    .status(statusCode)
    .json(payload);
};

export const notFoundHandler = (
  request: Request,
  response: Response,
): void => {
  response
    .status(404)
    .json({
      success: false,
      message:
        `Endpoint not found: ${request.method} ${request.originalUrl}`,
    });
};

export default errorHandler;