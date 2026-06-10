import { Controller, Get, Post, Param, Body, Req, Query } from "@nestjs/common";
import type { Request } from "express";
import { MessageService } from "./message.service";
import { ChatGateway } from "../gateway/chat.gateway";
import type {
  SendMessageDto,
  ReadMarkerDto,
  MessageQueryDto,
} from "./dto/message.dto";

@Controller("channels/:channelId")
export class ChannelMessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly gateway: ChatGateway,
  ) {}

  @Get("messages")
  getMessages(
    @Req() req: Request,
    @Param("channelId") channelId: string,
    @Query() query: MessageQueryDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.messageService.getMessages(userId, channelId, query);
  }

  @Post("messages")
  async sendMessage(
    @Req() req: Request,
    @Param("channelId") channelId: string,
    @Body() dto: SendMessageDto,
  ) {
    const { userId } = req.user as { userId: string };
    const message = await this.messageService.sendMessage(
      userId,
      channelId,
      dto,
    );
    this.gateway.broadcastToChannel("message.created", channelId, message);
    return message;
  }

  @Post("read-markers")
  updateReadMarker(
    @Req() req: Request,
    @Param("channelId") channelId: string,
    @Body() dto: ReadMarkerDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.messageService.updateReadMarker(userId, channelId, dto);
  }
}
