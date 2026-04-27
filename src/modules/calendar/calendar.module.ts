import { Module } from "@nestjs/common";

import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";

/**
 * 캘린더 도메인 모듈.
 *
 * `PrismaService` 는 글로벌 `PrismaModule` 을 통해 자동 주입되므로 imports 불필요.
 * `WorkspaceMemberGuard` 는 컨트롤러에서 `@UseGuards` 로 직접 적용 — 이 모듈에선
 * 별도 provider 등록 없이 `common/guards` 의 클래스를 그대로 가져다 씀.
 */
@Module({
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
