import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import { InvitationService } from "./invitation.service";
import { Public } from "../../common/decorators/public.decorator";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";

/**
 * 토큰 단위 초대 라우트.
 *
 * - GET    /invitations/:token         → Public (가입 전 워크스페이스 정보 미리보기 용)
 * - POST   /invitations/:token/accept  → 인증된 사용자만
 * - DELETE /invitations/:token         → 워크스페이스 OWNER / ADMIN 만 (서비스에서 검증)
 */
@Controller("invitations")
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Public()
  @Get(":token")
  getByToken(@Param("token") token: string) {
    return this.invitationService.getInvitationByToken(token);
  }

  @Post(":token/accept")
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param("token") token: string,
  ) {
    return this.invitationService.acceptInvitation(
      user.userId,
      user.email,
      token,
    );
  }

  @Delete(":token")
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("token") token: string,
  ) {
    return this.invitationService.cancelInvitation(user.userId, token);
  }
}
