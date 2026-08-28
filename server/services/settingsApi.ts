
import type { PharmacySettings } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000/api";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const getAccessToken = (): string | null => {
  /*
   * The access token is intentionally kept separate
   * from pharmacy operational data.
   *
   * This is temporary until the complete frontend
   * authentication/session layer is connected.
   */
  return (
    localStorage.getItem("pharmatrack_access_token") ||
    localStorage.getItem("pharmatrack_token")
  );
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = getAccessToken();

  const headers = new Headers(
    options.headers,
  );

  headers.set(
    "Content-Type",
    "application/json",
  );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  let result:
    | ApiResponse<T>
    | null = null;

  try {
    result =
      (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(
      `API returned an invalid response (${response.status}).`,
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        `API request failed (${response.status}).`,
    );
  }

  if (result.data === undefined) {
    throw new Error(
      "API response did not contain data.",
    );
  }

  return result.data;
};

/**
 * GET /api/settings
 *
 * Any authenticated pharmacy user may read
 * the current pharmacy settings.
 */
export const getSettings =
  async (): Promise<PharmacySettings> => {
    return request<PharmacySettings>(
      "/settings",
      {
        method: "GET",
      },
    );
  };

/**
 * PUT /api/settings
 *
 * Only an authenticated ADMIN can update
 * pharmacy-wide settings.
 */
export const updateSettings =
  async (
    settings: PharmacySettings,
  ): Promise<PharmacySettings> => {
    return request<PharmacySettings>(
      "/settings",
      {
        method: "PUT",
        body: JSON.stringify({
          pharmacyName:
            settings.pharmacyName,
          tagline:
            settings.tagline,
          address:
            settings.address,
          phone:
            settings.phone,
          email:
            settings.email,
          currency:
            settings.currency,
          clinicianName:
            settings.clinicianName,
          expiryAlertDays:
            settings.expiryAlertDays,
          reorderAlertLevel:
            settings.reorderAlertLevel,
          logoUrl:
            settings.logoUrl,
        }),
      },
    );
  };

export default {
  getSettings,
  updateSettings,
};
