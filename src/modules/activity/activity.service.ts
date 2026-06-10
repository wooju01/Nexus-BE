import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { ListActivitiesDto } from "./dto/activity.dto";

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaceActivities(
    userId: string,
    workspaceId: string,
    dto: ListActivitiesDto,
  ) {
    await this.requireMembership(userId, workspaceId);

    const { cursor, limit = 20 } = dto;

    const activities = await this.prisma.activity.findMany({
      where: {
        workspaceId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        actor: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return { items, nextCursor };
  }

  async listProjectActivities(
    userId: string,
    projectId: string,
    dto: ListActivitiesDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new ForbiddenException();

    await this.requireMembership(userId, project.workspaceId);

    const { cursor, limit = 20 } = dto;

    const activities = await this.prisma.activity.findMany({
      where: {
        projectId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        actor: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return { items, nextCursor };
  }

  private async requireMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new ForbiddenException();
    return membership;
  }
}
