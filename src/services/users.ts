import { apiDelete, apiGet, apiPost, apiPut } from "./api";

export type UserRole =
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  isVerified?: boolean;
}

export interface UpdatePasswordInput {
  password: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

const unwrap = <T>(
  response: T | ApiEnvelope<T>,
): T => {
  if (
    response &&
    typeof response === "object" &&
    "success" in response
  ) {
    const wrapped =
      response as ApiEnvelope<T>;

    if (!wrapped.success) {
      throw new Error(
        wrapped.message ||
          "The request failed.",
      );
    }

    if (
      wrapped.data === undefined
    ) {
      throw new Error(
        "The server returned no data.",
      );
    }

    return wrapped.data;
  }

  return response as T;
};

const normalizeUser = (
  user: ManagedUser,
): ManagedUser => ({
  ...user,
  phone: user.phone ?? null,
});

export const usersService = {
  async getAll(): Promise<ManagedUser[]> {
    const response =
      await apiGet<
        ManagedUser[] |
          {
            users: ManagedUser[];
          } |
          ApiEnvelope<
            ManagedUser[] |
              {
                users: ManagedUser[];
              }
          >
      >("/users");

    const data = unwrap(response);

    if (Array.isArray(data)) {
      return data.map(normalizeUser);
    }

    return data.users.map(normalizeUser);
  },

  async create(
    input: CreateUserInput,
  ): Promise<ManagedUser> {
    const response =
      await apiPost<
        ManagedUser | ApiEnvelope<ManagedUser>
      >("/users", input);

    return normalizeUser(
      unwrap(response),
    );
  },

  async update(
    userId: string,
    input: UpdateUserInput,
  ): Promise<ManagedUser> {
    const response =
      await apiPut<
        ManagedUser | ApiEnvelope<ManagedUser>
      >(
        `/users/${userId}`,
        input,
      );

    return normalizeUser(
      unwrap(response),
    );
  },

  async updatePassword(
    userId: string,
    input: UpdatePasswordInput,
  ): Promise<void> {
    const response =
      await apiPut<
        unknown |
          ApiEnvelope<unknown>
      >(
        `/users/${userId}/password`,
        input,
      );

    unwrap(response);
  },

  async activate(
    userId: string,
  ): Promise<ManagedUser> {
    return this.update(
      userId,
      {
        isVerified: true,
      },
    );
  },

  async deactivate(
    userId: string,
  ): Promise<ManagedUser> {
    return this.update(
      userId,
      {
        isVerified: false,
      },
    );
  },

  async delete(
    userId: string,
  ): Promise<void> {
    const response =
      await apiDelete<
        unknown |
          ApiEnvelope<unknown>
      >(
        `/users/${userId}`,
      );

    unwrap(response);
  },
};

export default usersService;