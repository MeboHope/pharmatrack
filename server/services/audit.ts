
import { prisma } from "../prisma";

export interface CreateAuditLogInput {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userId?: string;
}

export const auditService = {
  async log(input: CreateAuditLogInput) {
    try {
      return await prisma.auditLog.create({
        data: {
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          details: input.details,
          ipAddress: input.ipAddress,
          userId: input.userId,
        },
      });
    } catch (error) {
      /*
       * Audit logging must never break the
       * actual pharmacy operation.
       */
      console.error(
        "Failed to create audit log:",
        error,
      );

      return null;
    }
  },

  async list(options?: {
    limit?: number;
    entity?: string;
    userId?: string;
  }) {
    const limit = Math.min(
      Math.max(options?.limit ?? 100, 1),
      500,
    );

    return prisma.auditLog.findMany({
      where: {
        entity: options?.entity,
        userId: options?.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  },

  async getById(id: string) {
    return prisma.auditLog.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  },
};

export default auditService;
