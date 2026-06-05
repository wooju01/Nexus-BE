import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Role } from "@prisma/client";
import type {
  SendMessageDto,
  UpdateMessageDto,
  AddReactionDto,
  ReadMarkerDto,
  MessageQueryDto,
} from "./dto/message.dto";

const DEFAULT_LIMIT = 50;

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /channels/:channelId/messages
  async getMessages(userId: string, channelId: string, query: MessageQueryDto) {
    await this.requireChannelMember(userId, channelId);

    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, 100);

    // cursor가 있으면 해당 메시지보다 오래된 것부터
    const cursorCondition = query.cursor
      ? { createdAt: { lt: await this.getMessageCreatedAt(query.cursor) } }
      : {};

    return this.prisma.message.findMany({
      where: {
        channelId,
        parentId: null, // 루트 메시지만 (스레드 답글 제외)
        deletedAt: null,
        ...cursorCondition,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reactions: {
          select: { emoji: true, userId: true },
        },
        _count: { select: { replies: true } },
        replies: {
          // 스레드 참여자 아바타 스택용 — 최근 3명
          where: { deletedAt: null },
          select: {
            author: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // POST /channels/:channelId/messages
  async sendMessage(userId: string, channelId: string, dto: SendMessageDto) {
    await this.requireChannelMember(userId, channelId);

    // 스레드 답글이면 부모가 같은 채널에 있는지 확인
    if (dto.parentId) {
      const parent = await this.prisma.message.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.channelId !== channelId) {
        throw new BadRequestException("유효하지 않은 parentId입니다.");
      }
    }

    return this.prisma.message.create({
      data: {
        channelId,
        authorId: userId,
        content: dto.content,
        parentId: dto.parentId ?? null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  // PATCH /messages/:messageId
  async updateMessage(
    userId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const message = await this.findMessageOrThrow(messageId);

    if (message.authorId !== userId) {
      throw new ForbiddenException("본인 메시지만 수정할 수 있습니다.");
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content, editedAt: new Date() },
    });
  }

  // DELETE /messages/:messageId — soft delete
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!message) throw new NotFoundException("메시지를 찾을 수 없습니다.");

    const isAuthor = message.authorId === userId;
    const isPrivileged = message.channel.workspaceId
      ? await this.isWorkspaceAdminOrOwner(userId, message.channel.workspaceId)
      : false; // DM 채널은 워크스페이스 권한 없음 — 작성자만 삭제 가능

    if (!isAuthor && !isPrivileged) throw new ForbiddenException();

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    return { channelId: message.channelId };
  }

  // GET /messages/:messageId/replies
  async getReplies(userId: string, messageId: string) {
    const message = await this.findMessageOrThrow(messageId);
    await this.requireChannelMember(userId, message.channelId);

    return this.prisma.message.findMany({
      where: { parentId: messageId, deletedAt: null },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // POST /messages/:messageId/replies
  async addReply(userId: string, messageId: string, dto: SendMessageDto) {
    const message = await this.findMessageOrThrow(messageId);

    // 답글의 답글 방지 — 스레드는 1depth
    if (message.parentId) {
      throw new BadRequestException("스레드 답글에는 답글을 달 수 없습니다.");
    }

    return this.sendMessage(userId, message.channelId, {
      content: dto.content,
      parentId: messageId,
    });
  }

  // POST /channels/:channelId/read-markers
  async updateReadMarker(
    userId: string,
    channelId: string,
    dto: ReadMarkerDto,
  ) {
    await this.requireChannelMember(userId, channelId);

    return this.prisma.readMarker.upsert({
      where: { userId_channelId: { userId, channelId } },
      update: {
        lastReadMessageId: dto.lastReadMessageId,
        lastReadAt: new Date(),
      },
      create: { userId, channelId, lastReadMessageId: dto.lastReadMessageId },
    });
  }

  // POST /messages/:messageId/reactions
  async addReaction(userId: string, messageId: string, dto: AddReactionDto) {
    const message = await this.findMessageOrThrow(messageId);
    await this.requireChannelMember(userId, message.channelId);

    // @@unique([messageId, userId, emoji]) — 중복 시 무시
    await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: dto.emoji,
        },
      },
      update: {},
      create: { messageId, userId, emoji: dto.emoji },
    });
    return { channelId: message.channelId };
  }

  // DELETE /messages/:messageId/reactions/:emoji
  // 특정 이모지 리액션 하나만 삭제 (모든 리액션 삭제는 메시지 수정으로)
  async removeReaction(userId: string, messageId: string, emoji: string) {
    const reaction = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      include: { message: { select: { channelId: true } } },
    });
    if (!reaction) throw new NotFoundException("리액션을 찾을 수 없습니다.");

    await this.prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    return { channelId: reaction.message.channelId };
  }

  // 유틸리티 메서드

  private async findMessageOrThrow(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) {
      throw new NotFoundException("메시지를 찾을 수 없습니다.");
    }
    return message;
  }

  private async requireChannelMember(userId: string, channelId: string) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) throw new ForbiddenException();
  }

  private async isWorkspaceAdminOrOwner(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    return membership?.role === Role.OWNER || membership?.role === Role.ADMIN;
  }

  private async getMessageCreatedAt(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { createdAt: true },
    });
    if (!message) throw new BadRequestException("유효하지 않은 cursor입니다.");
    return message.createdAt;
  }
}
