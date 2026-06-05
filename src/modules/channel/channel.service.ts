import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChannelType, Role } from "@prisma/client";
import type { CreateChannelDto, UpdateChannelDto } from "./dto/channel.dto";

@Injectable()
export class ChannelService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly PRIVILEGED_ROLES: Role[] = [Role.OWNER, Role.ADMIN];

  // GET /workspaces/:workspaceId/channels
  async getChannels(userId: string, workspaceId: string) {
    await this.requireWorkspaceMember(userId, workspaceId);

    return this.prisma.channel.findMany({
      where: {
        workspaceId,
        type: ChannelType.CHANNEL,
        OR: [
          { isPrivate: false },
          { isPrivate: true, members: { some: { userId } } },
        ],
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // POST /workspaces/:workspaceId/channels
  async createChannel(
    userId: string,
    workspaceId: string,
    dto: CreateChannelDto,
  ) {
    await this.requireWorkspaceMember(userId, workspaceId);

    return this.prisma.$transaction(async (tx) => {
      const channel = await tx.channel.create({
        data: {
          workspaceId,
          type: ChannelType.CHANNEL,
          name: dto.name,
          topic: dto.topic,
          isPrivate: dto.isPrivate ?? false,
        },
      });
      // 생성자 자동 참여
      await tx.channelMember.create({
        data: { channelId: channel.id, userId },
      });
      return channel;
    });
  }

  // GET /channels/:channelId
  async getChannel(userId: string, channelId: string) {
    const channel = await this.findChannelOrThrow(channelId);
    await this.requireChannelAccess(userId, channel);
    return channel;
  }

  // PATCH /channels/:channelId
  async updateChannel(
    userId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ) {
    const channel = await this.findChannelOrThrow(channelId);
    if (!channel.workspaceId) throw new ForbiddenException("DM 채널은 수정할 수 없습니다.");
    await this.requireWorkspaceAdminOrOwner(userId, channel.workspaceId);
    return this.prisma.channel.update({
      where: { id: channelId },
      data: dto,
    });
  }

  // DELETE /channels/:channelId
  async deleteChannel(userId: string, channelId: string) {
    const channel = await this.findChannelOrThrow(channelId);
    if (!channel.workspaceId) throw new ForbiddenException("DM 채널은 삭제할 수 없습니다.");
    await this.requireWorkspaceAdminOrOwner(userId, channel.workspaceId);
    await this.prisma.channel.delete({ where: { id: channelId } });
  }

  // POST /channels/:channelId/members/me
  async joinChannel(userId: string, channelId: string) {
    const channel = await this.findChannelOrThrow(channelId);

    if (channel.isPrivate) {
      throw new ForbiddenException(
        "Private 채널은 초대를 통해서만 참여할 수 있습니다.",
      );
    }

    const already = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (already) throw new ConflictException("이미 참여 중인 채널입니다.");

    await this.prisma.channelMember.create({
      data: { channelId, userId },
    });
  }

  // DELETE /channels/:channelId/members/me
  async leaveChannel(userId: string, channelId: string) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new NotFoundException("참여 중인 채널이 아닙니다.");

    await this.prisma.channelMember.delete({
      where: { channelId_userId: { channelId, userId } },
    });
  }

  // GET /channels/:channelId/members
  async getChannelMembers(userId: string, channelId: string) {
    const channel = await this.findChannelOrThrow(channelId);
    await this.requireChannelMember(userId, channelId);

    return this.prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: { select: { id: true, name: true, avatar: true, status: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  // ─── 헬퍼 ───────────────────────────────────────────────

  private async findChannelOrThrow(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException("채널을 찾을 수 없습니다.");
    return channel;
  }

  private async requireWorkspaceMember(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new ForbiddenException();
    return membership;
  }

  private async requireWorkspaceAdminOrOwner(
    userId: string,
    workspaceId: string,
  ) {
    const membership = await this.requireWorkspaceMember(userId, workspaceId);
    if (!this.PRIVILEGED_ROLES.includes(membership.role)) {
      throw new ForbiddenException();
    }
  }

  private async requireChannelMember(userId: string, channelId: string) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new ForbiddenException();
  }

  private async requireChannelAccess(
    userId: string,
    channel: { workspaceId: string | null; isPrivate: boolean; id: string },
  ) {
    if (channel.workspaceId) {
      await this.requireWorkspaceMember(userId, channel.workspaceId);
    } else {
      // DM 채널 — ChannelMember 여부로 접근 제어
      await this.requireChannelMember(userId, channel.id);
      return;
    }
    if (channel.isPrivate) {
      await this.requireChannelMember(userId, channel.id);
    }
  }
}
