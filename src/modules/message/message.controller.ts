import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { MessageService } from "./message.service";
import { ChatGateway } from "../gateway/chat.gateway";
import type { UpdateMessageDto, AddReactionDto, SendMessageDto } from "./dto/message.dto";

@Controller("messages")
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly gateway: ChatGateway,
  ) {}

  @Patch(":messageId")
  async updateMessage(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    const { userId } = req.user as { userId: string };
    const message = await this.messageService.updateMessage(userId, messageId, dto);
    this.gateway.broadcastToChannel("message.updated", message.channelId, message);
    return message;
  }

  @Delete(":messageId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Req() req: Request, @Param("messageId") messageId: string) {
    const { userId } = req.user as { userId: string };
    const { channelId } = await this.messageService.deleteMessage(userId, messageId);
    this.gateway.broadcastToChannel("message.deleted", channelId, { messageId });
  }

  @Get(":messageId/replies")
  getReplies(@Req() req: Request, @Param("messageId") messageId: string) {
    const { userId } = req.user as { userId: string };
    return this.messageService.getReplies(userId, messageId);
  }

  @Post(":messageId/replies")
  async addReply(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Body() dto: SendMessageDto,
  ) {
    const { userId } = req.user as { userId: string };
    const reply = await this.messageService.addReply(userId, messageId, dto);
    this.gateway.broadcastToChannel("message.created", reply.channelId, reply);
    return reply;
  }

  @Post(":messageId/reactions")
  @HttpCode(HttpStatus.NO_CONTENT)
  async addReaction(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    const { userId } = req.user as { userId: string };
    const { channelId } = await this.messageService.addReaction(userId, messageId, dto);
    this.gateway.broadcastToChannel("reaction.added", channelId, {
      messageId,
      userId,
      emoji: dto.emoji,
    });
  }

  @Delete(":messageId/reactions/:emoji")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeReaction(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Param("emoji") emoji: string,
  ) {
    const { userId } = req.user as { userId: string };
    const { channelId } = await this.messageService.removeReaction(userId, messageId, emoji);
    this.gateway.broadcastToChannel("reaction.removed", channelId, {
      messageId,
      userId,
      emoji,
    });
  }
}
