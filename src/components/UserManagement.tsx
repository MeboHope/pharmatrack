import React, { useEffect, useMemo, useState } from "react";
import {
UserPlus,
Search,
Shield,
Pencil,
UserX,
UserCheck,
X,
Save,
Loader2,
AlertCircle,
} from "lucide-react";

import {
apiDelete,
apiGet,
apiPost,
apiPut,
} from "../services/api";

type UserRole = "ADMIN" | "PHARMACIST" | "CLINICIAN";

interface ManagedUser {
id: string;
name: string;
email: string;
phone?: string | null;
role: UserRole;
isVerified: boolean;
createdAt?: string;
}

interface UsersResponse {
users?: ManagedUser[];
}

interface UserManagementProps {
currentUserId: string;
}

interface UserForm {
name: string;
email: string;
phone: string;
role: UserRole;
password: string;
}

const roleLabels: Record<UserRole, string> = {
ADMIN: "Admin",
PHARMACIST: "Pharmacist",
CLINICIAN: "Clinician",
};

const emptyForm: UserForm = {
name: "",
email: "",
phone: "",
role: "PHARMACIST",
password: "",
};

export const UserManagement: React.FC<UserManagementProps> = ({
currentUserId,
}) => {
const [users, setUsers] = useState<ManagedUser[]>([]);
const [searchTerm, setSearchTerm] = useState("");
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [error, setError] = useState("");
const [successMessage, setSuccessMessage] = useState("");

const [isModalOpen, setIsModalOpen] = useState(false);
const [editingUser, setEditingUser] =
useState<ManagedUser | null>(null);

const [form, setForm] = useState<UserForm>(emptyForm);

const loadUsers = async () => {
try {
setIsLoading(true);
setError("");


  const response = await apiGet<
    UsersResponse | ManagedUser[]
  >("/users");

  const loadedUsers = Array.isArray(response)
    ? response
    : response.users ?? [];

  setUsers(loadedUsers);
} catch (requestError) {
  setError(
    requestError instanceof Error
      ? requestError.message
      : "Unable to load user accounts.",
  );
} finally {
  setIsLoading(false);
}


};

useEffect(() => {
void loadUsers();
}, []);

const openCreateModal = () => {
setEditingUser(null);
setForm({ ...emptyForm });
setError("");
setSuccessMessage("");
setIsModalOpen(true);
};

const openEditModal = (user: ManagedUser) => {
setEditingUser(user);


setForm({
  name: user.name,
  email: user.email,
  phone: user.phone ?? "",
  role: user.role,
  password: "",
});

setError("");
setSuccessMessage("");
setIsModalOpen(true);


};

const closeModal = () => {
if (isSaving) {
return;
}


setIsModalOpen(false);
setEditingUser(null);
setForm({ ...emptyForm });


};

const handleFormChange = (
field: keyof UserForm,
value: string,
) => {
setForm((previous) => ({
...previous,
[field]:
field === "role"
? (value as UserRole)
: value,
}));
};

const handleSubmit = async (
event: React.FormEvent<HTMLFormElement>,
) => {
event.preventDefault();


setError("");
setSuccessMessage("");
setIsSaving(true);

try {
  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const phone = form.phone.trim();
  const password = form.password;

  if (!name) {
    throw new Error("Full name is required.");
  }

  if (!email) {
    throw new Error("Email address is required.");
  }

  if (!email.includes("@")) {
    throw new Error(
      "Please enter a valid email address.",
    );
  }

  if (!editingUser && password.length < 8) {
    throw new Error(
      "Password must contain at least 8 characters.",
    );
  }

  if (
    editingUser &&
    password.length > 0 &&
    password.length < 8
  ) {
    throw new Error(
      "New password must contain at least 8 characters.",
    );
  }

  if (editingUser) {
    await apiPut(`/users/${editingUser.id}`, {
      name,
      email,
      phone: phone || undefined,
      role: form.role,
    });

    if (password) {
      await apiPut(
        `/users/${editingUser.id}/password`,
        {
          password,
        },
      );
    }

    setSuccessMessage(
      "User account updated successfully.",
    );
  } else {
    await apiPost("/users", {
      name,
      email,
      phone: phone || undefined,
      role: form.role,
      password,
    });

    setSuccessMessage(
      "User account created successfully.",
    );
  }

  await loadUsers();

  setIsModalOpen(false);
  setEditingUser(null);
  setForm({ ...emptyForm });
} catch (requestError) {
  setError(
    requestError instanceof Error
      ? requestError.message
      : "Unable to save the user account.",
  );
} finally {
  setIsSaving(false);
}


};

const handleToggleVerification = async (
user: ManagedUser,
) => {
if (user.id === currentUserId) {
setError(
"You cannot deactivate your own administrator account.",
);
return;
}


try {
  setError("");
  setSuccessMessage("");

  await apiPut(`/users/${user.id}`, {
    isVerified: !user.isVerified,
  });

  await loadUsers();

  setSuccessMessage(
    user.isVerified
      ? "User account has been deactivated."
      : "User account has been activated.",
  );
} catch (requestError) {
  setError(
    requestError instanceof Error
      ? requestError.message
      : "Unable to update the user account.",
  );
}


};

const handleDelete = async (
user: ManagedUser,
) => {
if (user.id === currentUserId) {
setError(
"You cannot delete your own administrator account.",
);
return;
}


const confirmed = window.confirm(
  `Delete the account for ${user.name}? This action cannot be undone.`,
);

if (!confirmed) {
  return;
}

try {
  setError("");
  setSuccessMessage("");

  await apiDelete(`/users/${user.id}`);

  setUsers((previous) =>
    previous.filter(
      (item) => item.id !== user.id,
    ),
  );

  setSuccessMessage(
    "User account deleted successfully.",
  );
} catch (requestError) {
  setError(
    requestError instanceof Error
      ? requestError.message
      : "Unable to delete the user account.",
  );
}


};

const filteredUsers = useMemo(() => {
const query = searchTerm.trim().toLowerCase();

if (!query) {
  return users;
}

return users.filter((user) => {
  return (
    user.name.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query) ||
    roleLabels[user.role]
      .toLowerCase()
      .includes(query) ||
    (user.phone ?? "")
      .toLowerCase()
      .includes(query)
  );
});


}, [users, searchTerm]);

return ( <section className="min-h-screen bg-slate-100 p-6"> <div className="mx-auto max-w-7xl space-y-6"> <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> <div> <h1 className="text-2xl font-bold text-slate-900">
User Management </h1>


        <p className="mt-1 text-sm text-slate-500">
          Create, update, activate, and manage
          PharmaTrack user accounts.
        </p>
      </div>

      <button
        type="button"
        onClick={openCreateModal}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1b4662]"
      >
        <UserPlus className="h-4 w-4" />
        Add User
      </button>
    </div>

    {error && (
      <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

        <span>{error}</span>
      </div>
    )}

    {successMessage && (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
        {successMessage}
      </div>
    )}

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

          <input
            type="search"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#22577A]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading user accounts...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500">
          No user accounts found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  User
                </th>

                <th className="px-5 py-3">
                  Role
                </th>

                <th className="px-5 py-3">
                  Phone
                </th>

                <th className="px-5 py-3">
                  Status
                </th>

                <th className="px-5 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {user.name}
                    </div>

                    <div className="text-xs text-slate-500">
                      {user.email}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      <Shield className="h-3.5 w-3.5" />

                      {roleLabels[user.role]}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {user.phone || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        user.isVerified
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {user.isVerified
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(user)
                        }
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                        title="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {user.id !== currentUserId && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void handleToggleVerification(
                                user,
                              )
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                            title={
                              user.isVerified
                                ? "Deactivate user"
                                : "Activate user"
                            }
                          >
                            {user.isVerified ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleDelete(
                                user,
                              )
                            }
                            className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                            title="Delete user"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>

  {isModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-bold text-slate-900">
              {editingUser
                ? "Edit User Account"
                : "Create User Account"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Manage account information and access
              role.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-5"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Full Name
            </label>

            <input
              type="text"
              required
              value={form.name}
              onChange={(event) =>
                handleFormChange(
                  "name",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Email Address
            </label>

            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                handleFormChange(
                  "email",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Phone
              </label>

              <input
                type="text"
                value={form.phone}
                onChange={(event) =>
                  handleFormChange(
                    "phone",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Role
              </label>

              <select
                value={form.role}
                onChange={(event) =>
                  handleFormChange(
                    "role",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[#22577A]"
              >
                <option value="PHARMACIST">
                  Pharmacist
                </option>

                <option value="CLINICIAN">
                  Clinician
                </option>

                <option value="ADMIN">
                  Admin
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {editingUser
                ? "New Password (optional)"
                : "Password"}
            </label>

            <input
              type="password"
              required={!editingUser}
              minLength={8}
              value={form.password}
              onChange={(event) =>
                handleFormChange(
                  "password",
                  event.target.value,
                )
              }
              placeholder={
                editingUser
                  ? "Leave blank to keep current password"
                  : "Minimum 8 characters"
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A]"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1b4662] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {editingUser
                ? "Save Changes"
                : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
</section>


);
};

export default UserManagement;
