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
  CheckCircle2,
  Mail,
  RotateCw,
  Ban,
  Clock3,
  Users,
} from "lucide-react";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../services/api";

type UserRole = "ADMIN" | "PHARMACIST" | "CLINICIAN";

type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

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
  data?: ManagedUser[];
}

interface OrganizationInvitation {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string;
}

interface InvitationsResponse {
  invitations?: OrganizationInvitation[];
  data?: OrganizationInvitation[];
}

interface UserManagementProps {
  currentUserId: string;
}

interface InviteForm {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

interface EditUserForm {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  PHARMACIST: "Pharmacist",
  CLINICIAN: "Clinician",
};

const emptyInviteForm: InviteForm = {
  name: "",
  email: "",
  phone: "",
  role: "PHARMACIST",
};

const emptyEditForm: EditUserForm = {
  name: "",
  email: "",
  phone: "",
  role: "PHARMACIST",
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getInvitationStatus = (
  invitation: OrganizationInvitation,
): InvitationStatus => {
  if (invitation.acceptedAt) {
    return "ACCEPTED";
  }

  if (invitation.revokedAt) {
    return "REVOKED";
  }

  if (
    new Date(invitation.expiresAt).getTime() <=
    Date.now()
  ) {
    return "EXPIRED";
  }

  return "PENDING";
};

const invitationStatusLabel: Record<
  InvitationStatus,
  string
> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};

const formatDate = (
  value?: string | null,
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getInvitationStatusClasses = (
  status: InvitationStatus,
): string => {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "ACCEPTED":
      return "bg-emerald-100 text-emerald-700";
    case "REVOKED":
      return "bg-rose-100 text-rose-700";
    case "EXPIRED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export const UserManagement: React.FC<
  UserManagementProps
> = ({ currentUserId }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [invitations, setInvitations] = useState<
    OrganizationInvitation[]
  >([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [isLoadingUsers, setIsLoadingUsers] =
    useState(true);

  const [isLoadingInvitations, setIsLoadingInvitations] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [isInviteModalOpen, setIsInviteModalOpen] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState<ManagedUser | null>(null);

  const [inviteForm, setInviteForm] =
    useState<InviteForm>({
      ...emptyInviteForm,
    });

  const [editForm, setEditForm] =
    useState<EditUserForm>({
      ...emptyEditForm,
    });

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setError("");

      const response = await apiGet<
        UsersResponse | ManagedUser[]
      >("/users");

      const loadedUsers = Array.isArray(response)
        ? response
        : response.users ??
          response.data ??
          [];

      setUsers(loadedUsers);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load user accounts.",
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setIsLoadingInvitations(true);

      const response =
        await apiGet<
          InvitationsResponse |
            OrganizationInvitation[]
        >("/invitations");

      const loadedInvitations =
        Array.isArray(response)
          ? response
          : response.invitations ??
            response.data ??
            [];

      setInvitations(loadedInvitations);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load organization invitations.",
      );
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([
      loadUsers(),
      loadInvitations(),
    ]);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const openInviteModal = () => {
    setInviteForm({
      ...emptyInviteForm,
    });

    setEditingUser(null);
    setError("");
    setSuccessMessage("");
    setIsInviteModalOpen(true);
  };

  const openEditModal = (
    user: ManagedUser,
  ) => {
    setEditingUser(user);

    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
    });

    setError("");
    setSuccessMessage("");
    setIsInviteModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setIsInviteModalOpen(false);
    setEditingUser(null);
    setInviteForm({
      ...emptyInviteForm,
    });
    setEditForm({
      ...emptyEditForm,
    });
  };

  const handleInviteFormChange = (
    field: keyof InviteForm,
    value: string,
  ) => {
    setInviteForm((previous) => ({
      ...previous,
      [field]:
        field === "role"
          ? (value as UserRole)
          : value,
    }));
  };

  const handleEditFormChange = (
    field: keyof EditUserForm,
    value: string,
  ) => {
    setEditForm((previous) => ({
      ...previous,
      [field]:
        field === "role"
          ? (value as UserRole)
          : value,
    }));
  };

  const handleInviteSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const name = inviteForm.name.trim();
    const email = inviteForm.email
      .trim()
      .toLowerCase();
    const phone = inviteForm.phone.trim();

    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (name.length < 2) {
      setError(
        "Full name must contain at least 2 characters.",
      );
      return;
    }

    if (!email) {
      setError("Email address is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setError(
        "Please enter a valid email address.",
      );
      return;
    }

    setIsSaving(true);

    try {
      await apiPost("/invitations", {
        name,
        email,
        phone: phone || undefined,
        role: inviteForm.role,
      });

      await loadInvitations();

      setSuccessMessage(
        `Invitation sent successfully to ${email}.`,
      );

      setInviteForm({
        ...emptyInviteForm,
      });

      setIsInviteModalOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send the invitation.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    setError("");
    setSuccessMessage("");

    const name = editForm.name.trim();
    const email = editForm.email
      .trim()
      .toLowerCase();
    const phone = editForm.phone.trim();

    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (name.length < 2) {
      setError(
        "Full name must contain at least 2 characters.",
      );
      return;
    }

    if (!email) {
      setError("Email address is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setError(
        "Please enter a valid email address.",
      );
      return;
    }

    setIsSaving(true);

    try {
      await apiPut(
        `/users/${editingUser.id}`,
        {
          name,
          email,
          phone: phone || undefined,
          role: editForm.role,
        },
      );

      await loadUsers();

      setIsInviteModalOpen(false);
      setEditingUser(null);

      setSuccessMessage(
        "User account updated successfully.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update the user account.",
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
        "You cannot disable your own administrator account.",
      );
      return;
    }

    const action = user.isVerified
      ? "disable"
      : "enable";

    const confirmed = window.confirm(
      user.isVerified
        ? `Disable ${user.name}'s account? They will no longer be able to sign in.`
        : `Enable ${user.name}'s account? They will be allowed to sign in again.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await apiPut(
        `/users/${user.id}`,
        {
          isVerified: !user.isVerified,
        },
      );

      await loadUsers();

      setSuccessMessage(
        action === "disable"
          ? "User account has been disabled successfully."
          : "User account has been enabled successfully.",
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
        "You cannot remove your own administrator account.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${user.name} from this organization?\n\nTheir global account will be retained if they belong to another organization.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await apiDelete(
        `/users/${user.id}`,
      );

      setUsers((previous) =>
        previous.filter(
          (item) => item.id !== user.id,
        ),
      );

      setSuccessMessage(
        "User has been removed from this organization successfully.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove the user from this organization.",
      );
    }
  };

  const handleResendInvitation = async (
    invitation: OrganizationInvitation,
  ) => {
    const status =
      getInvitationStatus(invitation);

    if (status !== "PENDING" && status !== "EXPIRED") {
      setError(
        "Only pending or expired invitations can be resent.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Resend the invitation to ${invitation.email}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsSaving(true);

      await apiPost(
        `/invitations/${invitation.id}/resend`,
        {},
      );

      await loadInvitations();

      setSuccessMessage(
        `Invitation resent successfully to ${invitation.email}.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to resend the invitation.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeInvitation = async (
    invitation: OrganizationInvitation,
  ) => {
    if (
      getInvitationStatus(invitation) !==
      "PENDING"
    ) {
      setError(
        "Only pending invitations can be revoked.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Revoke the invitation sent to ${invitation.email}?\n\nThey will no longer be able to use the current invitation link.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsSaving(true);

      await apiPost(
        `/invitations/${invitation.id}/revoke`,
        {},
      );

      await loadInvitations();

      setSuccessMessage(
        "Invitation revoked successfully.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to revoke the invitation.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.name
          .toLowerCase()
          .includes(query) ||
        user.email
          .toLowerCase()
          .includes(query) ||
        roleLabels[user.role]
          .toLowerCase()
          .includes(query) ||
        (user.phone ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [users, searchTerm]);

  const filteredInvitations =
    useMemo(() => {
      const query = searchTerm
        .trim()
        .toLowerCase();

      if (!query) {
        return invitations;
      }

      return invitations.filter(
        (invitation) => {
          return (
            invitation.name
              .toLowerCase()
              .includes(query) ||
            invitation.email
              .toLowerCase()
              .includes(query) ||
            roleLabels[invitation.role]
              .toLowerCase()
              .includes(query)
          );
        },
      );
    }, [invitations, searchTerm]);

  const pendingInvitationCount =
    invitations.filter(
      (invitation) =>
        getInvitationStatus(invitation) ===
        "PENDING",
    ).length;

  const activeUserCount = users.filter(
    (user) => user.isVerified,
  ).length;

  return (
    <section className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#22577A] text-white shadow-sm">
                <Shield className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  User Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage staff accounts, invitations,
                  and organization access.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openInviteModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1b4662]"
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22577A]/10 text-[#22577A]">
                <Users className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Active Users
                </p>

                <p className="mt-0.5 text-lg font-bold text-slate-800">
                  {activeUserCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Mail className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pending Invitations
                </p>

                <p className="mt-0.5 text-lg font-bold text-slate-800">
                  {pendingInvitationCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Shield className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Organization Access
                </p>

                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  Role-based permissions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

                <input
                  type="search"
                  placeholder="Search users or invitations..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                />
              </div>

              <div className="text-xs font-medium text-slate-500">
                {filteredUsers.length}{" "}
                {filteredUsers.length === 1
                  ? "user"
                  : "users"}{" "}
                · {filteredInvitations.length}{" "}
                {filteredInvitations.length ===
                1
                  ? "invitation"
                  : "invitations"}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#22577A]" />

              <h2 className="text-sm font-bold text-slate-800">
                Active User Accounts
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Existing accounts with access to this
              organization.
            </p>
          </div>

          {isLoadingUsers ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading user accounts...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <Search className="mx-auto mb-3 h-5 w-5 text-slate-400" />

              <p className="font-semibold text-slate-700">
                No user accounts found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Try changing your search or invite a
                new user.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      User
                    </th>

                    <th className="px-5 py-3">
                      Organization Role
                    </th>

                    <th className="px-5 py-3">
                      Phone
                    </th>

                    <th className="px-5 py-3">
                      Account Status
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
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {user.name}

                          {user.id ===
                            currentUserId && (
                            <span className="ml-2 rounded-full bg-[#22577A]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#22577A]">
                              You
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
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
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            user.isVerified
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.isVerified
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />

                          {user.isVerified
                            ? "Enabled"
                            : "Disabled"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(user)
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#22577A]"
                            title="Edit user"
                            aria-label={`Edit ${user.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {user.id !==
                            currentUserId && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleToggleVerification(
                                    user,
                                  )
                                }
                                className={`rounded-lg border p-2 transition-colors ${
                                  user.isVerified
                                    ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                                    : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title={
                                  user.isVerified
                                    ? "Disable user account"
                                    : "Enable user account"
                                }
                                aria-label={
                                  user.isVerified
                                    ? `Disable ${user.name}`
                                    : `Enable ${user.name}`
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
                                className="rounded-lg border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50"
                                title="Remove from organization"
                                aria-label={`Remove ${user.name} from organization`}
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#22577A]" />

              <h2 className="text-sm font-bold text-slate-800">
                Organization Invitations
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Invitations allow staff to securely create
              their own password and join this organization.
            </p>
          </div>

          {isLoadingInvitations ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading invitations...
            </div>
          ) : filteredInvitations.length ===
            0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <Mail className="mx-auto mb-3 h-6 w-6 text-slate-400" />

              <p className="font-semibold text-slate-700">
                No invitations found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Use Invite User to send an invitation to
                a staff member.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Invitee
                    </th>

                    <th className="px-5 py-3">
                      Role
                    </th>

                    <th className="px-5 py-3">
                      Sent
                    </th>

                    <th className="px-5 py-3">
                      Expires
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
                  {filteredInvitations.map(
                    (invitation) => {
                      const status =
                        getInvitationStatus(
                          invitation,
                        );

                      return (
                        <tr
                          key={invitation.id}
                          className="transition-colors hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">
                              {invitation.name}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-500">
                              {invitation.email}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              <Shield className="h-3.5 w-3.5" />
                              {roleLabels[
                                invitation.role
                              ]}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              invitation.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              invitation.expiresAt,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${getInvitationStatusClasses(
                                status,
                              )}`}
                            >
                              {status ===
                                "PENDING" && (
                                <Clock3 className="h-3.5 w-3.5" />
                              )}

                              {status ===
                                "ACCEPTED" && (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}

                              {status ===
                                "REVOKED" && (
                                <Ban className="h-3.5 w-3.5" />
                              )}

                              {status ===
                                "EXPIRED" && (
                                <Clock3 className="h-3.5 w-3.5" />
                              )}

                              {
                                invitationStatusLabel[
                                  status
                                ]
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {(status ===
                                "PENDING" ||
                                status ===
                                  "EXPIRED") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleResendInvitation(
                                      invitation,
                                    )
                                  }
                                  disabled={isSaving}
                                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#22577A] disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Resend invitation"
                                  aria-label={`Resend invitation to ${invitation.email}`}
                                >
                                  <RotateCw className="h-4 w-4" />
                                </button>
                              )}

                              {status ===
                                "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRevokeInvitation(
                                      invitation,
                                    )
                                  }
                                  disabled={isSaving}
                                  className="rounded-lg border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Revoke invitation"
                                  aria-label={`Revoke invitation to ${invitation.email}`}
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22577A]/10 text-[#22577A]">
                <Shield className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Organization Access
                </p>

                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  Role-based permissions
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <UserCheck className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Account Control
                </p>

                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  Enable or disable access
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Mail className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Secure Invitations
                </p>

                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  Staff create their own passwords
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <div className="flex items-center gap-2">
                  {editingUser ? (
                    <Pencil className="h-4 w-4 text-[#22577A]" />
                  ) : (
                    <Mail className="h-4 w-4 text-[#22577A]" />
                  )}

                  <h2 className="font-bold text-slate-900">
                    {editingUser
                      ? "Edit User Account"
                      : "Invite User"}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {editingUser
                    ? "Update account information and organization access."
                    : "Send a secure invitation so the staff member can create their own password."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                editingUser
                  ? handleEditSubmit
                  : handleInviteSubmit
              }
              className="space-y-4 p-5"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  minLength={2}
                  value={
                    editingUser
                      ? editForm.name
                      : inviteForm.name
                  }
                  onChange={(event) =>
                    editingUser
                      ? handleEditFormChange(
                          "name",
                          event.target.value,
                        )
                      : handleInviteFormChange(
                          "name",
                          event.target.value,
                        )
                  }
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  required
                  value={
                    editingUser
                      ? editForm.email
                      : inviteForm.email
                  }
                  onChange={(event) =>
                    editingUser
                      ? handleEditFormChange(
                          "email",
                          event.target.value,
                        )
                      : handleInviteFormChange(
                          "email",
                          event.target.value,
                        )
                  }
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={
                      editingUser
                        ? editForm.phone
                        : inviteForm.phone
                    }
                    onChange={(event) =>
                      editingUser
                        ? handleEditFormChange(
                            "phone",
                            event.target.value,
                          )
                        : handleInviteFormChange(
                            "phone",
                            event.target.value,
                          )
                    }
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Organization Role
                  </label>

                  <select
                    value={
                      editingUser
                        ? editForm.role
                        : inviteForm.role
                    }
                    onChange={(event) =>
                      editingUser
                        ? handleEditFormChange(
                            "role",
                            event.target.value,
                          )
                        : handleInviteFormChange(
                            "role",
                            event.target.value,
                          )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                  >
                    <option value="PHARMACIST">
                      Pharmacist
                    </option>

                    <option value="CLINICIAN">
                      Clinician
                    </option>

                    <option value="ADMIN">
                      Administrator
                    </option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <>
                  <div className="rounded-xl border border-[#22577A]/20 bg-[#22577A]/5 p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#22577A]" />

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Secure invitation
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          An invitation link will be sent to
                          this email address. The recipient will
                          use the secure link to create their own
                          password.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#22577A]" />

                      <p>
                        The selected role controls this user's
                        access within the current organization.
                        Administrators can manage organization
                        users and invitations.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {editingUser && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#22577A]" />

                    <p>
                      The selected role controls this user's
                      access within the current organization.
                      Passwords are managed by the account
                      holder and are not changed from this
                      screen.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1b4662] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingUser ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}

                  {editingUser
                    ? "Save Changes"
                    : "Send Invitation"}
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