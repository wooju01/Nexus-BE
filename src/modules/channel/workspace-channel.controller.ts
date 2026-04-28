import { Controller, Get, Post, Param, Body, Req } from "@nestjs/common";
import type { Request } from "express";
import { ChannelService } from "./channel.service";
import type { CreateChannelDto } from "./dto/channel.dto";

@Controller("workspaces/:workspaceId/channels")
export class WorkspaceChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get()
  getChannels(@Req() req: Request, @Param("workspaceId") workspaceId: string) {
    const { userId } = req.user as { userId: string };
    return this.channelService.getChannels(userId, workspaceId);
  }

  @Post()
  createChannel(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateChannelDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.channelService.createChannel(userId, workspaceId, dto);
  }
}
