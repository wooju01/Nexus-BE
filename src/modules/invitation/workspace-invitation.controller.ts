import { Controller, Get, Post, Param, Body } from "@nestjs/common";

import { InvitationService } from "./invitation.service";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
import { CreateInvitationDto } from "./dto/create-invitation.dto";

/**
 * 워크스페이스 단위 초대 라우트.
 *
 * 권한 정책:
 *   - POST: OWNER / ADMIN 만 (서비스 내부에서 검증)
 *   - GET : OWNER / ADMIN 만 (서비스 내부에서 검증)
 */
@Controller("workspaces/:workspaceId/invitations")
export class WorkspaceInvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationService.createInvitation(
      user.userId,
      workspaceId,
      dto,
    );
  }

  @Get()
  listPending(
    @CurrentUser() user: AuthenticatedUser,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.invitationService.listPendingInvitations(
      user.userId,
      workspaceId,
    );
  }
}
