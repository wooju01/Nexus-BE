import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Request } from "express";

import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

/**
 * URL 의 `:workspaceId` 파라미터가 현재 사용자(JWT)의 Membership 에 있는지 검증.
 *
 * 사용 위치:
 *   `JwtAuthGuard` 통과 후, 워크스페이스 nested 라우트에 적용한다.
 *   예) `@UseGuards(WorkspaceMemberGuard)` on a controller with
 *       `@Controller('workspaces/:workspaceId/calendar/events')`.
 *
 * 동작:
 *   - workspaceId 파라미터 누락 → 500 가까운 미스로 보고 명시적 에러 (구성 실수)
 *   - 사용자 미인증 (req.user 없음) → 사실상 JwtAuthGuard 가 먼저 차단하지만 방어선
 *   - 멤버십 없음 → 403 (FORBIDDEN, 워크스페이스 존재 자체를 노출하지 않기 위함)
 *   - 멤버십 있음 → 통과. 후속 핸들러에서 role 추가 검증이 필요하면 별도 가드/체크
 *
 * 성능 메모: 한 번의 `findUnique` 쿼리로 끝남. 핫패스라면 추후 Redis 캐시 검토.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceMemberGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const user = request.user;
    if (!user?.userId) {
      // JwtAuthGuard 가 이미 막아야 정상이지만, 가드 적용 누락 대비.
      throw new ForbiddenException("인증된 사용자만 접근 가능합니다.");
    }

    const workspaceId = this.extractWorkspaceId(request);
    if (!workspaceId) {
      // 라우트에 :workspaceId 가 없는데 이 가드를 붙인 구성 실수.
      throw new NotFoundException("workspaceId 가 URL 파라미터에 없습니다.");
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.userId,
          workspaceId,
        },
      },
      select: { id: true, role: true },
    });

    if (!membership) {
      // 워크스페이스가 실제로 없는지(404) 멤버가 아닌지(403) 구분하지 않는다.
      // 존재 자체를 외부에 노출하지 않기 위함.
      throw new ForbiddenException("해당 워크스페이스에 접근할 수 없습니다.");
    }

    // 후속 핸들러에서 role 정책을 적용할 수 있도록 컨텍스트에 부착.
    (request as Request & { membership?: { role: string } }).membership = {
      role: membership.role,
    };

    return true;
  }

  /**
   * Express 라우트 + Nest sub-routing 모두 대응.
   * 컨트롤러 prefix 가 `workspaces/:workspaceId/...` 이면 `request.params.workspaceId` 에 들어옴.
   */
  private extractWorkspaceId(request: Request): string | undefined {
    const value = (request.params as Record<string, string | undefined>)
      ?.workspaceId;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
