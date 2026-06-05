import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import type { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { Role } from "@prisma/client";

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /workspaces — 내가 속한 워크스페이스 목록
  async getMyWorkspaces(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
    });
    return memberships.map((m) => ({ ...m.workspace, role: m.role }));
  }

  // POST /workspaces — 생성 + 생성자를 OWNER로 멤버십 동시 등록
  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({ data: dto });
      await tx.membership.create({
        data: { userId, workspaceId: workspace.id, role: Role.OWNER },
      });
      return workspace;
    });
  }

  // GET /workspaces/:id — 멤버인 경우만 조회
  async getWorkspace(userId: string, workspaceId: string) {
    await this.requireMembership(userId, workspaceId);
    return this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
  }

  // PATCH /workspaces/:id — OWNER 또는 ADMIN만
  async updateWorkspace(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ) {
    await this.requireRole(userId, workspaceId, Role.OWNER, Role.ADMIN);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: dto,
    });
  }

  // DELETE /workspaces/:id — OWNER만
  async deleteWorkspace(userId: string, workspaceId: string) {
    await this.requireRole(userId, workspaceId, Role.OWNER);
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
  }

// GET /workspaces/:id/unread-summary
async getUnreadSummary(userId: string, workspaceId: string) {
  await this.requireMembership(userId, workspaceId);

  const channelMembers = await this.prisma.channelMember.findMany({
    where: {
      userId,
      channel: {
        OR: [
          { workspaceId },
          { workspaceId: null }, // 글로벌 DM 포함
        ],
      },
    },
    select: {
      channelId: true,
      channel: { select: { type: true } },
    },
  });

  if (channelMembers.length === 0) return [];

  const channelIds = channelMembers.map((cm) => cm.channelId);

  const readMarkers = await this.prisma.readMarker.findMany({
    where: { userId, channelId: { in: channelIds } },
  });
  const markerMap = new Map(readMarkers.map((rm) => [rm.channelId, rm.lastReadAt]));

  const results = await Promise.all(
    channelMembers.map(async ({ channelId, channel }) => {
      const lastReadAt = markerMap.get(channelId);
      const unreadCount = await this.prisma.message.count({
        where: {
          channelId,
          parentId: null,
          deletedAt: null,
          authorId: { not: userId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return { channelId, channelType: channel.type, unreadCount };
    }),
  );

  // unreadCount 0인 채널은 제외
  return results.filter((r) => r.unreadCount > 0);
}


  // --- 헬퍼 메서드: 멤버십과 역할 검증 ---

  private async requireMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    // 존재 여부를 외부에 유출하지 않기 위해 404 대신 403 반환
    if (!membership) throw new ForbiddenException();
    return membership;
  }

  private async requireRole(
    userId: string,
    workspaceId: string,
    ...roles: Role[]
  ) {
    const membership = await this.requireMembership(userId, workspaceId);
    if (!roles.includes(membership.role)) throw new ForbiddenException();
    return membership;
  }
}
