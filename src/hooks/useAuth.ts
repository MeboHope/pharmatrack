import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserAccount, UserOrganization } from "../types";
import { authService } from "../services/auth";

export interface UseAuthResult {
  currentUser: UserAccount | null;
  organizations: UserOrganization[];
  currentOrganization: UserOrganization | null;
  isLoading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<UserAccount>;

  register: (
    name: string,
    email: string,
    password: string,
    role?: string
  ) => Promise<UserAccount>;

  verifyEmail: (
    email: string,
    code: string
  ) => Promise<UserAccount>;

  resendVerification: (
    email: string
  ) => Promise<unknown>;

  logout: () => Promise<void>;

  syncAuthenticatedUser: (
    user: UserAccount | null
  ) => void;

  switchOrganization: (
    organizationId: string
  ) => Promise<UserAccount>;
}

const isAuthenticatedUser = (
  user: UserAccount | null
): boolean => {
  if (!user) {
    return false;
  }

  /*
   * UserAccount in the current PharmaTrack frontend does not
   * contain an isAuthenticated property. Presence of the user
   * together with the existing authentication/verification
   * state is what determines whether the session is usable.
   */
  return Boolean(user.isVerified);
};

const isSuperAdmin = (user: UserAccount | null): boolean => {
  return user?.role === "Super Admin";
};

const toBackendRole = (role?: string) => {
  if (role === "Admin") {
    /*
     * Public registration must never create an administrator.
     * The backend also enforces this independently.
     */
    return "PHARMACIST" as const;
  }

  if (role === "Clinician") {
    return "CLINICIAN" as const;
  }

  return "PHARMACIST" as const;
};

export function useAuth(): UseAuthResult {
  const [currentUser, setCurrentUser] =
    useState<UserAccount | null>(null);

  const [organizations, setOrganizations] =
    useState<UserOrganization[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const loadOrganizations = useCallback(
    async (user: UserAccount | null) => {
      if (!user || !isAuthenticatedUser(user)) {
        setOrganizations([]);
        return [];
      }

      /*
       * Super Admin operates at platform level and therefore does
       * not need the tenant organization selector.
       */
      if (isSuperAdmin(user)) {
        setOrganizations([]);
        return [];
      }

      try {
        const result =
          await authService.getMyOrganizations();

        setOrganizations(result);

        return result;
      } catch (error) {
        console.error(
          "Failed to load user organizations:",
          error
        );

        setOrganizations([]);

        return [];
      }
    },
    []
  );

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<UserAccount> => {
      setIsLoading(true);

      try {
        const user =
          await authService.login(email, password);

        setCurrentUser(user);

        await loadOrganizations(user);

        return user;
      } finally {
        setIsLoading(false);
      }
    },
    [loadOrganizations]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role?: string
    ): Promise<UserAccount> => {
      setIsLoading(true);

      try {
        const backendRole = toBackendRole(role);

        const user =
          await authService.register({
            name,
            email,
            password,
            role: backendRole,
          });

        /*
         * New public accounts are expected to be unverified.
         * Do not automatically establish an authenticated
         * organization session here.
         */
        setCurrentUser(null);
        setOrganizations([]);

        return user;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyEmail = useCallback(
    async (
      email: string,
      code: string
    ): Promise<UserAccount> => {
      return authService.verifyEmail(email, code);
    },
    []
  );

  const resendVerification = useCallback(
    async (email: string) => {
      return authService.resendVerificationCode(email);
    },
    []
  );

  const syncAuthenticatedUser = useCallback(
    (user: UserAccount | null) => {
      if (!user) {
        setCurrentUser(null);
        setOrganizations([]);
        return;
      }

      setCurrentUser(user);

      void loadOrganizations(user);
    },
    [loadOrganizations]
  );

  const switchOrganization = useCallback(
    async (
      organizationId: string
    ): Promise<UserAccount> => {
      if (!currentUser) {
        throw new Error(
          "You must be logged in to switch organizations."
        );
      }

      if (isSuperAdmin(currentUser)) {
        throw new Error(
          "Super Admin users do not switch tenant organizations."
        );
      }

      if (!organizationId.trim()) {
        throw new Error(
          "A valid organization is required."
        );
      }

      setIsLoading(true);

      try {
        const user =
          await authService.switchOrganization(
            organizationId
          );

        setCurrentUser(user);

        await loadOrganizations(user);

        return user;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, loadOrganizations]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      /*
       * Local authentication state must still be cleared even
       * if the server-side logout request fails.
       */
      console.error(
        "Logout request failed:",
        error
      );
    } finally {
      setCurrentUser(null);
      setOrganizations([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      setIsLoading(true);

      try {
        const storedUser =
          authService.getStoredUser();

        if (
          storedUser &&
          isAuthenticatedUser(storedUser)
        ) {
          if (!mounted) {
            return;
          }

          setCurrentUser(storedUser);

          /*
           * The current authService does not expose a separate
           * refreshSession() method. The API layer already handles
           * access-token refresh when protected requests receive
           * a 401 response.
           *
           * Therefore restore the locally stored authenticated
           * user and reload the current user's organizations.
           */
          await loadOrganizations(storedUser);
        } else {
          authService.clearSession();

          if (!mounted) {
            return;
          }

          setCurrentUser(null);
          setOrganizations([]);
        }
      } catch (error) {
        console.error(
          "Authentication initialization failed:",
          error
        );

        if (!mounted) {
          return;
        }

        setCurrentUser(null);
        setOrganizations([]);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [loadOrganizations]);

  const currentOrganization =
    useMemo<UserOrganization | null>(() => {
      if (
        !currentUser ||
        isSuperAdmin(currentUser)
      ) {
        return null;
      }

      if (currentUser.organizationId) {
        const matchedOrganization =
          organizations.find(
            (organization) =>
              organization.id ===
              currentUser.organizationId
          );

        if (matchedOrganization) {
          return matchedOrganization;
        }
      }

      /*
       * Preserve organization information returned directly
       * by the authentication API while the organization list
       * is loading.
       */
      if (
        currentUser.organizationId &&
        currentUser.organizationName &&
        currentUser.organizationType
      ) {
        return {
          id: currentUser.organizationId,
          name: currentUser.organizationName,
          type: currentUser.organizationType,
          status: "ACTIVE",
          role:
            currentUser.organizationRole ??
            (currentUser.role === "Admin"
              ? "ADMIN"
              : currentUser.role ===
                  "Pharmacist"
                ? "PHARMACIST"
                : "CLINICIAN"),
        };
      }

      return null;
    }, [currentUser, organizations]);

  return {
    currentUser,
    organizations,
    currentOrganization,
    isLoading,
    login,
    register,
    verifyEmail,
    resendVerification,
    logout,
    syncAuthenticatedUser,
    switchOrganization,
  };
}

export default useAuth;