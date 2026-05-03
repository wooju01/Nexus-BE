import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { MemberModule } from './modules/member/member.module'
import { ChannelModule } from './modules/channel/channel.module';
import { MessageModule } from './modules/message/message.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { DmModule } from './modules/dm/dm.module';

/**
 * 루트 모듈.
 *
 * 글로벌 적용:
 * - APP_GUARD: JwtAuthGuard — `@Public()` 표시한 라우트만 통과
 * - APP_FILTER: HttpExceptionFilter — CLAUDE.md §11 응답 셰이프 통일
 *
 * 두 가지 모두 DI 컨테이너 안에서 의존성을 받기 위해 useGlobalGuards/Filters 대신
 * provider 토큰 방식으로 등록한다.
 */
@Module({
  imports: [PrismaModule, AuthModule, CalendarModule, WorkspaceModule, MemberModule, ChannelModule, MessageModule, GatewayModule, DmModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
