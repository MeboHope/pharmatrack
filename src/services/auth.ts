import apiRequest from "./api";

import type {
  OrganizationRole,
  OrganizationStatus,
  OrganizationType,
  UserAccount,
  UserOrganization,
} from "../types";

export type AuthRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

interface BackendAuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: AuthRole;
  isVerified: boolean;
  createdAt?: string;

  organizationId?: string | null;
  organizationName?: string | null;
  organizationType?:
    | OrganizationType
    | null;

  organizationRole?:
    | AuthRole
    | null;
}

interface LoginAuthData {
  user: BackendAuthUser;
  accessToken: string;
  refreshToken: string;
}

interface RegistrationData {
  user: BackendAuthUser;
  verificationRequired: boolean;
}

interface VerificationData {
  user: BackendAuthUser;
}

interface RefreshData {
  user?: BackendAuthUser;
  accessToken: string;
  refreshToken: string;
}

interface LogoutData {
  success?: boolean;
}

interface BackendOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  role: OrganizationRole | AuthRole;
}

interface OrganizationsData {
  organizations: BackendOrganization[];
  currentOrganizationId?: string | null;
}

interface OrganizationSwitchData {
  user: BackendAuthUser;
  accessToken: string;
  refreshToken: string;
  organizations?: BackendOrganization[];
  currentOrganizationId?: string | null;
}

const ACCESS_TOKEN_KEY =
  "pharmatrack_access_token";

const REFRESH_TOKEN_KEY =
  "pharmatrack_refresh_token";

const USER_KEY =
  "pharmatrack_authenticated_user";

const normalizeOrganizationRole = (
  role:
    | OrganizationRole
    | AuthRole,
): OrganizationRole => {
  if (
    role === "ADMIN" ||
    role === "PHARMACIST" ||
    role === "CLINICIAN"
  ) {
    return role;
  }

  throw new Error(
    "The server returned an unsupported organization membership role.",
  );
};

const toFrontendOrganization = (
  organization: BackendOrganization,
): UserOrganization => {
  if (
    !organization ||
    !organization.id ||
    !organization.name
  ) {
    throw new Error(
      "The server returned an invalid organization.",
    );
  }

  if (
    organization.type !== "PHARMACY" &&
    organization.type !== "CLINIC"
  ) {
    throw new Error(
      "The server returned an unsupported organization type.",
    );
  }

  if (
    organization.status !== "ACTIVE" &&
    organization.status !== "SUSPENDED"
  ) {
    throw new Error(
      "The server returned an unsupported organization status.",
    );
  }

  return {
    id: organization.id,
    name: organization.name,
    type: organization.type,
    status: organization.status,
    role: normalizeOrganizationRole(
      organization.role,
    ),
  };
};

const toFrontendUser = (
  user: BackendAuthUser,
): UserAccount => {
  if (!user || !user.id) {
    throw new Error(
      "Authentication succeeded but the server returned an invalid user account.",
    );
  }

  const roleMap: Record<
    AuthRole,
    UserAccount["role"]
  > = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    PHARMACIST: "Pharmacist",
    CLINICIAN: "Clinician",
  };

  const frontendRole =
    roleMap[user.role];

  if (!frontendRole) {
    throw new Error(
      "The server returned an unsupported user role.",
    );
  }

  let organizationRole:
    | OrganizationRole
    | null = null;

  if (
    user.role !== "SUPER_ADMIN"
  ) {
    const backendOrganizationRole =
      user.organizationRole ??
      user.role;

    organizationRole =
      normalizeOrganizationRole(
        backendOrganizationRole,
      );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone:
      user.phone ?? undefined,

    role: frontendRole,

    isVerified:
      user.isVerified,

    createdAt:
      user.createdAt ??
      new Date().toISOString(),

    organizationId:
      user.organizationId ?? null,

    organizationName:
      user.organizationName ?? null,

    organizationType:
      user.organizationType ?? null,

    organizationRole,
  };
};

const saveSession = (
  user: UserAccount,
  accessToken: string,
  refreshToken: string,
): void => {
  if (!accessToken) {
    throw new Error(
      "Authentication succeeded but no access token was returned.",
    );
  }

  if (!refreshToken) {
    throw new Error(
      "Authentication succeeded but no refresh token was returned.",
    );
  }

  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken,
  );

  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    refreshToken,
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );

  localStorage.removeItem(
    "pharmatrack_current_user",
  );
};

const saveAccessToken = (
  accessToken: string,
): void => {
  if (!accessToken) {
    throw new Error(
      "No access token was returned by the server.",
    );
  }

  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken,
  );
};

const saveRefreshToken = (
  refreshToken: string,
): void => {
  if (!refreshToken) {
    throw new Error(
      "No refresh token was returned by the server.",
    );
  }

  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    refreshToken,
  );
};

const saveUser = (
  user: UserAccount,
): void => {
  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );
};

const clearSession = (): void => {
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

const getAccessToken =
  (): string | null =>
    localStorage.getItem(
      ACCESS_TOKEN_KEY,
    );

const getRefreshToken =
  (): string | null =>
    localStorage.getItem(
      REFRESH_TOKEN_KEY,
    );

const getStoredUser =
  (): UserAccount | null => {
    const stored =
      localStorage.getItem(
        USER_KEY,
      );

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(
        stored,
      ) as UserAccount;
    } catch {
      localStorage.removeItem(
        USER_KEY,
      );

      return null;
    }
  };

const extractLoginAuthData = (
  response: {
    success?: boolean;
    message?: string;
    data?: LoginAuthData;
    errors?: unknown;
  },
): LoginAuthData => {
  if (
    !response ||
    response.success !== true
  ) {
    throw new Error(
      response?.message ||
        "Authentication request failed.",
    );
  }

  if (!response.data) {
    throw new Error(
      "The server returned no authentication data.",
    );
  }

  if (
    !response.data.user ||
    !response.data.user.id
  ) {
    throw new Error(
      "The server returned authentication data without a valid user.",
    );
  }

  if (
    !response.data.accessToken
  ) {
    throw new Error(
      "The server returned no access token.",
    );
  }

  if (
    !response.data.refreshToken
  ) {
    throw new Error(
      "The server returned no refresh token.",
    );
  }

  return response.data;
};

const extractOrganizations = (
  response: {
    success?: boolean;
    message?: string;
    data?: OrganizationsData;
  },
): UserOrganization[] => {
  if (
    !response ||
    response.success !== true
  ) {
    throw new Error(
      response?.message ||
        "Unable to load organizations.",
    );
  }

  if (
    !response.data ||
    !Array.isArray(
      response.data.organizations,
    )
  ) {
    throw new Error(
      "The server returned an invalid organization list.",
    );
  }

  return response.data.organizations.map(
    toFrontendOrganization,
  );
};

const extractOrganizationSwitchData = (
  response: {
    success?: boolean;
    message?: string;
    data?: OrganizationSwitchData;
  },
): OrganizationSwitchData => {
  if (
    !response ||
    response.success !== true
  ) {
    throw new Error(
      response?.message ||
        "Unable to switch organization.",
    );
  }

  if (
    !response.data
  ) {
    throw new Error(
      "The server returned no organization switch data.",
    );
  }

  if (
    !response.data.user ||
    !response.data.user.id
  ) {
    throw new Error(
      "The server returned no valid user account after switching organizations.",
    );
  }

  if (
    !response.data.accessToken
  ) {
    throw new Error(
      "The server returned no access token after switching organizations.",
    );
  }

  if (
    !response.data.refreshToken
  ) {
    throw new Error(
      "The server returned no refresh token after switching organizations.",
    );
  }

  return response.data;
};

export const authService = {
  async login(
    email: string,
    password: string,
  ): Promise<UserAccount> {
    const response =
      await apiRequest.post<LoginAuthData>(
        "/auth/login",
        {
          email:
            email
              .trim()
              .toLowerCase(),

          password,
        },
      );

    const authData =
      extractLoginAuthData(
        response,
      );

    const user =
      toFrontendUser(
        authData.user,
      );

    saveSession(
      user,
      authData.accessToken,
      authData.refreshToken,
    );

    return user;
  },

  async register(
    input: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role?: AuthRole;
    },
  ): Promise<UserAccount> {
    const response =
      await apiRequest.post<RegistrationData>(
        "/auth/register",
        {
          name:
            input.name.trim(),

          email:
            input.email
              .trim()
              .toLowerCase(),

          phone:
            input.phone?.trim() ||
            undefined,

          password:
            input.password,

          role:
            input.role ||
            "PHARMACIST",
        },
      );

    if (
      response.success !== true
    ) {
      throw new Error(
        response.message ||
          "Unable to create the account.",
      );
    }

    if (
      !response.data?.user
    ) {
      throw new Error(
        "The server returned no registered user.",
      );
    }

    if (
      !response.data
        .verificationRequired
    ) {
      throw new Error(
        "The server did not require email verification.",
      );
    }

    /*
     * Registration intentionally does NOT
     * save an authentication session.
     *
     * The account must be verified first.
     */
    return toFrontendUser(
      response.data.user,
    );
  },

  async verifyEmail(
    email: string,
    code: string,
  ): Promise<UserAccount> {
    const response =
      await apiRequest.post<VerificationData>(
        "/auth/verify-email",
        {
          email:
            email
              .trim()
              .toLowerCase(),

          code:
            code.trim(),
        },
      );

    if (
      response.success !== true
    ) {
      throw new Error(
        response.message ||
          "Unable to verify the email address.",
      );
    }

    if (
      !response.data?.user
    ) {
      throw new Error(
        "The server returned no verified user.",
      );
    }

    return toFrontendUser(
      response.data.user,
    );
  },

  async resendVerificationCode(
    email: string,
  ): Promise<void> {
    const response =
      await apiRequest.post(
        "/auth/resend-verification",
        {
          email:
            email
              .trim()
              .toLowerCase(),
        },
      );

    if (
      response.success !== true
    ) {
      throw new Error(
        response.message ||
          "Unable to resend the verification code.",
      );
    }
  },

  /**
   * Return the organizations currently
   * available to the authenticated user.
   *
   * Super Admin users operate at platform
   * level and therefore normally receive an
   * empty tenant organization list.
   */
  async getMyOrganizations():
    Promise<UserOrganization[]> {
    const response =
      await apiRequest.get<OrganizationsData>(
        "/organizations/my",
      );

    return extractOrganizations(
      response,
    );
  },

  /**
   * Switch the authenticated user into
   * another organization.
   *
   * The backend rotates the refresh token
   * during this operation. Therefore the new
   * access and refresh tokens must both replace
   * the current session tokens.
   */
  async switchOrganization(
    organizationId: string,
  ): Promise<UserAccount> {
    const normalizedOrganizationId =
      organizationId.trim();

    if (!normalizedOrganizationId) {
      throw new Error(
        "An organization must be selected.",
      );
    }

    const refreshToken =
      getRefreshToken();

    if (!refreshToken) {
      throw new Error(
        "Your authentication session has expired. Please log in again.",
      );
    }

    const response =
      await apiRequest.post<OrganizationSwitchData>(
        "/organizations/select",
        {
          organizationId:
            normalizedOrganizationId,

          refreshToken,
        },
      );

    const switchData =
      extractOrganizationSwitchData(
        response,
      );

    const user =
      toFrontendUser(
        switchData.user,
      );

    /*
     * Organization switching is an
     * authenticated session transition.
     *
     * The backend revokes the previous
     * refresh token and issues a replacement.
     */
    saveSession(
      user,
      switchData.accessToken,
      switchData.refreshToken,
    );

    return user;
  },

  async getCurrentUser():
    Promise<UserAccount | null> {
    const storedUser =
      getStoredUser();

    if (!storedUser) {
      return null;
    }

    if (!getAccessToken()) {
      return null;
    }

    return storedUser;
  },

  async refresh(): Promise<string> {
    const refreshToken =
      getRefreshToken();

    if (!refreshToken) {
      throw new Error(
        "No refresh token is available.",
      );
    }

    const response =
      await apiRequest.post<RefreshData>(
        "/auth/refresh",
        {
          refreshToken,
        },
      );

    if (
      response.success !== true
    ) {
      throw new Error(
        response.message ||
          "Unable to refresh authentication session.",
      );
    }

    const accessToken =
      response.data
        ?.accessToken;

    const newRefreshToken =
      response.data
        ?.refreshToken;

    if (!accessToken) {
      throw new Error(
        "Unable to refresh authentication session.",
      );
    }

    if (!newRefreshToken) {
      throw new Error(
        "The server did not return a rotated refresh token.",
      );
    }

    /*
     * Refresh-token rotation:
     *
     * The backend revokes the old refresh token
     * and returns a new one. Both tokens must be
     * stored together so the next refresh uses the
     * newly issued refresh token.
     */
    saveAccessToken(
      accessToken,
    );

    saveRefreshToken(
      newRefreshToken,
    );

    /*
     * If the backend returned an updated user,
     * keep the locally stored organization context
     * synchronized as well.
     */
    if (
      response.data?.user
    ) {
      const updatedUser =
        toFrontendUser(
          response.data.user,
        );

      saveUser(
        updatedUser,
      );
    }

    return accessToken;
  },

  async logout(): Promise<void> {
    const refreshToken =
      getRefreshToken();

    try {
      /*
       * Ask the backend to revoke the
       * current refresh-token session.
       *
       * Logout does not depend on the access
       * token because it may already be expired.
       */
      await apiRequest.post<LogoutData>(
        "/auth/logout",
        {
          refreshToken:
            refreshToken ?? undefined,
        },
      );
    } catch {
      /*
       * Even if the backend is unavailable,
       * the local session must still be cleared.
       *
       * This prevents the user from remaining
       * logged in on the current browser.
       */
    } finally {
      clearSession();
    }
  },

  getAccessToken,

  getRefreshToken,

  getStoredUser,

  isAuthenticated():
    boolean {
    return Boolean(
      getAccessToken() &&
        getStoredUser(),
    );
  },

  clearSession,
};

export default authService;