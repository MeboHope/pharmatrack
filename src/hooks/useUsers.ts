import {
  useCallback,
  useEffect,
  useState,
} from "react";

import usersService, {
  type CreateUserInput,
  type ManagedUser,
  type UpdatePasswordInput,
  type UpdateUserInput,
} from "../services/users";

export const useUsers = () => {
  const [users, setUsers] =
    useState<ManagedUser[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadUsers =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedUsers =
          await usersService.getAll();

        setUsers(loadedUsers);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load users.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser =
    useCallback(
      async (
        input: CreateUserInput,
      ) => {
        const created =
          await usersService.create(
            input,
          );

        setUsers((current) => [
          created,
          ...current,
        ]);

        return created;
      },
      [],
    );

  const updateUser =
    useCallback(
      async (
        userId: string,
        input: UpdateUserInput,
      ) => {
        const updated =
          await usersService.update(
            userId,
            input,
          );

        setUsers((current) =>
          current.map((user) =>
            user.id === userId
              ? updated
              : user,
          ),
        );

        return updated;
      },
      [],
    );

  const updatePassword =
    useCallback(
      async (
        userId: string,
        input: UpdatePasswordInput,
      ) => {
        await usersService.updatePassword(
          userId,
          input,
        );
      },
      [],
    );

  const activateUser =
    useCallback(
      async (userId: string) => {
        return updateUser(
          userId,
          {
            isVerified: true,
          },
        );
      },
      [updateUser],
    );

  const deactivateUser =
    useCallback(
      async (userId: string) => {
        return updateUser(
          userId,
          {
            isVerified: false,
          },
        );
      },
      [updateUser],
    );

  const deleteUser =
    useCallback(
      async (userId: string) => {
        await usersService.delete(
          userId,
        );

        setUsers((current) =>
          current.filter(
            (user) =>
              user.id !== userId,
          ),
        );
      },
      [],
    );

  return {
    users,
    isLoading,
    error,
    loadUsers,
    createUser,
    updateUser,
    updatePassword,
    activateUser,
    deactivateUser,
    deleteUser,
  };
};

export default useUsers;