import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChannelType } from "@prisma/client";
import type { CreateDmDto } from "./dto/dm.dto";

@Injectable()
export class DmService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /dms — 내 모든 DM 목록 (글로벌)
  async getDms(userId: string) {
    return this.prisma.channel.findMany({
      where: {
        type: ChannelType.DM,
        members: { some: { userId } },
      },
      include: {
        members: {
          where: { userId: { not: userId } },
          include: {
            user: {
              select: { id: true, name: true, avatar: true, status: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // POST /dms — DM 시작 (없으면 생성, 있으면 반환)
  async createDm(userId: string, dto: CreateDmDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException("자기 자신과 DM을 시작할 수 없습니다.");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("유저를 찾을 수 없습니다.");

    // 이미 존재하는 DM 채널 확인 (글로벌)
    const existing = await this.prisma.channel.findFirst({
      where: {
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
        data: { type: ChannelType.DM }, // workspaceId 없음 — 글로벌 DM
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

  async requireDmAccess(userId: string, channelId: string) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new ForbiddenException("DM 접근 권한이 없습니다.");
  }
}
