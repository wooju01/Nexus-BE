import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

/**
 * 현재 인증된 사용자 정보를 컨트롤러 인자로 꺼내는 파라미터 데코레이터.
 *
 * `JwtStrategy.validate` 가 반환한 값이 `req.user` 로 들어오는 구조 (NestJS Passport 표준).
 * 글로벌 `JwtAuthGuard` 가 통과시킨 라우트에서만 의미가 있으므로,
 * `@Public()` 라우트에서 호출하면 `null` 이 들어올 수 있다는 점에 유의.
 *
 * 사용 예:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export type AuthenticatedUser = {
  userId: string;
  email: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: AuthenticatedUser }).user;

    // @Public() 라우트가 아닌데도 user 가 비어있다면 가드 설정 누락 가능성.
    // 명확한 에러로 빨리 드러나도록 던진다.
    if (!user || !user.userId) {
      throw new UnauthorizedException(
        "인증 정보가 누락됐습니다. JwtAuthGuard 또는 @Public() 설정을 확인하세요.",
      );
    }

    return user;
  },
);
