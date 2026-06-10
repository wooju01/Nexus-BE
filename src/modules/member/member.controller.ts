import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { MemberService } from "./member.service";
import type { UpdateMemberRoleDto } from "./dto/member-role.dto";

@Controller("workspaces/:workspaceId/members")
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  getMembers(@Req() req: Request, @Param("workspaceId") workspaceId: string) {
    const { userId } = req.user as { userId: string };
    return this.memberService.getMembers(userId, workspaceId);
  }

  @Get("presence")
  getMemberPresence(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
  ) {
    const { userId } = req.user as { userId: string };
    return this.memberService.getMemberPresence(userId, workspaceId);
  }

  @Patch(":targetUserId")
  updateMemberRole(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
    @Param("targetUserId") targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.memberService.updateMemberRole(
      userId,
      workspaceId,
      targetUserId,
      dto,
    );
  }

  @Delete(":targetUserId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
    @Param("targetUserId") targetUserId: string,
  ) {
    const { userId } = req.user as { userId: string };
    return this.memberService.removeMember(userId, workspaceId, targetUserId);
  }
}
