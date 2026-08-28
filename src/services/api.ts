const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000/api";

export const ACCESS_TOKEN_KEY =
  "pharmatrack_access_token";

export const REFRESH_TOKEN_KEY =
  "pharmatrack_refresh_token";

const USER_KEY =
  "pharmatrack_authenticated_user";

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

export interface NormalizedApiError {
  status: number;
  message: string;
  errors: string[];
  code?: string;
}

export class ApiError extends Error {
  status: number;
  errors: string[];
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status = 500,
    errors: string[] = [],
    details?: unknown,
    code?: string,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.details = details;
    this.code = code;

    Object.setPrototypeOf(
      this,
      ApiError.prototype,
    );
  }
}

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null
  );
};

const extractErrorMessages = (
  errors: unknown,
): string[] => {
  if (!errors) {
    return [];
  }

  if (typeof errors === "string") {
    return [errors];
  }

  if (Array.isArray(errors)) {
    return errors
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (isRecord(item)) {
          const message =
            item.message;

          if (
            typeof message ===
            "string"
          ) {
            return message;
          }

          return JSON.stringify(item);
        }

        return String(item);
      })
      .filter(Boolean);
  }

  if (isRecord(errors)) {
    return Object.entries(errors)
      .flatMap(
        ([field, value]) => {
          if (Array.isArray(value)) {
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

  return [String(errors)];
};

export const normalizeApiError = (
  error: unknown,
): NormalizedApiError => {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      message: error.message,
      errors: error.errors,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
      errors: [],
    };
  }

  if (isRecord(error)) {
    const status =
      typeof error.status ===
      "number"
        ? error.status
        : 500;

    const message =
      typeof error.message ===
      "string"
        ? error.message
        : "An unexpected API error occurred.";

    return {
      status,
      message,
      errors:
        extractErrorMessages(
          error.errors,
        ),
    };
  }

  return {
    status: 500,
    message:
      "An unexpected API error occurred.",
    errors: [],
  };
};

export const getApiErrorMessage = (
  error: unknown,
  fallback =
    "An unexpected error occurred.",
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
  return normalizeApiError(
    error,
  ).errors;
};

export const isApiUnauthorizedError = (
  error: unknown,
): boolean => {
  return (
    normalizeApiError(error)
      .status === 401
  );
};

export const isApiForbiddenError = (
  error: unknown,
): boolean => {
  return (
    normalizeApiError(error)
      .status === 403
  );
};

export const isApiNotFoundError = (
  error: unknown,
): boolean => {
  return (
    normalizeApiError(error)
      .status === 404
  );
};

const getAccessToken = (): string | null => {
  return localStorage.getItem(
    ACCESS_TOKEN_KEY,
  );
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem(
    REFRESH_TOKEN_KEY,
  );
};

const saveAccessToken = (
  token: string,
): void => {
  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    token,
  );
};

const clearAuthentication = (): void => {
  localStorage.removeItem(
    ACCESS_TOKEN_KEY,
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY,
  );

  localStorage.removeItem(
    USER_KEY,
  );

  localStorage.removeItem(
    "pharmatrack_current_user",
  );
};

let refreshPromise:
  | Promise<string>
  | null = null;

const refreshAccessToken =
  async (): Promise<string> => {
    if (refreshPromise) {
      return refreshPromise;
    }

    const refreshToken =
      getRefreshToken();

    if (!refreshToken) {
      throw new ApiError(
        "Authentication session has expired.",
        401,
      );
    }

    refreshPromise =
      (async () => {
        const response =
          await fetch(
            `${API_BASE_URL}/auth/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body: JSON.stringify({
                refreshToken,
              }),
            },
          );

        let payload: unknown =
          null;

        try {
          payload =
            await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          clearAuthentication();

          throw new ApiError(
            isRecord(payload) &&
            typeof payload.message ===
              "string"
              ? payload.message
              : "Authentication session has expired.",
            response.status,
          );
        }

        if (
          !isRecord(payload)
        ) {
          clearAuthentication();

          throw new ApiError(
            "Invalid refresh response.",
            401,
          );
        }

        const data =
          isRecord(payload.data)
            ? payload.data
            : payload;

        const accessToken =
          typeof data.accessToken ===
          "string"
            ? data.accessToken
            : null;

        if (!accessToken) {
          clearAuthentication();

          throw new ApiError(
            "Unable to refresh authentication session.",
            401,
          );
        }

        saveAccessToken(
          accessToken,
        );

        return accessToken;
      })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  };

interface RequestOptions
  extends RequestInit {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

const buildUrl = (
  path: string,
): string => {
  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
};

const parseResponseBody =
  async (
    response: Response,
  ): Promise<unknown> => {
    const contentType =
      response.headers.get(
        "content-type",
      ) || "";

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    const text =
      await response.text();

    return text || null;
  };

const makeApiError = (
  response: Response,
  payload: unknown,
): ApiError => {
  let message =
    `Request failed with status ${response.status}.`;

  let errors: string[] = [];

  if (isRecord(payload)) {
    if (
      typeof payload.message ===
      "string"
    ) {
      message =
        payload.message;
    }

    errors =
      extractErrorMessages(
        payload.errors,
      );

    if (
      isRecord(payload.data)
    ) {
      if (
        typeof payload.data.message ===
        "string"
      ) {
        message =
          payload.data.message;
      }

      if (
        errors.length === 0
      ) {
        errors =
          extractErrorMessages(
            payload.data.errors,
          );
      }
    }
  } else if (
    typeof payload === "string" &&
    payload.trim()
  ) {
    message = payload;
  }

  return new ApiError(
    message,
    response.status,
    errors,
    payload,
  );
};

const requestRaw = async (
  path: string,
  options: RequestOptions = {},
): Promise<unknown> => {
  const {
    skipAuth,
    skipRefresh,
    ...fetchOptions
  } = options;

  const headers = new Headers(
    fetchOptions.headers,
  );

  if (
    !headers.has("Accept")
  ) {
    headers.set(
      "Accept",
      "application/json",
    );
  }

  if (
    fetchOptions.body !==
      undefined &&
    fetchOptions.body !== null &&
    !headers.has(
      "Content-Type",
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (!skipAuth) {
    const token =
      getAccessToken();

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }
  }

  const response =
    await fetch(
      buildUrl(path),
      {
        ...fetchOptions,
        headers,
      },
    );

  const payload =
    await parseResponseBody(
      response,
    );

  /*
   * Automatically refresh an expired
   * access token once and retry the
   * original request.
   */
  if (
    response.status === 401 &&
    !skipAuth &&
    !skipRefresh &&
    path !== "/auth/login" &&
    path !== "/auth/register" &&
    path !== "/auth/refresh"
  ) {
    try {
      const newToken =
        await refreshAccessToken();

      return await requestRaw(
        path,
        {
          ...options,
          skipRefresh: true,
          headers: {
            ...(options.headers || {}),
            Authorization:
              `Bearer ${newToken}`,
          },
        },
      );
    } catch {
      clearAuthentication();

      throw makeApiError(
        response,
        payload,
      );
    }
  }

  if (!response.ok) {
    throw makeApiError(
      response,
      payload,
    );
  }

  return payload;
};

/*
 * Convert a backend response:
 *
 * {
 *   success: true,
 *   data: [...]
 * }
 *
 * into:
 *
 * [...]
 */
const unwrapData = <T>(
  payload: unknown,
): T => {
  if (
    isRecord(payload) &&
    "success" in payload &&
    "data" in payload
  ) {
    return payload.data as T;
  }

  return payload as T;
};

/*
 * Return the complete backend
 * response envelope.
 */
const requestEnvelope =
  async <T>(
    path: string,
    options: RequestOptions,
  ): Promise<ApiEnvelope<T>> => {
    const payload =
      await requestRaw(
        path,
        options,
      );

    if (isRecord(payload)) {
      return payload as unknown as ApiEnvelope<T>;
    }

    return {
      success: true,
      data: payload as T,
    };
  };

/*
 * =========================================================
 * LEGACY / DIRECT DATA API
 * =========================================================
 *
 * These functions return the `data`
 * portion directly.
 *
 * Existing services such as:
 *
 * - drugs.ts
 * - inventory.ts
 * - pharmacyData.ts
 * - users.ts
 * - UserManagement.tsx
 *
 * depend on this behavior.
 */

export const apiGet = async <
  T = unknown,
>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const payload =
    await requestRaw(
      path,
      {
        ...options,
        method: "GET",
      },
    );

  return unwrapData<T>(
    payload,
  );
};

export const apiPost = async <
  T = unknown,
>(
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> => {
  const payload =
    await requestRaw(
      path,
      {
        ...options,
        method: "POST",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );

  return unwrapData<T>(
    payload,
  );
};

export const apiPut = async <
  T = unknown,
>(
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> => {
  const payload =
    await requestRaw(
      path,
      {
        ...options,
        method: "PUT",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );

  return unwrapData<T>(
    payload,
  );
};

export const apiPatch = async <
  T = unknown,
>(
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> => {
  const payload =
    await requestRaw(
      path,
      {
        ...options,
        method: "PATCH",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );

  return unwrapData<T>(
    payload,
  );
};

export const apiDelete = async <
  T = unknown,
>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const payload =
    await requestRaw(
      path,
      {
        ...options,
        method: "DELETE",
      },
    );

  return unwrapData<T>(
    payload,
  );
};

/*
 * =========================================================
 * ENVELOPE API
 * =========================================================
 *
 * These methods deliberately return:
 *
 * {
 *   success,
 *   message,
 *   data
 * }
 *
 * Existing services such as patients.ts,
 * suppliers.ts, transactions.ts,
 * dashboard.ts and stockAdjustments.ts
 * currently depend on this behavior.
 */

export const api = {
  async get<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return requestEnvelope<T>(
      path,
      {
        ...options,
        method: "GET",
      },
    );
  },

  async post<T = unknown>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return requestEnvelope<T>(
      path,
      {
        ...options,
        method: "POST",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );
  },

  async put<T = unknown>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return requestEnvelope<T>(
      path,
      {
        ...options,
        method: "PUT",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );
  },

  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return requestEnvelope<T>(
      path,
      {
        ...options,
        method: "PATCH",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );
  },

  async delete<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return requestEnvelope<T>(
      path,
      {
        ...options,
        method: "DELETE",
      },
    );
  },
};

/*
 * =========================================================
 * API REQUEST
 * =========================================================
 *
 * Used by authentication/account code
 * where the complete response envelope
 * is required.
 */

export const apiRequest = {
  get<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return api.get<T>(
      path,
      options,
    );
  },

  post<T = unknown>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return api.post<T>(
      path,
      body,
      options,
    );
  },

  put<T = unknown>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return api.put<T>(
      path,
      body,
      options,
    );
  },

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return api.patch<T>(
      path,
      body,
      options,
    );
  },

  delete<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    return api.delete<T>(
      path,
      options,
    );
  },
};

export {
  API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  clearAuthentication,
};

export default apiRequest;