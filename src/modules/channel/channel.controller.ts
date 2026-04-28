import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { ChannelService } from "./channel.service";
import type { UpdateChannelDto } from "./dto/channel.dto";

@Controller("channels")
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get(":channelId")
  getChannel(@Req() req: Request, @Param("channelId") channelId: string) {
    const { userId } = req.user as { userId: string };
    return this.channelService.getChannel(userId, channelId);
  }

  @Patch(":channelId")
  updateChannel(
    @Req() req: Request,
    @Param("channelId") channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.channelService.updateChannel(userId, channelId, dto);
  }

  @Delete(":channelId")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteChannel(@Req() req: Request, @Param("channelId") channelId: string) {
    const { userId } = req.user as { userId: string };
    return this.channelService.deleteChannel(userId, channelId);
  }

  @Post(":channelId/members/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  joinChannel(@Req() req: Request, @Param("channelId") channelId: string) {
    const { userId } = req.user as { userId: string };
    return this.channelService.joinChannel(userId, channelId);
  }

  @Delete(":channelId/members/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  leaveChannel(@Req() req: Request, @Param("channelId") channelId: string) {
    const { userId } = req.user as { userId: string };
    return this.channelService.leaveChannel(userId, channelId);
  }

  @Get(":channelId/members")
  getChannelMembers(
    @Req() req: Request,
    @Param("channelId") channelId: string,
  ) {
    const { userId } = req.user as { userId: string };
    return this.channelService.getChannelMembers(userId, channelId);
  }
}
