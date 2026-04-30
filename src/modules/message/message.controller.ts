import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { MessageService } from "./message.service";
import type { UpdateMessageDto, AddReactionDto, SendMessageDto } from "./dto/message.dto";

@Controller("messages")
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Patch(":messageId")
  updateMessage(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.messageService.updateMessage(userId, messageId, dto);
  }

  @Delete(":messageId")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMessage(@Req() req: Request, @Param("messageId") messageId: string) {
    const { userId } = req.user as { userId: string };
    return this.messageService.deleteMessage(userId, messageId);
  }

  @Get(":messageId/replies")
  getReplies(@Req() req: Request, @Param("messageId") messageId: string) {
    const { userId } = req.user as { userId: string };
    return this.messageService.getReplies(userId, messageId);
  }

  @Post(":messageId/replies")
  addReply(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Body() dto: SendMessageDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.messageService.addReply(userId, messageId, dto);
  }

  @Post(":messageId/reactions")
  @HttpCode(HttpStatus.NO_CONTENT)
  addReaction(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.messageService.addReaction(userId, messageId, dto);
  }

  @Delete(":messageId/reactions/:emoji")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeReaction(
    @Req() req: Request,
    @Param("messageId") messageId: string,
    @Param("emoji") emoji: string,
  ) {
    const { userId } = req.user as { userId: string };
    return this.messageService.removeReaction(userId, messageId, emoji);
  }
}
