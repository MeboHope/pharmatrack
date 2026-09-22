import { api } from "./api";

export type OrganizationType =
  | "PHARMACY"
  | "CLINIC";

export type OrganizationStatus =
  | "ACTIVE"
  | "SUSPENDED";

export type OrganizationRole =
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

/* ============================================================
   ORGANIZATION TYPES
   ============================================================ */

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;

  _count?: {
    memberships?: number;
    drugs?: number;
    patients?: number;
    suppliers?: number;
    transactions?: number;
    stockAdjustments?: number;
    auditLogs?: number;
  };

  memberships?: number;
  drugs?: number;
  patients?: number;
  suppliers?: number;
  transactions?: number;
}

export interface OrganizationMemberUser {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: OrganizationRole;
  isVerified?: boolean;
  joinedAt: string;
  createdAt?: string;

  user?: OrganizationMemberUser | null;
}

/* ============================================================
   ORGANIZATION INPUT TYPES
   ============================================================ */

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  type?: OrganizationType;
  address?: string;
  phone?: string;
  email?: string;
  status?: OrganizationStatus;
}

export interface CreateOrganizationInvitationInput {
  name: string;
  email: string;
  phone?: string;
  role: OrganizationRole;
}

export interface OrganizationInvitation {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: OrganizationRole;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AddOrganizationMemberInput {
  userId: string;
  role: OrganizationRole;
}

export interface UpdateOrganizationMemberInput {
  role: OrganizationRole;
}

/* ============================================================
   PLATFORM USER TYPES
   ============================================================ */

export interface PlatformUserOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  role: OrganizationRole;
  membershipId: string;
  joinedAt: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  systemRole: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  organizations: PlatformUserOrganization[];
}

export interface GetPlatformUsersOptions {
  search?: string;
  organizationId?: string;
}

/* ============================================================
   AUDIT LOG TYPES
   ============================================================ */

export interface SuperAdminAuditLogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SuperAdminAuditLogOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
}

export interface SuperAdminAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  createdAt: string;

  User?: SuperAdminAuditLogUser | null;
  Organization?: SuperAdminAuditLogOrganization | null;
}

export interface GetAuditLogsOptions {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entity?: string;
  userId?: string;
  organizationId?: string;
  from?: string;
  to?: string;
}

export interface AuditLogsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetAuditLogsResult {
  logs: SuperAdminAuditLog[];
  pagination: AuditLogsPagination;
}

/* ============================================================
   SYSTEM STATUS TYPES
   ============================================================ */

export type SystemServiceStatus =
  | "OPERATIONAL"
  | "DEGRADED"
  | "DOWN";

export interface SystemStatusService {
  status: SystemServiceStatus;
  responseTimeMs?: number;
  message?: string;
}

export interface SystemStatus {
  status: SystemServiceStatus;
  timestamp: string;
  environment: string;
  nodeVersion: string;
  uptime: number;
  responseTimeMs: number;

  services: {
    api: SystemStatusService;
    database: SystemStatusService;
    reports: SystemStatusService;
  };

  statistics?: {
    organizations?: number;
    users?: number;
    auditLogs?: number;
  };
}

/* ============================================================
   RESPONSE TYPES
   ============================================================ */

interface OrganizationsResponse {
  success?: boolean;
  message?: string;
  organizations?: Organization[];
  data?: Organization[];
}

interface OrganizationResponse {
  success?: boolean;
  message?: string;
  organization?: Organization;
  data?: Organization;
}

interface OrganizationMembersResponse {
  success?: boolean;
  message?: string;
  members?: OrganizationMember[];
  data?: OrganizationMember[];
}

interface OrganizationMemberResponse {
  success?: boolean;
  message?: string;
  membership?: OrganizationMember;
  data?: OrganizationMember;
}

interface OrganizationInvitationResponse {
  success?: boolean;
  message?: string;
  invitation?: OrganizationInvitation;
  data?: OrganizationInvitation;
}

interface PlatformUsersResponse {
  success?: boolean;
  message?: string;
  users?: PlatformUser[];
  data?: PlatformUser[];
}

interface PlatformUserResponse {
  success?: boolean;
  message?: string;
  user?: PlatformUser;
  data?: PlatformUser;
}

interface AuditLogsResponse {
  success?: boolean;
  message?: string;
  logs?: SuperAdminAuditLog[];
  data?: SuperAdminAuditLog[];

  pagination?: AuditLogsPagination;
}

interface AuditLogResponse {
  success?: boolean;
  message?: string;
  log?: SuperAdminAuditLog;
  data?: SuperAdminAuditLog;
}

interface SystemStatusResponse {
  success?: boolean;
  message?: string;
  status?: SystemStatus;
  data?: SystemStatus;
}

/* ============================================================
   NORMALIZATION HELPERS
   ============================================================ */

const normalizeOrganization = (
  organization: Organization,
): Organization => {
  const counts =
    organization._count;

  return {
    ...organization,

    memberships:
      organization.memberships ??
      counts?.memberships ??
      0,

    drugs:
      organization.drugs ??
      counts?.drugs ??
      0,

    patients:
      organization.patients ??
      counts?.patients ??
      0,

    suppliers:
      organization.suppliers ??
      counts?.suppliers ??
      0,

    transactions:
      organization.transactions ??
      counts?.transactions ??
      0,
  };
};

const normalizeOrganizationMember = (
  member: OrganizationMember,
): OrganizationMember => {
  const user =
    member.user;

  return {
    ...member,

    userId:
      member.userId ||
      user?.id ||
      "",

    name:
      member.name ||
      user?.name ||
      member.email ||
      user?.email ||
      "Unknown user",

    email:
      member.email ||
      user?.email ||
      "",

    phone:
      member.phone ??
      user?.phone ??
      null,

    isVerified:
      member.isVerified ??
      user?.isVerified ??
      false,

    joinedAt:
      member.joinedAt ||
      member.createdAt ||
      "",

    user:
      user ?? {
        id: member.userId,
        name: member.name,
        email: member.email,
        phone: member.phone,
        isVerified:
          member.isVerified,
      },
  };
};

const normalizeAuditLog = (
  log: SuperAdminAuditLog,
): SuperAdminAuditLog => {
  return {
    ...log,

    entityId:
      log.entityId ??
      null,

    details:
      log.details ??
      null,

    ipAddress:
      log.ipAddress ??
      null,

    userId:
      log.userId ??
      null,

    organizationId:
      log.organizationId ??
      null,

    User:
      log.User ??
      null,

    Organization:
      log.Organization ??
      null,
  };
};

const buildPlatformUsersQuery = (
  options: GetPlatformUsersOptions = {},
): string => {
  const params =
    new URLSearchParams();

  if (
    options.search &&
    options.search.trim()
  ) {
    params.set(
      "search",
      options.search.trim(),
    );
  }

  if (
    options.organizationId &&
    options.organizationId.trim()
  ) {
    params.set(
      "organizationId",
      options.organizationId.trim(),
    );
  }

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
};

const buildAuditLogsQuery = (
  options: GetAuditLogsOptions = {},
): string => {
  const params =
    new URLSearchParams();

  if (
    typeof options.page === "number" &&
    Number.isFinite(options.page) &&
    options.page > 0
  ) {
    params.set(
      "page",
      String(
        Math.floor(options.page),
      ),
    );
  }

  if (
    typeof options.limit === "number" &&
    Number.isFinite(options.limit) &&
    options.limit > 0
  ) {
    params.set(
      "limit",
      String(
        Math.min(
          Math.floor(options.limit),
          100,
        ),
      ),
    );
  }

  if (
    options.search &&
    options.search.trim()
  ) {
    params.set(
      "search",
      options.search.trim(),
    );
  }

  if (
    options.action &&
    options.action.trim()
  ) {
    params.set(
      "action",
      options.action.trim(),
    );
  }

  if (
    options.entity &&
    options.entity.trim()
  ) {
    params.set(
      "entity",
      options.entity.trim(),
    );
  }

  if (
    options.userId &&
    options.userId.trim()
  ) {
    params.set(
      "userId",
      options.userId.trim(),
    );
  }

  if (
    options.organizationId &&
    options.organizationId.trim()
  ) {
    params.set(
      "organizationId",
      options.organizationId.trim(),
    );
  }

  if (
    options.from &&
    options.from.trim()
  ) {
    params.set(
      "from",
      options.from.trim(),
    );
  }

  if (
    options.to &&
    options.to.trim()
  ) {
    params.set(
      "to",
      options.to.trim(),
    );
  }

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
};

/* ============================================================
   SUPER ADMIN SERVICE
   ============================================================ */

export const superAdminService = {
  /* ==========================================================
     ORGANIZATIONS
     ========================================================== */

  async getOrganizations(): Promise<
    Organization[]
  > {
    const response =
      await api.get<Organization[]>(
        "/super-admin/organizations",
      ) as unknown as OrganizationsResponse;

    const organizations =
      response.data ??
      response.organizations ??
      [];

    return organizations.map(
      normalizeOrganization,
    );
  },

  async getOrganization(
    organizationId: string,
  ): Promise<Organization> {
    const response =
      await api.get<Organization>(
        `/super-admin/organizations/${organizationId}`,
      ) as unknown as OrganizationResponse;

    const organization =
      response.data ??
      response.organization;

    if (!organization) {
      throw new Error(
        "Organization was not returned by the server.",
      );
    }

    return normalizeOrganization(
      organization,
    );
  },

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    const response =
      await api.post<Organization>(
        "/super-admin/organizations",
        input,
      ) as unknown as OrganizationResponse;

    const organization =
      response.data ??
      response.organization;

    if (!organization) {
      throw new Error(
        "The server did not return the created organization.",
      );
    }

    return normalizeOrganization(
      organization,
    );
  },

  async updateOrganization(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    const response =
      await api.put<Organization>(
        `/super-admin/organizations/${organizationId}`,
        input,
      ) as unknown as OrganizationResponse;

    const organization =
      response.data ??
      response.organization;

    if (!organization) {
      throw new Error(
        "The server did not return the updated organization.",
      );
    }

    return normalizeOrganization(
      organization,
    );
  },

  async suspendOrganization(
    organizationId: string,
  ): Promise<Organization> {
    const response =
      await api.post<Organization>(
        `/super-admin/organizations/${organizationId}/suspend`,
        {},
      ) as unknown as OrganizationResponse;

    const organization =
      response.data ??
      response.organization;

    if (!organization) {
      throw new Error(
        "The server did not return the suspended organization.",
      );
    }

    return normalizeOrganization(
      organization,
    );
  },

  async activateOrganization(
    organizationId: string,
  ): Promise<Organization> {
    const response =
      await api.post<Organization>(
        `/super-admin/organizations/${organizationId}/activate`,
        {},
      ) as unknown as OrganizationResponse;

    const organization =
      response.data ??
      response.organization;

    if (!organization) {
      throw new Error(
        "The server did not return the activated organization.",
      );
    }

    return normalizeOrganization(
      organization,
    );
  },

  /* ==========================================================
     ORGANIZATION MEMBERS
     ========================================================== */

  async getOrganizationMembers(
    organizationId: string,
  ): Promise<OrganizationMember[]> {
    const response =
      await api.get<OrganizationMember[]>(
        `/super-admin/organizations/${organizationId}/members`,
      ) as unknown as OrganizationMembersResponse;

    const members =
      response.data ??
      response.members ??
      [];

    return members.map(
      normalizeOrganizationMember,
    );
  },

  async createOrganizationInvitation(
    organizationId: string,
    input: CreateOrganizationInvitationInput,
  ): Promise<OrganizationInvitation> {
    const response =
      await api.post<OrganizationInvitation>(
        `/super-admin/organizations/${organizationId}/invitations`,
        input,
      ) as unknown as OrganizationInvitationResponse;

    const invitation =
      response.data ??
      response.invitation;

    if (!invitation) {
      throw new Error(
        "The server did not return the created invitation.",
      );
    }

    return invitation;
  },

  async getOrganizationInvitations(
    organizationId: string,
  ): Promise<OrganizationInvitation[]> {
    const response =
      await api.get<OrganizationInvitation[]>(
        `/super-admin/organizations/${organizationId}/invitations`,
      ) as unknown as {
        success?: boolean;
        message?: string;
        invitations?: OrganizationInvitation[];
        data?: OrganizationInvitation[];
      };

    return response.data ?? response.invitations ?? [];
  },

  async revokeOrganizationInvitation(
    organizationId: string,
    invitationId: string,
  ): Promise<void> {
    await api.post(
      `/super-admin/organizations/${organizationId}/invitations/${invitationId}/revoke`,
      {},
    );
  },

  async addOrganizationMember(
    organizationId: string,
    input: AddOrganizationMemberInput,
  ): Promise<OrganizationMember> {
    const response =
      await api.post<OrganizationMember>(
        `/super-admin/organizations/${organizationId}/members`,
        input,
      ) as unknown as OrganizationMemberResponse;

    const membership =
      response.data ??
      response.membership;

    if (!membership) {
      throw new Error(
        "The server did not return the created organization membership.",
      );
    }

    return normalizeOrganizationMember(
      membership,
    );
  },

  async updateOrganizationMember(
    organizationId: string,
    userId: string,
    input: UpdateOrganizationMemberInput,
  ): Promise<OrganizationMember> {
    const response =
      await api.put<OrganizationMember>(
        `/super-admin/organizations/${organizationId}/members/${userId}`,
        input,
      ) as unknown as OrganizationMemberResponse;

    const membership =
      response.data ??
      response.membership;

    if (!membership) {
      throw new Error(
        "The server did not return the updated organization membership.",
      );
    }

    return normalizeOrganizationMember(
      membership,
    );
  },

  async removeOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    await api.delete(
      `/super-admin/organizations/${organizationId}/members/${userId}`,
    );
  },

  /* ==========================================================
     PLATFORM USERS
     ========================================================== */

  async getUsers(
    options: GetPlatformUsersOptions = {},
  ): Promise<PlatformUser[]> {
    const query =
      buildPlatformUsersQuery(
        options,
      );

    const response =
      await api.get<PlatformUser[]>(
        `/super-admin/users${query}`,
      ) as unknown as PlatformUsersResponse;

    return (
      response.data ??
      response.users ??
      []
    );
  },

  async getUser(
    userId: string,
  ): Promise<PlatformUser> {
    const response =
      await api.get<PlatformUser>(
        `/super-admin/users/${userId}`,
      ) as unknown as PlatformUserResponse;

    const user =
      response.data ??
      response.user;

    if (!user) {
      throw new Error(
        "The server did not return the requested platform user.",
      );
    }

    return user;
  },

  /* ==========================================================
     PLATFORM AUDIT LOGS
     ========================================================== */

  async getAuditLogs(
    options: GetAuditLogsOptions = {},
  ): Promise<GetAuditLogsResult> {
    const query =
      buildAuditLogsQuery(
        options,
      );

    const response =
      await api.get<
        SuperAdminAuditLog[]
      >(
        `/super-admin/audit-logs${query}`,
      ) as unknown as AuditLogsResponse;

    const logs =
      response.data ??
      response.logs ??
      [];

    const pagination =
      response.pagination ?? {
        page:
          options.page ??
          1,

        limit:
          options.limit ??
          25,

        total:
          logs.length,

        totalPages:
          logs.length > 0
            ? 1
            : 0,

        hasNextPage:
          false,

        hasPreviousPage:
          false,
      };

    return {
      logs: logs.map(
        normalizeAuditLog,
      ),
      pagination,
    };
  },

  async getAuditLog(
    auditLogId: string,
  ): Promise<SuperAdminAuditLog> {
    const response =
      await api.get<SuperAdminAuditLog>(
        `/super-admin/audit-logs/${auditLogId}`,
      ) as unknown as AuditLogResponse;

    const log =
      response.data ??
      response.log;

    if (!log) {
      throw new Error(
        "The server did not return the requested audit log.",
      );
    }

    return normalizeAuditLog(
      log,
    );
  },

  /* ==========================================================
     PLATFORM SYSTEM STATUS
     ========================================================== */

  async getSystemStatus(): Promise<SystemStatus> {
    const response =
      await api.get<SystemStatus>(
        "/super-admin/system-status",
      ) as unknown as SystemStatusResponse;

    const status =
      response.data ??
      response.status;

    if (!status) {
      throw new Error(
        "The server did not return system status.",
      );
    }

    return status;
  },
};

export default superAdminService;