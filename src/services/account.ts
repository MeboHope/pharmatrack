import apiRequest from "./api";

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  data?: {
    success: boolean;
  };
  errors?: unknown;
}

export const accountService = {
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const response =
      await apiRequest.put<ChangePasswordResponse>(
        "/account/password",
        {
          currentPassword,
          newPassword,
        },
      );

    const payload =
      response.data;

    if (
      !payload ||
      payload.success !== true
    ) {
      throw new Error(
        payload?.message ||
          "Unable to change password.",
      );
    }

    if (
      payload.data &&
      payload.data.success !== true
    ) {
      throw new Error(
        payload.message ||
          "Unable to change password.",
      );
    }
  },
};

export default accountService;