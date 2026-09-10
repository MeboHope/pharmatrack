
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { UserAccount } from "../types";
import { authService } from "../services/auth";

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  role:
    | "Admin"
    | "Pharmacist"
    | "Clinician";
  password: string;
}

interface UseAuthResult {
  currentUser: UserAccount | null;
  isLoading: boolean;
  error: string;

  login: (
    email: string,
    password: string,
  ) => Promise<UserAccount>;

  register: (
    input: RegisterInput,
  ) => Promise<UserAccount>;

  logout: () => Promise<void>;

  syncAuthenticatedUser: (
    user: UserAccount,
  ) => void;

  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const [
    currentUser,
    setCurrentUser,
  ] = useState<UserAccount | null>(
    () => authService.getStoredUser(),
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const syncAuthenticatedUser =
    useCallback(
      (user: UserAccount) => {
        setCurrentUser(user);
        setError("");
      },
      [],
    );

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<UserAccount> => {
      setIsLoading(true);
      setError("");

      try {
        const user =
          await authService.login(
            email,
            password,
          );

        setCurrentUser(user);

        return user;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to log in. Please try again.";

        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (
      input: RegisterInput,
    ): Promise<UserAccount> => {
      setIsLoading(true);
      setError("");

      try {
        const roleMap: Record<
          RegisterInput["role"],
          "ADMIN" |
            "PHARMACIST" |
            "CLINICIAN"
        > = {
          Admin: "ADMIN",
          Pharmacist: "PHARMACIST",
          Clinician: "CLINICIAN",
        };

        /*
         * Public registration must never
         * create an administrator account.
         */
        const backendRole =
          roleMap[input.role] ===
          "ADMIN"
            ? "PHARMACIST"
            : roleMap[input.role];

        const user =
          await authService.register({
            name: input.name,
            email: input.email,
            phone: input.phone,
            password: input.password,
            role: backendRole,
          });

        setCurrentUser(user);

        return user;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to create the account. Please try again.";

        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(
    async () => {
      setIsLoading(true);
      setError("");

      try {
        authService.clearSession();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to complete logout.";

        setError(message);
      } finally {
        setCurrentUser(null);
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const storedUser =
          authService.getStoredUser();

        if (
          !storedUser ||
          !authService.isAuthenticated()
        ) {
          if (mounted) {
            setCurrentUser(null);
          }

          return;
        }

        if (mounted) {
          setCurrentUser(
            storedUser,
          );
        }
      } catch (error) {
        console.error(
          "Failed to restore authentication session:",
          error,
        );

        if (mounted) {
          authService.clearSession();
          setCurrentUser(null);
        }
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
  }, []);

  return {
    currentUser,
    isLoading,
    error,
    login,
    register,
    logout,
    syncAuthenticatedUser,
    clearError,
  };
}

export default useAuth;
