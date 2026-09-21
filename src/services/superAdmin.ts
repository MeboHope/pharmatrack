import { api } from "./api";

export type OrganizationType = "PHARMACY" | "CLINIC";
export type OrganizationStatus = "ACTIVE" | "SUSPENDED";
export type OrganizationMemberRole =
  | "ADMIN"
  | "PHARMACIST"
  | "CLINICIAN";

export interface OrganizationCounts {
  memberships: number;
  drugs: number;
  patients: number;
  suppliers: number;
  transactions: number;
}

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
  _count?: OrganizationCounts & {
    stockAdjustments?: number;
    auditLogs?: number;
  };
}

export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: OrganizationMemberRole;
  isVerified: boolean;
  createdAt: string;
}

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
  status?: OrganizationStatus;
  address?: string;
  phone?: string;
  email?: string;
}

export interface AddOrganizationMemberInput {
  userId: string;
  role: OrganizationMemberRole;
}

export interface UpdateOrganizationMemberInput {
  role: OrganizationMemberRole;
}

interface OrganizationsResponse {
  organizations: Organization[];
}

interface OrganizationResponse {
  organization: Organization;
}

interface MembersResponse {
  members: OrganizationMember[];
}

interface MemberResponse {
  membership: OrganizationMember & {
    user?: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      isVerified: boolean;
    };
  };
}

interface ApiMessageResponse {
  message?: string;
}

const getData = <T>(
  response: {
    success?: boolean;
    data?: T;
  } & Record<string, unknown>,
): T => {
  if (response.data !== undefined) {
    return response.data as T;
  }

  return response as T;
};

export const superAdminService = {
  async getOrganizations(): Promise<Organization[]> {
    const response =
      await api.get<OrganizationsResponse>(
        "/super-admin/organizations",
      );

    return getData<OrganizationsResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: OrganizationsResponse;
      },
    ).organizations;
  },

  async getOrganization(
    organizationId: string,
  ): Promise<Organization> {
    const response =
      await api.get<OrganizationResponse>(
        `/super-admin/organizations/${organizationId}`,
      );

    return getData<OrganizationResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: OrganizationResponse;
      },
    ).organization;
  },

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    const response =
      await api.post<OrganizationResponse>(
        "/super-admin/organizations",
        input,
      );

    return getData<OrganizationResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: OrganizationResponse;
      },
    ).organization;
  },

  async updateOrganization(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    const response =
      await api.put<OrganizationResponse>(
        `/super-admin/organizations/${organizationId}`,
        input,
      );

    return getData<OrganizationResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: OrganizationResponse;
      },
    ).organization;
  },

  async suspendOrganization(
    organizationId: string,
  ): Promise<Organization> {
    const response =
      await api.post<OrganizationResponse>(
        `/super-admin/organizations/${organizationId}/suspend`,
      );

    return getData<OrganizationResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: OrganizationResponse;
      },
    ).organization;
  },

  async activateOrganization(
    organizationId: string,
  ): Promise<Organization> {
    const response =
      await api.post<OrganizationResponse>(
        `/super-admin/organizations/${organizationId}/activate`,
      );

    return getData<OrganizationResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: OrganizationResponse;
      },
    ).organization;
  },

  async getMembers(
    organizationId: string,
  ): Promise<OrganizationMember[]> {
    const response =
      await api.get<MembersResponse>(
        `/super-admin/organizations/${organizationId}/members`,
      );

    return getData<MembersResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: MembersResponse;
      },
    ).members;
  },

  async addMember(
    organizationId: string,
    input: AddOrganizationMemberInput,
  ): Promise<MemberResponse["membership"]> {
    const response =
      await api.post<MemberResponse>(
        `/super-admin/organizations/${organizationId}/members`,
        input,
      );

    return getData<MemberResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: MemberResponse;
      },
    ).membership;
  },

  async updateMemberRole(
    organizationId: string,
    userId: string,
    input: UpdateOrganizationMemberInput,
  ): Promise<MemberResponse["membership"]> {
    const response =
      await api.put<MemberResponse>(
        `/super-admin/organizations/${organizationId}/members/${userId}`,
        input,
      );

    return getData<MemberResponse>(
      response as unknown as Record<string, unknown> & {
        success?: boolean;
        data?: MemberResponse;
      },
    ).membership;
  },

  async removeMember(
    organizationId: string,
    userId: string,
  ): Promise<string> {
    const response =
      await api.delete<ApiMessageResponse>(
        `/super-admin/organizations/${organizationId}/members/${userId}`,
      );

    const result =
      getData<ApiMessageResponse>(
        response as unknown as Record<string, unknown> & {
          success?: boolean;
          data?: ApiMessageResponse;
        },
      );

    return (
      result.message ||
      "User removed from organization successfully."
    );
  },
};

export default superAdminService;