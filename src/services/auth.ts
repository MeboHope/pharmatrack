
import apiRequest from "./api";

import type {
  UserAccount,
} from "../types";

export type AuthRole =
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
}

interface AuthData {
  user: BackendAuthUser;
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: AuthData;
  errors?: unknown;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: AuthData;
  errors?: unknown;
}

interface RefreshData {
  accessToken: string;
}

interface RefreshResponse {
  success: boolean;
  message?: string;
  data?: RefreshData;
  errors?: unknown;
}

const ACCESS_TOKEN_KEY =
  "pharmatrack_access_token";

const REFRESH_TOKEN_KEY =
  "pharmatrack_refresh_token";

const USER_KEY =
  "pharmatrack_authenticated_user";

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
      user.createdAt,
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

  /*
   * Remove the old prototype authentication
   * session so it cannot interfere with the
   * new backend authentication system.
   */
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
  (): string | null => {
    return localStorage.getItem(
      ACCESS_TOKEN_KEY,
    );
  };

const getRefreshToken =
  (): string | null => {
    return localStorage.getItem(
      REFRESH_TOKEN_KEY,
    );
  };

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

const extractAuthData = (
  response:
    | LoginResponse
    | RegisterResponse,
): AuthData => {
  /*
   * IMPORTANT:
   *
   * apiRequest.post() returns the complete
   * backend response envelope:
   *
   * {
   *   success: true,
   *   message: "...",
   *   data: {
   *     user: {...},
   *     accessToken: "...",
   *     refreshToken: "..."
   *   }
   * }
   *
   * Therefore authentication data lives
   * inside response.data.
   */
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

export const authService = {
  /**
   * Login using the backend API.
   */
  async login(
    email: string,
    password: string,
  ): Promise<UserAccount> {
    const response =
      await apiRequest.post<LoginResponse>(
        "/auth/login",
        {
          email:
            email
              .trim()
              .toLowerCase(),
          password,
        },
      );

    /*
     * FIX:
     *
     * Previously this code attempted:
     *
     * response.data.user
     *
     * But api.ts returns the entire backend
     * envelope in response.data.
     *
     * Correct path:
     *
     * response.data.data.user
     */
    const authData =
      extractAuthData(
        response.data,
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

  /**
   * Register a new account through the
   * backend API.
   */
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
      await apiRequest.post<RegisterResponse>(
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

    const authData =
      extractAuthData(
        response.data,
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

  /**
   * Recover the current authenticated
   * user from the browser session.
   *
   * The stored user is only a cached
   * representation. App.tsx subsequently
   * validates the session with the backend.
   */
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

  /**
   * Refresh the short-lived access token.
   */
  async refresh(): Promise<string> {
    const refreshToken =
      getRefreshToken();

    if (!refreshToken) {
      throw new Error(
        "No refresh token is available.",
      );
    }

    const response =
      await apiRequest.post<RefreshResponse>(
        "/auth/refresh",
        {
          refreshToken,
        },
      );

    if (
      response.data?.success !==
      true
    ) {
      throw new Error(
        response.data?.message ||
          "Unable to refresh authentication session.",
      );
    }

    const accessToken =
      response.data.data
        ?.accessToken;

    if (!accessToken) {
      throw new Error(
        "Unable to refresh authentication session.",
      );
    }

    saveAccessToken(
      accessToken,
    );

    return accessToken;
  },

  async logout(): Promise<void> {
    clearSession();
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
