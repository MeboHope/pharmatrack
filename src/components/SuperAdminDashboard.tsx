import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Edit3,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  superAdminService,
  type Organization,
  type OrganizationMember,
  type OrganizationMemberRole,
  type OrganizationStatus,
  type OrganizationType,
} from "../services/superAdmin";
import { getApiErrorMessage } from "../services/api";

interface SuperAdminDashboardProps {
  userName?: string;
}

interface OrganizationFormState {
  name: string;
  type: OrganizationType;
  address: string;
  phone: string;
  email: string;
}

const emptyOrganizationForm: OrganizationFormState = {
  name: "",
  type: "PHARMACY",
  address: "",
  phone: "",
  email: "",
};

const formatDate = (
  value: string,
): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

const roleLabel = (
  role: OrganizationMemberRole,
): string => {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "PHARMACIST":
      return "Pharmacist";
    case "CLINICIAN":
      return "Clinician";
    default:
      return role;
  }
};

const organizationTypeLabel = (
  type: OrganizationType,
): string => {
  return type === "PHARMACY"
    ? "Pharmacy"
    : "Clinic";
};

const statusClasses = (
  status: OrganizationStatus,
): string => {
  return status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-red-50 text-red-700 border-red-200";
};

const getOrganizationCount = (
  organization: Organization,
  key:
    | "memberships"
    | "drugs"
    | "patients"
    | "suppliers"
    | "transactions",
): number => {
  return organization._count?.[key] ?? 0;
};

export const SuperAdminDashboard: React.FC<
  SuperAdminDashboardProps
> = ({ userName }) => {
  const [
    organizations,
    setOrganizations,
  ] = useState<Organization[]>([]);

  const [
    selectedOrganization,
    setSelectedOrganization,
  ] = useState<Organization | null>(
    null,
  );

  const [
    members,
    setMembers,
  ] = useState<OrganizationMember[]>(
    [],
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    isOrganizationModalOpen,
    setIsOrganizationModalOpen,
  ] = useState(false);

  const [
    editingOrganization,
    setEditingOrganization,
  ] = useState<Organization | null>(
    null,
  );

  const [
    organizationForm,
    setOrganizationForm,
  ] = useState<OrganizationFormState>(
    emptyOrganizationForm,
  );

  const [
    isMembersOpen,
    setIsMembersOpen,
  ] = useState(false);

  const [
    memberOrganization,
    setMemberOrganization,
  ] = useState<Organization | null>(
    null,
  );

  const [
    memberRole,
    setMemberRole,
  ] =
    useState<OrganizationMemberRole>(
      "ADMIN",
    );

  const [
    memberUserId,
    setMemberUserId,
  ] = useState("");

  const [
    activeMenu,
    setActiveMenu,
  ] = useState<string | null>(null);

  const loadOrganizations =
    useCallback(async () => {
      try {
        setError("");

        const data =
          await superAdminService.getOrganizations();

        setOrganizations(data);
      } catch (loadError) {
        setError(
          getApiErrorMessage(
            loadError,
            "Unable to load organizations.",
          ),
        );
      }
    }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError("");

        const data =
          await superAdminService.getOrganizations();

        if (!cancelled) {
          setOrganizations(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(
              loadError,
              "Unable to load organizations.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh =
    async (): Promise<void> => {
      try {
        setIsRefreshing(true);
        setError("");
        await loadOrganizations();

        if (selectedOrganization) {
          const updated =
            await superAdminService.getOrganization(
              selectedOrganization.id,
            );

          setSelectedOrganization(
            updated,
          );
        }

        setSuccessMessage(
          "Platform data refreshed successfully.",
        );
      } catch (refreshError) {
        setError(
          getApiErrorMessage(
            refreshError,
            "Unable to refresh platform data.",
          ),
        );
      } finally {
        setIsRefreshing(false);
      }
    };

  const statistics = useMemo(() => {
    const active =
      organizations.filter(
        (organization) =>
          organization.status === "ACTIVE",
      ).length;

    const suspended =
      organizations.filter(
        (organization) =>
          organization.status === "SUSPENDED",
      ).length;

    const members =
      organizations.reduce(
        (total, organization) =>
          total +
          getOrganizationCount(
            organization,
            "memberships",
          ),
        0,
      );

    const products =
      organizations.reduce(
        (total, organization) =>
          total +
          getOrganizationCount(
            organization,
            "drugs",
          ),
        0,
      );

    return {
      total: organizations.length,
      active,
      suspended,
      members,
      products,
    };
  }, [organizations]);

  const openCreateOrganization =
    (): void => {
      setEditingOrganization(null);
      setOrganizationForm(
        emptyOrganizationForm,
      );
      setError("");
      setSuccessMessage("");
      setIsOrganizationModalOpen(true);
      setActiveMenu(null);
    };

  const openEditOrganization = (
    organization: Organization,
  ): void => {
    setEditingOrganization(
      organization,
    );

    setOrganizationForm({
      name: organization.name,
      type: organization.type,
      address:
        organization.address || "",
      phone: organization.phone || "",
      email: organization.email || "",
    });

    setError("");
    setSuccessMessage("");
    setIsOrganizationModalOpen(true);
    setActiveMenu(null);
  };

  const closeOrganizationModal =
    (): void => {
      if (isSaving) {
        return;
      }

      setIsOrganizationModalOpen(false);
      setEditingOrganization(null);
      setOrganizationForm(
        emptyOrganizationForm,
      );
    };

  const handleOrganizationSubmit =
    async (
      event: React.FormEvent,
    ): Promise<void> => {
      event.preventDefault();

      if (
        !organizationForm.name.trim()
      ) {
        setError(
          "Organization name is required.",
        );
        return;
      }

      try {
        setIsSaving(true);
        setError("");
        setSuccessMessage("");

        if (editingOrganization) {
          const updated =
            await superAdminService.updateOrganization(
              editingOrganization.id,
              {
                name:
                  organizationForm.name.trim(),
                type:
                  organizationForm.type,
                address:
                  organizationForm.address.trim(),
                phone:
                  organizationForm.phone.trim(),
                email:
                  organizationForm.email
                    .trim(),
              },
            );

          setOrganizations(
            (current) =>
              current.map(
                (organization) =>
                  organization.id ===
                  updated.id
                    ? {
                        ...organization,
                        ...updated,
                      }
                    : organization,
              ),
          );

          if (
            selectedOrganization?.id ===
            updated.id
          ) {
            setSelectedOrganization(
              updated,
            );
          }

          setSuccessMessage(
            "Organization updated successfully.",
          );
        } else {
          const created =
            await superAdminService.createOrganization(
              {
                name:
                  organizationForm.name.trim(),
                type:
                  organizationForm.type,
                address:
                  organizationForm.address.trim(),
                phone:
                  organizationForm.phone.trim(),
                email:
                  organizationForm.email
                    .trim(),
              },
            );

          setOrganizations(
            (current) => [
              created,
              ...current,
            ],
          );

          setSuccessMessage(
            "Organization created successfully.",
          );
        }

        setIsOrganizationModalOpen(
          false,
        );
      } catch (saveError) {
        setError(
          getApiErrorMessage(
            saveError,
            "Unable to save organization.",
          ),
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleOrganizationStatus =
    async (
      organization: Organization,
      action:
        | "activate"
        | "suspend",
    ): Promise<void> => {
      try {
        setError("");
        setSuccessMessage("");
        setActiveMenu(null);

        const updated =
          action === "activate"
            ? await superAdminService.activateOrganization(
                organization.id,
              )
            : await superAdminService.suspendOrganization(
                organization.id,
              );

        setOrganizations(
          (current) =>
            current.map(
              (item) =>
                item.id === updated.id
                  ? {
                      ...item,
                      ...updated,
                    }
                  : item,
            ),
        );

        if (
          selectedOrganization?.id ===
          updated.id
        ) {
          setSelectedOrganization(
            updated,
          );
        }

        setSuccessMessage(
          action === "activate"
            ? "Organization activated successfully."
            : "Organization suspended successfully.",
        );
      } catch (statusError) {
        setError(
          getApiErrorMessage(
            statusError,
            "Unable to update organization status.",
          ),
        );
      }
    };

  const openMembers = async (
    organization: Organization,
  ): Promise<void> => {
    try {
      setError("");
      setSuccessMessage("");
      setMemberOrganization(
        organization,
      );
      setIsMembersOpen(true);

      const organizationMembers =
        await superAdminService.getMembers(
          organization.id,
        );

      setMembers(
        organizationMembers,
      );
    } catch (memberError) {
      setError(
        getApiErrorMessage(
          memberError,
          "Unable to load organization members.",
        ),
      );
    }
  };

  const closeMembers = (): void => {
    if (isSaving) {
      return;
    }

    setIsMembersOpen(false);
    setMemberOrganization(null);
    setMembers([]);
    setMemberUserId("");
    setMemberRole("ADMIN");
  };

  const handleAddMember =
    async (): Promise<void> => {
      if (!memberOrganization) {
        return;
      }

      if (!memberUserId.trim()) {
        setError(
          "Enter the existing user's ID.",
        );
        return;
      }

      try {
        setIsSaving(true);
        setError("");
        setSuccessMessage("");

        await superAdminService.addMember(
          memberOrganization.id,
          {
            userId:
              memberUserId.trim(),
            role: memberRole,
          },
        );

        const refreshedMembers =
          await superAdminService.getMembers(
            memberOrganization.id,
          );

        setMembers(
          refreshedMembers,
        );

        await loadOrganizations();

        setMemberUserId("");
        setMemberRole("ADMIN");

        setSuccessMessage(
          "User added to the organization successfully.",
        );
      } catch (memberError) {
        setError(
          getApiErrorMessage(
            memberError,
            "Unable to add user to organization.",
          ),
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleMemberRoleChange =
    async (
      member: OrganizationMember,
      role: OrganizationMemberRole,
    ): Promise<void> => {
      if (!memberOrganization) {
        return;
      }

      try {
        setIsSaving(true);
        setError("");
        setSuccessMessage("");

        await superAdminService.updateMemberRole(
          memberOrganization.id,
          member.userId,
          { role },
        );

        const refreshedMembers =
          await superAdminService.getMembers(
            memberOrganization.id,
          );

        setMembers(
          refreshedMembers,
        );

        setSuccessMessage(
          "Member role updated successfully.",
        );
      } catch (roleError) {
        setError(
          getApiErrorMessage(
            roleError,
            "Unable to update member role.",
          ),
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleRemoveMember =
    async (
      member: OrganizationMember,
    ): Promise<void> => {
      if (!memberOrganization) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove ${member.name} from ${memberOrganization.name}?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        setIsSaving(true);
        setError("");
        setSuccessMessage("");

        await superAdminService.removeMember(
          memberOrganization.id,
          member.userId,
        );

        const refreshedMembers =
          await superAdminService.getMembers(
            memberOrganization.id,
          );

        setMembers(
          refreshedMembers,
        );

        await loadOrganizations();

        setSuccessMessage(
          "User removed from the organization successfully.",
        );
      } catch (removeError) {
        setError(
          getApiErrorMessage(
            removeError,
            "Unable to remove organization member.",
          ),
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleSelectOrganization =
    async (
      organization: Organization,
    ): Promise<void> => {
      try {
        setError("");
        setSuccessMessage("");

        const detailedOrganization =
          await superAdminService.getOrganization(
            organization.id,
          );

        setSelectedOrganization(
          detailedOrganization,
        );
      } catch (organizationError) {
        setError(
          getApiErrorMessage(
            organizationError,
            "Unable to load organization details.",
          ),
        );
      }
    };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-6 py-5 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo/logo.png"
                alt="PharmaTrack"
                className="h-14 w-auto max-w-44 object-contain"
              />

              <div className="border-l border-slate-200 pl-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-slate-700" />
                  <p className="text-sm font-semibold text-slate-500">
                    Platform Administration
                  </p>
                </div>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Super Admin Dashboard
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Welcome,{" "}
                  {userName ||
                    "Platform Administrator"}
                  . Manage PharmaTrack organizations and memberships.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleRefresh();
                }}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isRefreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={
                  openCreateOrganization
                }
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New Organization
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-7 lg:px-8">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Something went wrong
              </p>
              <p className="mt-0.5">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-md p-1 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Success
              </p>
              <p className="mt-0.5">
                {successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="rounded-md p-1 hover:bg-emerald-100"
              aria-label="Dismiss success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              <Building2 className="h-5 w-5" />
            }
            label="Total Organizations"
            value={statistics.total}
          />

          <StatCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Active Organizations"
            value={statistics.active}
          />

          <StatCard
            icon={
              <XCircle className="h-5 w-5" />
            }
            label="Suspended Organizations"
            value={statistics.suspended}
          />

          <StatCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Organization Members"
            value={statistics.members}
          />
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Organizations
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  All pharmacies and clinics registered on the platform.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Activity className="h-4 w-4" />
                Platform data
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-80 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <RefreshCw className="h-7 w-7 animate-spin" />
                  <p className="text-sm">
                    Loading organizations...
                  </p>
                </div>
              </div>
            ) : organizations.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <Building2 className="h-10 w-10 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-800">
                  No organizations yet
                </h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Create the first organization to begin managing the PharmaTrack platform.
                </p>

                <button
                  type="button"
                  onClick={
                    openCreateOrganization
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Create Organization
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Organization
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Type
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Members
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Products
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Created
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {organizations.map(
                      (organization) => (
                        <tr
                          key={
                            organization.id
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                void handleSelectOrganization(
                                  organization,
                                );
                              }}
                              className="group flex items-center gap-3 text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                <Building2 className="h-5 w-5" />
                              </div>

                              <div>
                                <p className="font-semibold text-slate-900 group-hover:text-slate-700">
                                  {
                                    organization.name
                                  }
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {organization.email ||
                                    "No email"}
                                </p>
                              </div>
                            </button>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {organizationTypeLabel(
                              organization.type,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                organization.status,
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  organization.status ===
                                  "ACTIVE"
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                                }`}
                              />
                              {organization.status ===
                              "ACTIVE"
                                ? "Active"
                                : "Suspended"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {getOrganizationCount(
                              organization,
                              "memberships",
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {getOrganizationCount(
                              organization,
                              "drugs",
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-500">
                            {formatDate(
                              organization.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="relative flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenu(
                                    (current) =>
                                      current ===
                                      organization.id
                                        ? null
                                        : organization.id,
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                aria-label={`Actions for ${organization.name}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeMenu ===
                                organization.id && (
                                <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditOrganization(
                                        organization,
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                    Edit organization
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      void openMembers(
                                        organization,
                                      );
                                      setActiveMenu(
                                        null,
                                      );
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Users className="h-4 w-4" />
                                    Manage members
                                  </button>

                                  {organization.status ===
                                  "ACTIVE" ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleOrganizationStatus(
                                          organization,
                                          "suspend",
                                        );
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Suspend
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleOrganizationStatus(
                                          organization,
                                          "activate",
                                        );
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      Activate
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <ClipboardList className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Platform Summary
                  </h3>
                  <p className="text-xs text-slate-500">
                    Current platform totals
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <SummaryRow
                  label="Organizations"
                  value={
                    statistics.total
                  }
                />

                <SummaryRow
                  label="Active"
                  value={
                    statistics.active
                  }
                />

                <SummaryRow
                  label="Suspended"
                  value={
                    statistics.suspended
                  }
                />

                <SummaryRow
                  label="Members"
                  value={
                    statistics.members
                  }
                />

                <SummaryRow
                  label="Products"
                  value={
                    statistics.products
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-slate-700" />

                <h3 className="font-bold text-slate-900">
                  Platform Security
                </h3>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <SecurityItem text="Super Admin authorization enabled" />
                <SecurityItem text="Organization-level data isolation" />
                <SecurityItem text="Organization membership roles" />
                <SecurityItem text="Organization management audit logs" />
              </div>
            </div>
          </aside>
        </section>
      </main>

      {selectedOrganization && (
        <OrganizationDetailPanel
          organization={
            selectedOrganization
          }
          onClose={() =>
            setSelectedOrganization(null)
          }
          onManageMembers={() => {
            void openMembers(
              selectedOrganization,
            );
          }}
        />
      )}

      {isOrganizationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingOrganization
                    ? "Edit Organization"
                    : "Create Organization"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingOrganization
                    ? "Update the organization's platform details."
                    : "Register a new pharmacy or clinic on PharmaTrack."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeOrganizationModal
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleOrganizationSubmit
              }
              className="space-y-5 px-6 py-6"
            >
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Organization Name
                </label>

                <input
                  type="text"
                  value={
                    organizationForm.name
                  }
                  onChange={(event) =>
                    setOrganizationForm(
                      (current) => ({
                        ...current,
                        name: event.target
                          .value,
                      }),
                    )
                  }
                  placeholder="e.g. Coast Care Pharmacy"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Organization Type
                  </label>

                  <select
                    value={
                      organizationForm.type
                    }
                    onChange={(event) =>
                      setOrganizationForm(
                        (current) => ({
                          ...current,
                          type: event.target
                            .value as OrganizationType,
                        }),
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="PHARMACY">
                      Pharmacy
                    </option>
                    <option value="CLINIC">
                      Clinic
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      value={
                        organizationForm.email
                      }
                      onChange={(event) =>
                        setOrganizationForm(
                          (current) => ({
                            ...current,
                            email:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="organization@example.com"
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Phone
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="tel"
                      value={
                        organizationForm.phone
                      }
                      onChange={(event) =>
                        setOrganizationForm(
                          (current) => ({
                            ...current,
                            phone:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="+254..."
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Address
                  </label>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={
                        organizationForm.address
                      }
                      onChange={(event) =>
                        setOrganizationForm(
                          (current) => ({
                            ...current,
                            address:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="Location"
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeOrganizationModal
                  }
                  disabled={isSaving}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {editingOrganization
                    ? "Save Changes"
                    : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMembersOpen &&
        memberOrganization && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Organization Members
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {
                      memberOrganization.name
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeMembers
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Existing User ID
                    </label>

                    <input
                      type="text"
                      value={
                        memberUserId
                      }
                      onChange={(event) =>
                        setMemberUserId(
                          event.target.value,
                        )
                      }
                      placeholder="Paste the user's ID"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Role
                    </label>

                    <select
                      value={
                        memberRole
                      }
                      onChange={(event) =>
                        setMemberRole(
                          event.target
                            .value as OrganizationMemberRole,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="ADMIN">
                        Admin
                      </option>
                      <option value="PHARMACIST">
                        Pharmacist
                      </option>
                      <option value="CLINICIAN">
                        Clinician
                      </option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        void handleAddMember();
                      }}
                      disabled={
                        isSaving ||
                        !memberUserId.trim()
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Only existing non-Super-Admin users can be added to an organization.
                </p>
              </div>

              <div className="p-6">
                {members.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center text-center">
                    <Users className="h-9 w-9 text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-700">
                      No members found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add an existing user to this organization.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="pb-3 pr-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            User
                          </th>
                          <th className="pb-3 pr-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Role
                          </th>
                          <th className="pb-3 pr-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Verification
                          </th>
                          <th className="pb-3 pr-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Joined
                          </th>
                          <th className="pb-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {members.map(
                          (member) => (
                            <tr
                              key={
                                member.id
                              }
                            >
                              <td className="py-4 pr-5">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {
                                      member.name
                                    }
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {
                                      member.email
                                    }
                                  </p>
                                </div>
                              </td>

                              <td className="py-4 pr-5">
                                <select
                                  value={
                                    member.role
                                  }
                                  disabled={
                                    isSaving
                                  }
                                  onChange={(
                                    event,
                                  ) => {
                                    void handleMemberRoleChange(
                                      member,
                                      event.target
                                        .value as OrganizationMemberRole,
                                    );
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-500"
                                >
                                  <option value="ADMIN">
                                    Admin
                                  </option>
                                  <option value="PHARMACIST">
                                    Pharmacist
                                  </option>
                                  <option value="CLINICIAN">
                                    Clinician
                                  </option>
                                </select>
                              </td>

                              <td className="py-4 pr-5">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    member.isVerified
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {member.isVerified ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Verified
                                    </>
                                  ) : (
                                    "Pending"
                                  )}
                                </span>
                              </td>

                              <td className="py-4 pr-5 text-sm text-slate-500">
                                {formatDate(
                                  member.createdAt,
                                )}
                              </td>

                              <td className="py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleRemoveMember(
                                      member,
                                    );
                                  }}
                                  disabled={
                                    isSaving
                                  }
                                  className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

const StatCard: React.FC<
  StatCardProps
> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value.toLocaleString()}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
};

interface SummaryRowProps {
  label: string;
  value: number;
}

const SummaryRow: React.FC<
  SummaryRowProps
> = ({
  label,
  value,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-bold text-slate-900">
        {value.toLocaleString()}
      </span>
    </div>
  );
};

const SecurityItem: React.FC<{
  text: string;
}> = ({ text }) => {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      <span>{text}</span>
    </div>
  );
};

interface OrganizationDetailPanelProps {
  organization: Organization;
  onClose: () => void;
  onManageMembers: () => void;
}

const OrganizationDetailPanel: React.FC<
  OrganizationDetailPanelProps
> = ({
  organization,
  onClose,
  onManageMembers,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Organization Details
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {organization.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close organization details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-700" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {organizationTypeLabel(
                    organization.type,
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  Created{" "}
                  {formatDate(
                    organization.createdAt,
                  )}
                </p>
              </div>
            </div>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                organization.status,
              )}`}
            >
              {organization.status ===
              "ACTIVE"
                ? "Active"
                : "Suspended"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem
              icon={
                <Mail className="h-4 w-4" />
              }
              label="Email"
              value={
                organization.email ||
                "Not provided"
              }
            />

            <DetailItem
              icon={
                <Phone className="h-4 w-4" />
              }
              label="Phone"
              value={
                organization.phone ||
                "Not provided"
              }
            />

            <DetailItem
              icon={
                <MapPin className="h-4 w-4" />
              }
              label="Address"
              value={
                organization.address ||
                "Not provided"
              }
            />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Organization Data
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DetailMetric
                label="Members"
                value={getOrganizationCount(
                  organization,
                  "memberships",
                )}
              />

              <DetailMetric
                label="Products"
                value={getOrganizationCount(
                  organization,
                  "drugs",
                )}
              />

              <DetailMetric
                label="Patients"
                value={getOrganizationCount(
                  organization,
                  "patients",
                )}
              />

              <DetailMetric
                label="Suppliers"
                value={getOrganizationCount(
                  organization,
                  "suppliers",
                )}
              />

              <DetailMetric
                label="Transactions"
                value={getOrganizationCount(
                  organization,
                  "transactions",
                )}
              />

              <DetailMetric
                label="Adjustments"
                value={
                  organization._count
                    ?.stockAdjustments ??
                  0
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onManageMembers}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-700" />

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Manage Members
                </p>
                <p className="text-xs text-slate-500">
                  Manage organization roles and access.
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
};

const DetailMetric: React.FC<{
  label: string;
  value: number;
}> = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
};

export default SuperAdminDashboard;