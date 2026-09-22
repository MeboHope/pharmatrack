import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Database,
  Hospital,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { SuperAdminLayout } from "./SuperAdminLayout";

import type {
  SuperAdminSection,
} from "./SuperAdminSidebar";

import {
  superAdminService,
  type Organization,
  type OrganizationMember,
  type OrganizationInvitation,
  type PlatformUser,
  type SuperAdminAuditLog,
  type SystemStatus,
  type OrganizationType as ServiceOrganizationType,
  type OrganizationStatus as ServiceOrganizationStatus,
  type OrganizationRole as ServiceOrganizationRole,
} from "../services/superAdmin";

interface SuperAdminDashboardProps {
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;

  userName?: string;

  onLogout?: () => void | Promise<void>;
}

type OrganizationType = ServiceOrganizationType;
type OrganizationStatus = ServiceOrganizationStatus;
type MemberRole = ServiceOrganizationRole;

interface OrganizationFormState {
  name: string;
  type: OrganizationType;
  address: string;
  phone: string;
  email: string;
}

interface MemberFormState {
  userId: string;
  role: MemberRole;
}

interface InvitationFormState {
  name: string;
  email: string;
  phone: string;
}

const emptyOrganizationForm: OrganizationFormState = {
  name: "",
  type: "PHARMACY",
  address: "",
  phone: "",
  email: "",
};

const emptyMemberForm: MemberFormState = {
  userId: "",
  role: "ADMIN",
};

const emptyInvitationForm: InvitationFormState = {
  name: "",
  email: "",
  phone: "",
};

function formatDate(value?: string | Date | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatOrganizationType(type: string) {
  return type === "CLINIC" ? "Clinic" : "Pharmacy";
}

function formatRole(role?: string | null) {
  if (!role) return "—";

  switch (role) {
    case "SUPER_ADMIN":
      return "Super Administrator";

    case "ADMIN":
      return "Administrator";

    case "PHARMACIST":
      return "Pharmacist";

    case "CLINICIAN":
      return "Clinician";

    default:
      return role.replace(/_/g, " ");
  }
}

function formatAction(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatEntity(entity: string) {
  return entity
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "—";
  }

  const totalSeconds = Math.floor(seconds);

  const days = Math.floor(
    totalSeconds / 86400,
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getUserInitials(name?: string) {
  if (!name) return "U";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

function getStatusClasses(
  status?: string,
) {
  switch (status) {
    case "OPERATIONAL":
    case "ACTIVE":
    case "Verified":
      return "bg-emerald-50 text-emerald-700";

    case "DEGRADED":
      return "bg-amber-50 text-amber-700";

    case "DOWN":
    case "SUSPENDED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusDotClasses(
  status?: string,
) {
  switch (status) {
    case "OPERATIONAL":
      return "bg-emerald-500";

    case "DEGRADED":
      return "bg-amber-500";

    case "DOWN":
      return "bg-red-500";

    default:
      return "bg-slate-400";
  }
}

function getSystemStatusLabel(
  status?: string,
) {
  switch (status) {
    case "OPERATIONAL":
      return "Operational";

    case "DEGRADED":
      return "Degraded";

    case "DOWN":
      return "Down";

    default:
      return "Unknown";
  }
}

function getAuditLogDescription(
  log: SuperAdminAuditLog,
) {
  if (log.details) {
    return log.details;
  }

  return `${formatAction(log.action)} on ${formatEntity(log.entity)}.`;
}

export function SuperAdminDashboard({
  currentUser,
  userName,
  onLogout,
}: SuperAdminDashboardProps) {
  const [activeSection, setActiveSection] =
    useState<SuperAdminSection>(
      "dashboard",
    );

  const [organizations, setOrganizations] =
    useState<Organization[]>([]);

  const [platformUsers, setPlatformUsers] =
    useState<PlatformUser[]>([]);

  const [
    selectedOrganization,
    setSelectedOrganization,
  ] = useState<Organization | null>(null);

  const [
    organizationMembers,
    setOrganizationMembers,
  ] = useState<OrganizationMember[]>([]);

  const [
    organizationSearch,
    setOrganizationSearch,
  ] = useState("");

  const [userSearch, setUserSearch] =
    useState("");

  const [
    organizationLoading,
    setOrganizationLoading,
  ] = useState(false);

  const [usersLoading, setUsersLoading] =
    useState(false);

  const [membersLoading, setMembersLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    organizationModalOpen,
    setOrganizationModalOpen,
  ] = useState(false);

  const [
    editingOrganization,
    setEditingOrganization,
  ] = useState<Organization | null>(null);

  const [
    organizationForm,
    setOrganizationForm,
  ] = useState<OrganizationFormState>(
    emptyOrganizationForm,
  );

  const [
    memberModalOpen,
    setMemberModalOpen,
  ] = useState(false);

  const [memberForm, setMemberForm] =
    useState<MemberFormState>(
      emptyMemberForm,
    );

  const [memberSearch, setMemberSearch] =
    useState("");

  const [invitationModalOpen, setInvitationModalOpen] =
    useState(false);

  const [invitationForm, setInvitationForm] =
    useState<InvitationFormState>(
      emptyInvitationForm,
    );

  const [organizationInvitations, setOrganizationInvitations] =
    useState<OrganizationInvitation[]>([]);

  const [invitationsLoading, setInvitationsLoading] =
    useState(false);

  /* ============================================================
     AUDIT LOG STATE
     ============================================================ */

  const [auditLogs, setAuditLogs] =
    useState<SuperAdminAuditLog[]>([]);

  const [
    auditPagination,
    setAuditPagination,
  ] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [
    auditLoading,
    setAuditLoading,
  ] = useState(false);

  const [
    auditError,
    setAuditError,
  ] = useState("");

  const [
    auditSearch,
    setAuditSearch,
  ] = useState("");

  const [
    auditAction,
    setAuditAction,
  ] = useState("");

  const [
    auditEntity,
    setAuditEntity,
  ] = useState("");

  const [
    auditOrganizationId,
    setAuditOrganizationId,
  ] = useState("");

  const [auditUserId, setAuditUserId] =
    useState("");

  const [auditFrom, setAuditFrom] =
    useState("");

  const [auditTo, setAuditTo] =
    useState("");

  const [
    selectedAuditLog,
    setSelectedAuditLog,
  ] = useState<SuperAdminAuditLog | null>(
    null,
  );

  /* ============================================================
     SYSTEM STATUS STATE
     ============================================================ */

  const [
    systemStatus,
    setSystemStatus,
  ] = useState<SystemStatus | null>(null);

  const [
    systemStatusLoading,
    setSystemStatusLoading,
  ] = useState(false);

  const [
    systemStatusError,
    setSystemStatusError,
  ] = useState("");

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  /* ============================================================
     ORGANIZATIONS
     ============================================================ */

  const loadOrganizations =
    useCallback(async () => {
      setOrganizationLoading(true);

      try {
        const data =
          await superAdminService.getOrganizations();

        setOrganizations(data || []);
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Unable to load organizations.",
          ),
        );
      } finally {
        setOrganizationLoading(false);
      }
    }, []);

  /* ============================================================
     PLATFORM USERS
     ============================================================ */

  const loadUsers = useCallback(
    async () => {
      setUsersLoading(true);

      try {
        const data =
          await superAdminService.getUsers({
            search:
              userSearch.trim() ||
              undefined,
          });

        setPlatformUsers(data || []);
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Unable to load platform users.",
          ),
        );
      } finally {
        setUsersLoading(false);
      }
    },
    [userSearch],
  );

  /* ============================================================
     ORGANIZATION MEMBERS
     ============================================================ */

  const loadMembers = useCallback(
    async (organizationId: string) => {
      setMembersLoading(true);

      try {
        const data =
          await superAdminService.getOrganizationMembers(
            organizationId,
          );

        setOrganizationMembers(data || []);
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Unable to load organization members.",
          ),
        );
      } finally {
        setMembersLoading(false);
      }
    },
    [],
  );

  const loadInvitations = useCallback(
    async (organizationId: string) => {
      setInvitationsLoading(true);

      try {
        const data =
          await superAdminService.getOrganizationInvitations(
            organizationId,
          );

        setOrganizationInvitations(data || []);
      } catch (loadError) {
        setOrganizationInvitations([]);
        setError(
          getErrorMessage(
            loadError,
            "Unable to load organization invitations.",
          ),
        );
      } finally {
        setInvitationsLoading(false);
      }
    },
    [],
  );

  /* ============================================================
     AUDIT LOGS
     ============================================================ */

  const loadAuditLogs = useCallback(
    async (
      requestedPage = auditPagination.page,
    ) => {
      setAuditLoading(true);
      setAuditError("");

      try {
        const result =
          await superAdminService.getAuditLogs({
            page: requestedPage,
            limit: auditPagination.limit,
            search:
              auditSearch.trim() ||
              undefined,
            action:
              auditAction.trim() ||
              undefined,
            entity:
              auditEntity.trim() ||
              undefined,
            organizationId:
              auditOrganizationId ||
              undefined,
            userId:
              auditUserId ||
              undefined,
            from:
              auditFrom ||
              undefined,
            to:
              auditTo ||
              undefined,
          });

        setAuditLogs(result.logs || []);
        setAuditPagination(
          result.pagination,
        );
      } catch (loadError) {
        setAuditLogs([]);
        setAuditError(
          getErrorMessage(
            loadError,
            "Unable to load platform audit logs.",
          ),
        );
      } finally {
        setAuditLoading(false);
      }
    },
    [
      auditAction,
      auditEntity,
      auditFrom,
      auditOrganizationId,
      auditPagination.limit,
      auditPagination.page,
      auditSearch,
      auditTo,
      auditUserId,
    ],
  );

  /* ============================================================
     SYSTEM STATUS
     ============================================================ */

  const loadSystemStatus =
    useCallback(async () => {
      setSystemStatusLoading(true);
      setSystemStatusError("");

      try {
        const status =
          await superAdminService.getSystemStatus();

        setSystemStatus(status);
      } catch (loadError) {
        setSystemStatus(null);
        setSystemStatusError(
          getErrorMessage(
            loadError,
            "Unable to retrieve system status.",
          ),
        );
      } finally {
        setSystemStatusLoading(false);
      }
    }, []);

  /* ============================================================
     INITIAL DATA
     ============================================================ */

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (
      activeSection === "users" ||
      activeSection === "dashboard"
    ) {
      void loadUsers();
    }
  }, [
    activeSection,
    loadUsers,
  ]);

  useEffect(() => {
    if (
      selectedOrganization?.id
    ) {
      void loadMembers(
        selectedOrganization.id,
      );
      void loadInvitations(
        selectedOrganization.id,
      );
    } else {
      setOrganizationMembers([]);
      setOrganizationInvitations([]);
    }
  }, [
    selectedOrganization,
    loadInvitations,
    loadMembers,
  ]);

  useEffect(() => {
    if (
      activeSection === "audit-logs"
    ) {
      void loadAuditLogs(1);
    }
  }, [
    activeSection,
    loadAuditLogs,
  ]);

  useEffect(() => {
    if (
      activeSection === "system-status"
    ) {
      void loadSystemStatus();
    }
  }, [
    activeSection,
    loadSystemStatus,
  ]);

  /* ============================================================
     FILTERED DATA
     ============================================================ */

  const filteredOrganizations =
    useMemo(() => {
      const search =
        organizationSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return organizations;
      }

      return organizations.filter(
        (organization) =>
          organization.name
            .toLowerCase()
            .includes(search) ||
          organization.type
            .toLowerCase()
            .includes(search) ||
          organization.status
            .toLowerCase()
            .includes(search) ||
          organization.email
            ?.toLowerCase()
            .includes(search),
      );
    }, [
      organizationSearch,
      organizations,
    ]);

  const filteredMemberUsers =
    useMemo(() => {
      const existingIds =
        new Set(
          organizationMembers.map(
            (member) =>
              member.userId,
          ),
        );

      const search =
        memberSearch
          .trim()
          .toLowerCase();

      return platformUsers.filter(
        (user) => {
          if (
            existingIds.has(
              user.id,
            )
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          return (
            user.name
              .toLowerCase()
              .includes(search) ||
            user.email
              .toLowerCase()
              .includes(search)
          );
        },
      );
    }, [
      memberSearch,
      organizationMembers,
      platformUsers,
    ]);

  const activeOrganizations =
    organizations.filter(
      (organization) =>
        organization.status ===
        "ACTIVE",
    ).length;

  const suspendedOrganizations =
    organizations.filter(
      (organization) =>
        organization.status ===
        "SUSPENDED",
    ).length;

  const pharmacyCount =
    organizations.filter(
      (organization) =>
        organization.type ===
        "PHARMACY",
    ).length;

  const clinicCount =
    organizations.filter(
      (organization) =>
        organization.type ===
        "CLINIC",
    ).length;

  /* ============================================================
     ORGANIZATION ACTIONS
     ============================================================ */

  const openOrganizationModal = (
    organization?: Organization,
  ) => {
    clearMessages();

    if (organization) {
      setEditingOrganization(
        organization,
      );

      setOrganizationForm({
        name:
          organization.name || "",
        type:
          organization.type ===
          "CLINIC"
            ? "CLINIC"
            : "PHARMACY",
        address:
          organization.address ||
          "",
        phone:
          organization.phone ||
          "",
        email:
          organization.email ||
          "",
      });
    } else {
      setEditingOrganization(
        null,
      );

      setOrganizationForm({
        ...emptyOrganizationForm,
      });
    }

    setOrganizationModalOpen(
      true,
    );
  };

  const handleOrganizationSubmit =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();
      clearMessages();

      const name =
        organizationForm.name.trim();

      if (!name) {
        setError(
          "Organization name is required.",
        );
        return;
      }

      setActionLoading(true);

      try {
        if (editingOrganization) {
          await superAdminService.updateOrganization(
            editingOrganization.id,
            organizationForm,
          );

          setSuccess(
            "Organization updated successfully.",
          );
        } else {
          const createdOrganization =
            await superAdminService.createOrganization(
              organizationForm,
            );

          setSelectedOrganization(
            createdOrganization,
          );
          setInvitationForm({
            ...emptyInvitationForm,
          });
          setSuccess(
            "Organization created successfully. Invite its initial Administrator to complete onboarding.",
          );
        }

        setOrganizationModalOpen(
          false,
        );

        await loadOrganizations();

        if (!editingOrganization) {
          setInvitationModalOpen(true);
        }
      } catch (submitError) {
        setError(
          getErrorMessage(
            submitError,
            "Unable to save organization.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  const handleOrganizationStatus =
    async (
      organization: Organization,
      status: OrganizationStatus,
    ) => {
      clearMessages();
      setActionLoading(true);

      try {
        if (status === "ACTIVE") {
          await superAdminService.activateOrganization(
            organization.id,
          );

          setSuccess(
            `${organization.name} has been activated.`,
          );
        } else {
          await superAdminService.suspendOrganization(
            organization.id,
          );

          setSuccess(
            `${organization.name} has been suspended.`,
          );
        }

        await loadOrganizations();

        if (
          selectedOrganization?.id ===
          organization.id
        ) {
          setSelectedOrganization(
            (previous) =>
              previous
                ? {
                    ...previous,
                    status,
                  }
                : null,
          );
        }
      } catch (statusError) {
        setError(
          getErrorMessage(
            statusError,
            "Unable to update organization status.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* ============================================================
     ORGANIZATION INVITATION ACTIONS
     ============================================================ */

  const openInvitationModal = (
    organization?: Organization,
  ) => {
    clearMessages();

    if (organization) {
      setSelectedOrganization(organization);
    }

    setInvitationForm({
      ...emptyInvitationForm,
    });
    setInvitationModalOpen(true);
  };

  const handleSendInvitation = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    clearMessages();

    if (!selectedOrganization) {
      setError("Select an organization first.");
      return;
    }

    const name = invitationForm.name.trim();
    const email = invitationForm.email.trim().toLowerCase();

    if (!name) {
      setError("Administrator name is required.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError("Enter a valid administrator email address.");
      return;
    }

    if (selectedOrganization.status === "SUSPENDED") {
      setError("A suspended organization cannot receive invitations.");
      return;
    }

    setActionLoading(true);

    try {
      await superAdminService.createOrganizationInvitation(
        selectedOrganization.id,
        {
          name,
          email,
          phone: invitationForm.phone.trim() || undefined,
          role: "ADMIN",
        },
      );

      setSuccess(
        `Administrator invitation sent to ${email}.`,
      );
      setInvitationModalOpen(false);
      setInvitationForm({
        ...emptyInvitationForm,
      });
      await loadInvitations(selectedOrganization.id);
      await loadMembers(selectedOrganization.id);
    } catch (invitationError) {
      setError(
        getErrorMessage(
          invitationError,
          "Unable to send administrator invitation.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvitation = async (
    invitation: OrganizationInvitation,
  ) => {
    if (!selectedOrganization) {
      return;
    }

    clearMessages();

    const confirmed = window.confirm(
      `Revoke the invitation for ${invitation.name} (${invitation.email})?`,
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      await superAdminService.revokeOrganizationInvitation(
        selectedOrganization.id,
        invitation.id,
      );

      setSuccess(
        "Organization invitation revoked successfully.",
      );
      await loadInvitations(selectedOrganization.id);
    } catch (revokeError) {
      setError(
        getErrorMessage(
          revokeError,
          "Unable to revoke organization invitation.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* ============================================================
     MEMBER ACTIONS
     ============================================================ */

  const openMemberModal = (
    organization: Organization,
  ) => {
    clearMessages();

    setSelectedOrganization(
      organization,
    );

    setMemberForm({
      ...emptyMemberForm,
    });

    setMemberSearch("");
    setMemberModalOpen(true);
  };

  const handleAddMember = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    clearMessages();

    if (!selectedOrganization) {
      setError(
        "Select an organization first.",
      );
      return;
    }

    if (!memberForm.userId) {
      setError(
        "Select a platform user.",
      );
      return;
    }

    setActionLoading(true);

    try {
      await superAdminService.addOrganizationMember(
        selectedOrganization.id,
        {
          userId:
            memberForm.userId,
          role: memberForm.role,
        },
      );

      setSuccess(
        "User added to the organization successfully.",
      );

      setMemberModalOpen(
        false,
      );

      await loadMembers(
        selectedOrganization.id,
      );
    } catch (memberError) {
      setError(
        getErrorMessage(
          memberError,
          "Unable to add organization member.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleMemberRoleChange =
    async (
      member: OrganizationMember,
      role: MemberRole,
    ) => {
      if (!selectedOrganization) {
        return;
      }

      clearMessages();
      setActionLoading(true);

      try {
        await superAdminService.updateOrganizationMember(
          selectedOrganization.id,
          member.userId,
          { role },
        );

        setSuccess(
          "Member role updated successfully.",
        );

        await loadMembers(
          selectedOrganization.id,
        );
      } catch (roleError) {
        setError(
          getErrorMessage(
            roleError,
            "Unable to update member role.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  const handleRemoveMember =
    async (
      member: OrganizationMember,
    ) => {
      if (!selectedOrganization) {
        return;
      }

      clearMessages();

      const confirmed =
        window.confirm(
          `Remove ${
            member.user?.name ||
            member.user?.email ||
            "this user"
          } from ${
            selectedOrganization.name
          }?`,
        );

      if (!confirmed) {
        return;
      }

      setActionLoading(true);

      try {
        await superAdminService.removeOrganizationMember(
          selectedOrganization.id,
          member.userId,
        );

        setSuccess(
          "User removed from the organization.",
        );

        await loadMembers(
          selectedOrganization.id,
        );
      } catch (removeError) {
        setError(
          getErrorMessage(
            removeError,
            "Unable to remove organization member.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* ============================================================
     STAT CARD
     ============================================================ */

  const renderStatCard = ({
    label,
    value,
    icon: Icon,
    detail,
  }: {
    label: string;
    value: number;
    icon: React.ComponentType<{
      size?: number;
      strokeWidth?: number;
    }>;
    detail: string;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {detail}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
          <Icon
            size={21}
            strokeWidth={1.9}
          />
        </div>
      </div>
    </div>
  );

  /* ============================================================
     DASHBOARD
     ============================================================ */

  const renderDashboard = () => (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-2xl bg-[#22577A] p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              <ShieldCheck size={14} />
              Platform Control Center
            </div>

            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back
              {(currentUser?.name ||
                userName)
                ? `, ${
                    (
                      currentUser?.name ||
                      userName ||
                      ""
                    ).split(" ")[0]
                  }`
                : ""}
              .
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Manage PharmaTrack organizations,
              platform users, and system-level
              administration from one secure
              workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              clearMessages();
              void loadOrganizations();
              void loadUsers();

              if (
                activeSection ===
                "system-status"
              ) {
                void loadSystemStatus();
              }

              if (
                activeSection ===
                "audit-logs"
              ) {
                void loadAuditLogs(1);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#22577A] shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh platform
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {renderStatCard({
          label: "Organizations",
          value:
            organizations.length,
          icon: Building2,
          detail:
            "Registered pharmacies and clinics",
        })}

        {renderStatCard({
          label: "Active",
          value:
            activeOrganizations,
          icon: CheckCircle2,
          detail:
            "Currently operating organizations",
        })}

        {renderStatCard({
          label: "Suspended",
          value:
            suspendedOrganizations,
          icon: XCircle,
          detail:
            "Organizations currently suspended",
        })}

        {renderStatCard({
          label: "Pharmacies",
          value: pharmacyCount,
          icon: Building2,
          detail:
            "Pharmacy organizations",
        })}

        {renderStatCard({
          label: "Clinics",
          value: clinicCount,
          icon: Hospital,
          detail:
            "Clinic organizations",
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Organizations
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Recent platform organizations
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "organizations",
                )
              }
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#22577A] hover:underline"
            >
              View all
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {organizations
              .slice(0, 5)
              .map(
                (
                  organization,
                ) => (
                  <button
                    key={
                      organization.id
                    }
                    type="button"
                    onClick={() => {
                      setSelectedOrganization(
                        organization,
                      );

                      setActiveSection(
                        "organizations",
                      );
                    }}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
                      {organization.type ===
                      "CLINIC" ? (
                        <Stethoscope
                          size={19}
                        />
                      ) : (
                        <Building2
                          size={19}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {
                          organization.name
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatOrganizationType(
                          organization.type,
                        )}
                      </p>
                    </div>

                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                        organization.status ===
                        "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {
                        organization.status
                      }
                    </span>
                  </button>
                ),
              )}

            {organizations.length ===
              0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No organizations have been registered yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Platform Users
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Users across the platform
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "users",
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22577A] hover:underline"
            >
              Manage
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {platformUsers
              .slice(0, 5)
              .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                    {getUserInitials(
                      user.name,
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  <span
                    className={[
                      "hidden rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide sm:inline-flex",
                      user.isVerified
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {user.isVerified
                      ? "Verified"
                      : "Pending"}
                  </span>
                </div>
              ))}

            {platformUsers.length ===
              0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No platform users found.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  /* ============================================================
     ORGANIZATIONS
     ============================================================ */

  const renderOrganizations = () => (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
              <Building2 size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Organizations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage pharmacies and clinics registered on PharmaTrack.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            openOrganizationModal()
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B4865]"
        >
          <Plus size={17} />
          Create organization
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{success}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Organization directory
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {filteredOrganizations.length} organization
              {filteredOrganizations.length === 1
                ? ""
                : "s"} shown
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={
                organizationSearch
              }
              onChange={(event) =>
                setOrganizationSearch(
                  event.target.value,
                )
              }
              placeholder="Search organizations..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
            />
          </div>
        </div>

        {organizationLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading organizations...
            </div>
          </div>
        ) : filteredOrganizations.length ===
          0 ? (
          <div className="p-12 text-center">
            <Building2
              size={32}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No organizations found
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Create an organization or adjust your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Organization
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Members
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Patients
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Transactions
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOrganizations.map(
                  (organization) => (
                    <tr
                      key={
                        organization.id
                      }
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
                            {organization.type ===
                            "CLINIC" ? (
                              <Stethoscope
                                size={18}
                              />
                            ) : (
                              <Building2
                                size={18}
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {
                                organization.name
                              }
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {organization.email ||
                                organization.phone ||
                                "No contact information"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-medium text-slate-600">
                        {formatOrganizationType(
                          organization.type,
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        {organization.memberships ??
                          organization._count
                            ?.memberships ??
                          0}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        {organization.patients ??
                          organization._count
                            ?.patients ??
                          0}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        {organization.transactions ??
                          organization._count
                            ?.transactions ??
                          0}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                            getStatusClasses(
                              organization.status,
                            ),
                          ].join(" ")}
                        >
                          {
                            organization.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrganization(
                                organization,
                              );

                              void loadMembers(
                                organization.id,
                              );
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Members
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openOrganizationModal(
                                organization,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Pencil
                              size={13}
                            />
                            Edit
                          </button>

                          {organization.status ===
                          "ACTIVE" ? (
                            <button
                              type="button"
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                void handleOrganizationStatus(
                                  organization,
                                  "SUSPENDED",
                                )
                              }
                              className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                void handleOrganizationStatus(
                                  organization,
                                  "ACTIVE",
                                )
                              }
                              className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              Activate
                            </button>
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
      </section>

      {selectedOrganization && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
                  {selectedOrganization.type ===
                  "CLINIC" ? (
                    <Stethoscope
                      size={19}
                    />
                  ) : (
                    <Building2
                      size={19}
                    />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {
                      selectedOrganization.name
                    }
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Organization members and roles
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={[
                  "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                  getStatusClasses(
                    selectedOrganization.status,
                  ),
                ].join(" ")}
              >
                {
                  selectedOrganization.status
                }
              </span>

              <button
                type="button"
                onClick={() =>
                  openInvitationModal(
                    selectedOrganization,
                  )
                }
                disabled={selectedOrganization.status === "SUSPENDED"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#22577A]/20 bg-[#22577A]/5 px-3.5 py-2 text-xs font-semibold text-[#22577A] hover:bg-[#22577A]/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail size={14} />
                Invite administrator
              </button>

              <button
                type="button"
                onClick={() =>
                  openMemberModal(
                    selectedOrganization,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#22577A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1B4865]"
              >
                <Plus size={14} />
                Add member
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrganization(
                    null,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
                Close
              </button>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-200 p-5 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Type
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {formatOrganizationType(
                  selectedOrganization.type,
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Members
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {selectedOrganization.memberships ??
                  selectedOrganization
                    ._count
                    ?.memberships ??
                  organizationMembers.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Drugs
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {selectedOrganization.drugs ??
                  selectedOrganization
                    ._count
                    ?.drugs ??
                  0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Patients
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {selectedOrganization.patients ??
                  selectedOrganization
                    ._count
                    ?.patients ??
                  0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Transactions
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {selectedOrganization.transactions ??
                  selectedOrganization
                    ._count
                    ?.transactions ??
                  0}
              </p>
            </div>
          </div>

          {membersLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading members...
              </div>
            </div>
          ) : organizationMembers.length ===
            0 ? (
            <div className="p-10 text-center">
              <Users
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No members found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Add the organization's Administrator or another team member.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Member
                    </th>

                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Role
                    </th>

                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Verification
                    </th>

                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Joined
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {organizationMembers.map(
                    (member) => (
                      <tr
                        key={
                          member.id
                        }
                        className="hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                              {getUserInitials(
                                member.name,
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {
                                  member.name
                                }
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {
                                  member.email
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="relative inline-flex">
                            <select
                              value={
                                member.role
                              }
                              disabled={
                                actionLoading
                              }
                              onChange={(
                                event,
                              ) =>
                                void handleMemberRoleChange(
                                  member,
                                  event
                                    .target
                                    .value as MemberRole,
                                )
                              }
                              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10 disabled:opacity-50"
                            >
                              <option value="ADMIN">
                                Administrator
                              </option>

                              <option value="PHARMACIST">
                                Pharmacist
                              </option>

                              <option value="CLINICIAN">
                                Clinician
                              </option>
                            </select>

                            <ChevronDown
                              size={13}
                              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                              member.isVerified
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700",
                            ].join(" ")}
                          >
                            {member.isVerified
                              ? "Verified"
                              : "Pending"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {formatDate(
                            member.joinedAt,
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            disabled={
                              actionLoading
                            }
                            onClick={() =>
                              void handleRemoveMember(
                                member,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
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

          <div className="border-t border-slate-200 p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Organization invitations
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Track invitations sent to administrators and other organization users.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openInvitationModal(selectedOrganization)}
                disabled={selectedOrganization.status === "SUSPENDED"}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail size={14} />
                Invite administrator
              </button>
            </div>

            {invitationsLoading ? (
              <div className="flex min-h-20 items-center justify-center text-xs text-slate-500">
                <Loader2 size={15} className="mr-2 animate-spin" />
                Loading invitations...
              </div>
            ) : organizationInvitations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
                No invitations have been sent for this organization yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Invitee</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Role</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Expires</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {organizationInvitations.map((invitation) => {
                      const expired = new Date(invitation.expiresAt).getTime() <= Date.now();
                      const accepted = Boolean(invitation.acceptedAt);
                      const revoked = Boolean(invitation.revokedAt);
                      const status = accepted
                        ? "Accepted"
                        : revoked
                          ? "Revoked"
                          : expired
                            ? "Expired"
                            : "Pending";

                      return (
                        <tr key={invitation.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">{invitation.name}</p>
                            <p className="text-xs text-slate-500">{invitation.email}</p>
                            {invitation.phone && (
                              <p className="text-[11px] text-slate-400">{invitation.phone}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                            {formatRole(invitation.role)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={[
                              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                              status === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : status === "Accepted"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600",
                            ].join(" ")}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDateTime(invitation.expiresAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!accepted && !revoked && !expired ? (
                              <button
                                type="button"
                                onClick={() => void handleRevokeInvitation(invitation)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <XCircle size={13} />
                                Revoke
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );

  /* ============================================================
     PLATFORM USERS
     ============================================================ */

  const renderUsers = () => (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
              <Users size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Platform Users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View users and their organization memberships across PharmaTrack.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            clearMessages();
            void loadUsers();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh users
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{success}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Platform directory
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {platformUsers.length} user
              {platformUsers.length ===
              1
                ? ""
                : "s"} returned
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={userSearch}
              onChange={(event) =>
                setUserSearch(
                  event.target.value,
                )
              }
              placeholder="Search name or email..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
            />
          </div>
        </div>

        {usersLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading platform users...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    User
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    System role
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Organizations
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Verification
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {platformUsers.map(
                  (user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                            {getUserInitials(
                              user.name,
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {user.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {user.email}
                            </p>

                            {user.phone && (
                              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-[#22577A]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#22577A]">
                          {formatRole(
                            user.systemRole,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {user.organizations
                          ?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {user.organizations
                              .slice(
                                0,
                                3,
                              )
                              .map(
                                (
                                  organization,
                                ) => (
                                  <span
                                    key={
                                      organization.membershipId
                                    }
                                    className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                                  >
                                    {
                                      organization.name
                                    }
                                  </span>
                                ),
                              )}

                            {user.organizations
                              .length >
                              3 && (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                                +
                                {user.organizations
                                  .length -
                                  3}{" "}
                                more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No organization
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                            user.isVerified
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {user.isVerified
                            ? "Verified"
                            : "Pending"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(
                          user.createdAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {platformUsers.length ===
              0 && (
              <div className="p-12 text-center">
                <UserCheck
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No users found
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Try a different name or email search.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  /* ============================================================
     AUDIT LOGS
     ============================================================ */

  const renderAuditLogs =
    () => (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
                <Activity size={20} />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Platform Audit Logs
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Monitor platform-level administrative and security activity.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAuditError("");
              void loadAuditLogs(
                auditPagination.page,
              );
            }}
            disabled={
              auditLoading
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                auditLoading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh logs
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 border-b border-slate-200 p-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2 xl:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Search activity
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    auditSearch
                  }
                  onChange={(event) =>
                    setAuditSearch(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      void loadAuditLogs(
                        1,
                      );
                    }
                  }}
                  placeholder="Search action, entity, details, user, or organization..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Action
              </label>

              <input
                value={
                  auditAction
                }
                onChange={(event) =>
                  setAuditAction(
                    event.target.value,
                  )
                }
                placeholder="e.g. ORGANIZATION_CREATED"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Entity
              </label>

              <input
                value={
                  auditEntity
                }
                onChange={(event) =>
                  setAuditEntity(
                    event.target.value,
                  )
                }
                placeholder="e.g. Organization"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Organization
              </label>

              <select
                value={
                  auditOrganizationId
                }
                onChange={(event) =>
                  setAuditOrganizationId(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
              >
                <option value="">
                  All organizations
                </option>

                {organizations.map(
                  (
                    organization,
                  ) => (
                    <option
                      key={
                        organization.id
                      }
                      value={
                        organization.id
                      }
                    >
                      {
                        organization.name
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Administrator / user
              </label>

              <select
                value={
                  auditUserId
                }
                onChange={(event) =>
                  setAuditUserId(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
              >
                <option value="">
                  All users
                </option>

                {platformUsers.map(
                  (user) => (
                    <option
                      key={
                        user.id
                      }
                      value={
                        user.id
                      }
                    >
                      {user.name} —{" "}
                      {
                        user.email
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                From
              </label>

              <input
                type="date"
                value={
                  auditFrom
                }
                onChange={(event) =>
                  setAuditFrom(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                To
              </label>

              <input
                type="date"
                value={
                  auditTo
                }
                onChange={(event) =>
                  setAuditTo(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
              />
            </div>

            <div className="flex items-end gap-2 xl:col-span-2">
              <button
                type="button"
                onClick={() =>
                  void loadAuditLogs(
                    1,
                  )
                }
                disabled={
                  auditLoading
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865] disabled:opacity-60"
              >
                {auditLoading ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Search
                    size={16}
                  />
                )}
                Apply filters
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuditSearch("");
                  setAuditAction("");
                  setAuditEntity("");
                  setAuditOrganizationId(
                    "",
                  );
                  setAuditUserId("");
                  setAuditFrom("");
                  setAuditTo("");

                  window.setTimeout(
                    () => {
                      void superAdminService
                        .getAuditLogs({
                          page: 1,
                          limit: auditPagination.limit,
                        })
                        .then((result) => {
                          setAuditLogs(
                            result.logs ||
                              [],
                          );
                          setAuditPagination(
                            result.pagination,
                          );
                          setAuditError(
                            "",
                          );
                        })
                        .catch(
                          (
                            resetError,
                          ) => {
                            setAuditError(
                              getErrorMessage(
                                resetError,
                                "Unable to load audit logs.",
                              ),
                            );
                          },
                        );
                    },
                    0,
                  );
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          {auditError && (
            <div className="border-b border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3 text-sm text-red-700">
                <CircleAlert
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="font-semibold">
                    Audit log request failed
                  </p>

                  <p className="mt-1">
                    {
                      auditError
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Audit event stream
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {auditPagination.total} total audit record
                {auditPagination.total ===
                1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <ShieldCheck size={14} />
              Server-controlled records
            </div>
          </div>

          {auditLoading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading audit records...
              </div>
            </div>
          ) : auditLogs.length ===
            0 ? (
            <div className="p-12 text-center">
              <Clock3
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No audit records found
              </p>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                No platform audit activity matches the current filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Date & time
                      </th>

                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Administrator
                      </th>

                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Action
                      </th>

                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Organization
                      </th>

                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Entity
                      </th>

                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        IP address
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(
                      (log) => (
                        <tr
                          key={
                            log.id
                          }
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                            {formatDateTime(
                              log.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700">
                                {getUserInitials(
                                  log
                                    .User
                                    ?.name,
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[170px] truncate text-xs font-semibold text-slate-900">
                                  {log.User
                                    ?.name ||
                                    "System user"}
                                </p>

                                <p className="max-w-[170px] truncate text-[10px] text-slate-500">
                                  {log.User
                                    ?.email ||
                                    "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-[#22577A]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#22577A]">
                              {formatAction(
                                log.action,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {log.Organization ? (
                              <div className="min-w-[150px]">
                                <p className="text-xs font-semibold text-slate-900">
                                  {
                                    log
                                      .Organization
                                      .name
                                  }
                                </p>

                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  {formatOrganizationType(
                                    log
                                      .Organization
                                      .type,
                                  )}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Platform
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="min-w-[130px]">
                              <p className="text-xs font-semibold text-slate-700">
                                {formatEntity(
                                  log.entity,
                                )}
                              </p>

                              {log.entityId && (
                                <p className="mt-0.5 max-w-[140px] truncate font-mono text-[10px] text-slate-400">
                                  {
                                    log.entityId
                                  }
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono text-[10px] text-slate-500">
                            {log.ipAddress ||
                              "—"}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAuditLog(
                                  log,
                                )
                              }
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Page{" "}
                  <span className="font-semibold text-slate-700">
                    {
                      auditPagination.page
                    }
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {
                      auditPagination.totalPages ||
                      1
                    }
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      auditLoading ||
                      !auditPagination.hasPreviousPage
                    }
                    onClick={() =>
                      void loadAuditLogs(
                        Math.max(
                          auditPagination.page -
                            1,
                          1,
                        ),
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft
                      size={14}
                    />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      auditLoading ||
                      !auditPagination.hasNextPage
                    }
                    onClick={() =>
                      void loadAuditLogs(
                        auditPagination.page +
                          1,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#22577A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1B4865] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ArrowUpRight
                      size={14}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    );

  /* ============================================================
     SYSTEM STATUS
     ============================================================ */

  const renderSystemStatus =
    () => {
      const serviceEntries = systemStatus
        ? [
            {
              name: "API service",
              description:
                "Application programming interface",
              icon: Activity,
              service:
                systemStatus
                  .services.api,
            },
            {
              name: "Database",
              description:
                "Persistent platform data",
              icon: Database,
              service:
                systemStatus
                  .services.database,
            },
            {
              name: "Reports service",
              description:
                "Reporting and analytics availability",
              icon: Activity,
              service:
                systemStatus
                  .services.reports,
            },
          ]
        : [];

      return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
                  <Activity size={20} />
                </div>

                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    System Status
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Monitor the health of core PharmaTrack platform services.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadSystemStatus()
              }
              disabled={
                systemStatusLoading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  systemStatusLoading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh status
            </button>
          </div>

          {systemStatusError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-sm font-semibold text-red-800">
                  System health check failed
                </p>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  {
                    systemStatusError
                  }
                </p>
              </div>
            </div>
          )}

          {systemStatusLoading &&
          !systemStatus ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Checking platform services...
              </div>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Overall platform status
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
                          getStatusClasses(
                            systemStatus?.status,
                          ),
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            getStatusDotClasses(
                              systemStatus?.status,
                            ),
                          ].join(" ")}
                        />

                        {getSystemStatusLabel(
                          systemStatus?.status,
                        )}
                      </span>

                      {systemStatus && (
                        <span className="text-xs text-slate-500">
                          Checked{" "}
                          {formatDateTime(
                            systemStatus.timestamp,
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {systemStatus && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-slate-50 px-3 py-2 font-medium text-slate-600">
                        Environment:{" "}
                        <strong className="text-slate-800">
                          {
                            systemStatus.environment
                          }
                        </strong>
                      </span>

                      <span className="rounded-lg bg-slate-50 px-3 py-2 font-medium text-slate-600">
                        Node:{" "}
                        <strong className="text-slate-800">
                          {
                            systemStatus.nodeVersion
                          }
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {systemStatus
                  ? serviceEntries.map(
                      ({
                        name,
                        description,
                        icon: Icon,
                        service,
                      }) => (
                        <div
                          key={name}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {name}
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {
                                  description
                                }
                              </p>
                            </div>

                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <Icon
                                size={17}
                              />
                            </span>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  "h-2 w-2 rounded-full",
                                  getStatusDotClasses(
                                    service.status,
                                  ),
                                ].join(" ")}
                              />

                              <span className="text-xs font-semibold text-slate-700">
                                {getSystemStatusLabel(
                                  service.status,
                                )}
                              </span>
                            </div>

                            {typeof service.responseTimeMs ===
                              "number" && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                {
                                  service.responseTimeMs
                                }{" "}
                                ms
                              </span>
                            )}
                          </div>

                          {service.message && (
                            <p className="mt-2 text-[11px] leading-5 text-slate-500">
                              {
                                service.message
                              }
                            </p>
                          )}
                        </div>
                      ),
                    )
                  : [
                      {
                        name: "API service",
                        description:
                          "Application programming interface",
                        icon: Activity,
                      },
                      {
                        name: "Database",
                        description:
                          "Persistent platform data",
                        icon: Database,
                      },
                      {
                        name: "Reports service",
                        description:
                          "Reporting and analytics availability",
                        icon: Activity,
                      },
                    ].map(
                      ({
                        name,
                        description,
                        icon: Icon,
                      }) => (
                        <div
                          key={name}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {name}
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {
                                  description
                                }
                              </p>
                            </div>

                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <Icon
                                size={17}
                              />
                            </span>
                          </div>

                          <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />

                            <span className="text-xs font-semibold text-slate-600">
                              Awaiting health check
                            </span>
                          </div>
                        </div>
                      ),
                    )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h3 className="text-base font-bold text-slate-900">
                    Operational monitoring
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Live information returned by the authenticated platform health endpoint.
                  </p>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      API response
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {systemStatus
                        ? `${systemStatus.responseTimeMs} ms`
                        : "—"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Platform health request
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Database
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {systemStatus
                        ? getSystemStatusLabel(
                            systemStatus
                              .services
                              .database
                              .status,
                          )
                        : "—"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Database connectivity check
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Server uptime
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {systemStatus
                        ? formatUptime(
                            systemStatus.uptime,
                          )
                        : "—"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Current API process uptime
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Last checked
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {systemStatus
                        ? formatDateTime(
                            systemStatus.timestamp,
                          )
                        : "Not checked"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Manual health check
                    </p>
                  </div>
                </div>
              </section>

              {systemStatus?.statistics && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-5">
                    <h3 className="text-base font-bold text-slate-900">
                      Platform statistics
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Current platform-level counts returned by the server.
                    </p>
                  </div>

                  <div className="grid gap-4 p-5 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Building2
                          size={17}
                          className="text-[#22577A]"
                        />

                        <p className="text-xs font-semibold text-slate-500">
                          Organizations
                        </p>
                      </div>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {systemStatus
                          .statistics
                          .organizations ??
                          0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Users
                          size={17}
                          className="text-[#22577A]"
                        />

                        <p className="text-xs font-semibold text-slate-500">
                          Users
                        </p>
                      </div>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {systemStatus
                          .statistics
                          .users ??
                          0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Activity
                          size={17}
                          className="text-[#22577A]"
                        />

                        <p className="text-xs font-semibold text-slate-500">
                          Audit records
                        </p>
                      </div>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {systemStatus
                          .statistics
                          .auditLogs ??
                          0}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      );
    };

  /* ============================================================
     PLATFORM SETTINGS
     ============================================================ */

  const renderSettings =
    () => (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22577A]/8 text-[#22577A]">
              <Settings size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Platform Settings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure global PharmaTrack platform behavior and administration.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h3 className="text-base font-bold text-slate-900">
                Platform identity
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Global branding and platform information.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Platform name
                </label>

                <input
                  value="PharmaTrack"
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Platform description
                </label>

                <textarea
                  value="Pharmacy and clinic management platform"
                  readOnly
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h3 className="text-base font-bold text-slate-900">
                Security configuration
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Global authentication and account-security policies.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Strong passwords
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Enforced by the authentication service.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 size={13} />
                  Enabled
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Refresh-token rotation
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Session tokens are rotated and revocable.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 size={13} />
                  Enabled
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Public administrator registration
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Administrator accounts cannot be created publicly.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Restricted
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 p-5">
              <h3 className="text-base font-bold text-slate-900">
                Platform operations
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Operational controls will be connected to server-side platform settings.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#22577A] shadow-sm">
                  <Mail size={17} />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-900">
                  Email service
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Invitation, verification, and account email configuration.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#22577A] shadow-sm">
                  <ShieldCheck
                    size={17}
                  />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-900">
                  Security controls
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Authentication, sessions, rate limits, and platform security.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#22577A] shadow-sm">
                  <Activity size={17} />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-900">
                  Maintenance
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Platform-wide maintenance and service availability controls.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                Server-controlled configuration
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                Sensitive platform settings will be managed through authenticated server endpoints rather than browser-only storage. This prevents a Super Administrator from accidentally changing security-critical configuration only on the local device.
              </p>
            </div>
          </div>
        </div>
      </div>
    );

  /* ============================================================
     CONTENT SWITCH
     ============================================================ */

  const renderContent = () => {
    switch (activeSection) {
      case "organizations":
        return renderOrganizations();

      case "users":
        return renderUsers();

      case "audit-logs":
        return renderAuditLogs();

      case "system-status":
        return renderSystemStatus();

      case "settings":
        return renderSettings();

      default:
        return renderDashboard();
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <SuperAdminLayout
      activeSection={
        activeSection
      }
      onSectionChange={
        setActiveSection
      }
      onLogout={
        onLogout || (() => {})
      }
      userName={
        currentUser?.name ||
        userName
      }
      userEmail={
        currentUser?.email
      }
    >
      {renderContent()}

      {/* ========================================================
          ORGANIZATION MODAL
          ======================================================== */}

      {organizationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingOrganization
                    ? "Edit organization"
                    : "Create organization"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {editingOrganization
                    ? "Update organization information."
                    : "Register a pharmacy or clinic on PharmaTrack."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOrganizationModalOpen(
                    false,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close organization dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleOrganizationSubmit
              }
              className="space-y-5 p-5"
            >
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Organization name
                </label>

                <input
                  value={
                    organizationForm.name
                  }
                  onChange={(event) =>
                    setOrganizationForm(
                      (previous) => ({
                        ...previous,
                        name: event
                          .target.value,
                      }),
                    )
                  }
                  placeholder="e.g. AfyaLink Pharmacy"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Organization type
                  </label>

                  <select
                    value={
                      organizationForm.type
                    }
                    onChange={(event) =>
                      setOrganizationForm(
                        (previous) => ({
                          ...previous,
                          type: event
                            .target
                            .value as OrganizationType,
                        }),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
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
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Phone
                  </label>

                  <input
                    value={
                      organizationForm.phone
                    }
                    onChange={(event) =>
                      setOrganizationForm(
                        (previous) => ({
                          ...previous,
                          phone: event
                            .target.value,
                        }),
                      )
                    }
                    placeholder="+254..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={
                    organizationForm.email
                  }
                  onChange={(event) =>
                    setOrganizationForm(
                      (previous) => ({
                        ...previous,
                        email: event
                          .target.value,
                      }),
                    )
                  }
                  placeholder="organization@example.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Address
                </label>

                <textarea
                  value={
                    organizationForm.address
                  }
                  onChange={(event) =>
                    setOrganizationForm(
                      (previous) => ({
                        ...previous,
                        address:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={3}
                  placeholder="Physical location or postal address"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setOrganizationModalOpen(
                      false,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    actionLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865] disabled:opacity-60"
                >
                  {actionLoading && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingOrganization
                    ? "Save changes"
                    : "Create organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          INVITE ORGANIZATION ADMINISTRATOR MODAL
          ======================================================== */}

      {invitationModalOpen &&
        selectedOrganization && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22577A]/8 text-[#22577A]">
                      <Mail size={17} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Invite organization administrator
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Send a secure invitation for {selectedOrganization.name}.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInvitationModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close invitation dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleSendInvitation}
                className="space-y-5 p-5"
              >
                <div className="rounded-xl border border-[#22577A]/10 bg-[#22577A]/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#22577A]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Initial administrator access
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        The invitee will receive an email and create their own secure password. Their organization role will automatically be Administrator.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Administrator name
                  </label>
                  <input
                    value={invitationForm.name}
                    onChange={(event) =>
                      setInvitationForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Jane Wanjiku"
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Administrator email
                  </label>
                  <input
                    type="email"
                    value={invitationForm.email}
                    onChange={(event) =>
                      setInvitationForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    placeholder="administrator@example.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Phone <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={invitationForm.phone}
                    onChange={(event) =>
                      setInvitationForm((previous) => ({
                        ...previous,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+254..."
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  <strong className="text-slate-700">Role:</strong> Administrator. The invitation expires after 72 hours and can be revoked by the Super Administrator before it is accepted.
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setInvitationModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      actionLoading ||
                      selectedOrganization.status === "SUSPENDED"
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Mail size={16} />
                    )}
                    Send administrator invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* ========================================================
          ADD MEMBER MODAL
          ======================================================== */}

      {memberModalOpen &&
        selectedOrganization && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Add organization member
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Add an existing platform user to{" "}
                    {
                      selectedOrganization.name
                    }.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMemberModalOpen(
                      false,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label="Close member dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={
                  handleAddMember
                }
                className="space-y-5 p-5"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Search platform users
                  </label>

                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={
                        memberSearch
                      }
                      onChange={(event) =>
                        setMemberSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Search name or email..."
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                  {filteredMemberUsers.length ===
                  0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No eligible platform users found.
                    </div>
                  ) : (
                    filteredMemberUsers.map(
                      (user) => {
                        const selected =
                          memberForm.userId ===
                          user.id;

                        return (
                          <button
                            key={
                              user.id
                            }
                            type="button"
                            onClick={() =>
                              setMemberForm(
                                (
                                  previous,
                                ) => ({
                                  ...previous,
                                  userId:
                                    user.id,
                                }),
                              )
                            }
                            className={[
                              "flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left last:border-b-0",
                              selected
                                ? "bg-[#22577A]/5"
                                : "hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                              {getUserInitials(
                                user.name,
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {
                                  user.name
                                }
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {
                                  user.email
                                }
                              </p>
                            </div>

                            {selected && (
                              <CheckCircle2
                                size={17}
                                className="text-[#22577A]"
                              />
                            )}
                          </button>
                        );
                      },
                    )
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Organization role
                  </label>

                  <select
                    value={
                      memberForm.role
                    }
                    onChange={(event) =>
                      setMemberForm(
                        (previous) => ({
                          ...previous,
                          role: event
                            .target
                            .value as MemberRole,
                        }),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#22577A] focus:ring-2 focus:ring-[#22577A]/10"
                  >
                    <option value="ADMIN">
                      Administrator
                    </option>

                    <option value="PHARMACIST">
                      Pharmacist
                    </option>

                    <option value="CLINICIAN">
                      Clinician
                    </option>
                  </select>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  For normal onboarding, the platform administrator should add the organization's initial Administrator. That Administrator can then create and manage the organization's pharmacists, clinicians, and additional administrators.
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setMemberModalOpen(
                        false,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      actionLoading ||
                      !memberForm.userId
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22577A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading && (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    )}

                    Add member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* ========================================================
          AUDIT LOG DETAIL MODAL
          ======================================================== */}

      {selectedAuditLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Audit event details
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Server-recorded platform activity
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedAuditLog(
                    null,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close audit log details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Action
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatAction(
                      selectedAuditLog.action,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Entity
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatEntity(
                      selectedAuditLog.entity,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Administrator
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {selectedAuditLog
                      .User?.name ||
                      "System user"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedAuditLog
                      .User?.email ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Organization
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {selectedAuditLog
                      .Organization
                      ?.name ||
                      "Platform"}
                  </p>

                  {selectedAuditLog
                    .Organization && (
                    <p className="mt-1 text-xs text-slate-500">
                      {formatOrganizationType(
                        selectedAuditLog
                          .Organization
                          .type,
                      )}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Timestamp
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatDateTime(
                      selectedAuditLog.createdAt,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    IP address
                  </p>

                  <p className="mt-2 font-mono text-sm font-bold text-slate-900">
                    {selectedAuditLog.ipAddress ||
                      "—"}
                  </p>
                </div>
              </div>

              {selectedAuditLog.entityId && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-700">
                    Entity ID
                  </p>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-600 break-all">
                    {
                      selectedAuditLog.entityId
                    }
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-700">
                  Event details
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {getAuditLogDescription(
                    selectedAuditLog,
                  )}
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAuditLog(
                      null,
                    )
                  }
                  className="rounded-xl bg-[#22577A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4865]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}

export default SuperAdminDashboard;