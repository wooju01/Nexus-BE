import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { FriendService } from "./friend.service";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";

@Controller("friends")
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post("requests")
  @HttpCode(HttpStatus.CREATED)
  async sendRequest(@Req() req: Request, @Body() dto: SendFriendRequestDto) {
    const user = req.user as { userId: string };
    return this.friendService.sendRequest(user.userId, dto);
  }

  @Get("requests/received")
  async getReceivedRequests(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.friendService.getReceivedRequests(user.userId);
  }

  @Get("requests/sent")
  async getSentRequests(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.friendService.getSentRequests(user.userId);
  }

  @Patch("requests/:id/accept")
  async acceptRequest(@Req() req: Request, @Param("id") id: string) {
    const user = req.user as { userId: string };
    return this.friendService.acceptRequest(user.userId, id);
  }

  @Patch("requests/:id/decline")
  @HttpCode(HttpStatus.NO_CONTENT)
  async declineRequest(@Req() req: Request, @Param("id") id: string) {
    const user = req.user as { userId: string };
    return this.friendService.declineRequest(user.userId, id);
  }

  @Get()
  async getFriends(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.friendService.getFriends(user.userId);
  }

  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFriend(@Req() req: Request, @Param("userId") friendUserId: string) {
    const user = req.user as { userId: string };
    return this.friendService.removeFriend(user.userId, friendUserId);
  }
}
