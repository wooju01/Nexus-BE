import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChannelType } from "@prisma/client";
import type { CreateDmDto } from "./dto/dm.dto";

@Injectable()
export class DmService {
  constructor(private readonly prisma: PrismaService) {}

  async getDms(userId: string, workspaceId: string) {
    await this.requireWorkspaceMember(userId, workspaceId);

    return this.prisma.channel.findMany({
      where: {
        workspaceId,
        type: ChannelType.DM,
        members: { some: { userId } },
      },
      include: {
        members: {
          where: { userId: { not: userId } },
          include: {
            user: { select: { id: true, name: true, avatar: true, status: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createDm(userId: string, workspaceId: string, dto: CreateDmDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException("자기 자신과 DM을 시작할 수 없습니다.");
    }

    await this.requireWorkspaceMember(userId, workspaceId);
    await this.requireWorkspaceMember(dto.targetUserId, workspaceId);

    // 이미 DM 채널이 있으면 그대로 반환
    const existing = await this.prisma.channel.findFirst({
      where: {
        workspaceId,
        type: ChannelType.DM,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: dto.targetUserId } } },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const channel = await tx.channel.create({
        data: { workspaceId, type: ChannelType.DM },
      });
      await tx.channelMember.createMany({
        data: [
          { channelId: channel.id, userId },
          { channelId: channel.id, userId: dto.targetUserId },
        ],
      });
      return channel;
    });
  }

  private async requireWorkspaceMember(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new ForbiddenException();
  }
}
