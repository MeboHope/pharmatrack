import { apiGet, apiPut } from "./api";
import type { PharmacySettings } from "../types";

export type PharmacySettingsData = PharmacySettings;

interface SettingsResponse {
  success: boolean;
  data?: PharmacySettings;
  message?: string;
  errors?: unknown;
}

const unwrapSettings = (
  response: PharmacySettings | SettingsResponse,
): PharmacySettings => {
  if (
    response &&
    typeof response === "object" &&
    "success" in response
  ) {
    const wrapped = response as SettingsResponse;

    if (!wrapped.success) {
      throw new Error(
        wrapped.message || "Unable to load pharmacy settings.",
      );
    }

    if (!wrapped.data) {
      throw new Error(
        "The server returned no pharmacy settings.",
      );
    }

    return wrapped.data;
  }

  return response as PharmacySettings;
};

export const getPharmacySettings =
  async (): Promise<PharmacySettings> => {
    const response =
      await apiGet<
        PharmacySettings | SettingsResponse
      >("/settings");

    return unwrapSettings(response);
  };

export const updatePharmacySettings =
  async (
    settings: PharmacySettings,
  ): Promise<PharmacySettings> => {
    const response =
      await apiPut<
        PharmacySettings | SettingsResponse
      >("/settings", settings);

    return unwrapSettings(response);
  };

export default {
  getPharmacySettings,
  updatePharmacySettings,
};