import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  CurrentUser,
  type AuthenticatedUser,
} from "../../common/decorators/current-user.decorator";
import { WorkspaceMemberGuard } from "../../common/guards/workspace-member.guard";
import { CalendarService } from "./calendar.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { ListEventsDto } from "./dto/list-events.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

/**
 * 캘린더 이벤트 라우트 — 워크스페이스 nested.
 *
 * 글로벌 prefix `/v1` 가 main.ts 에서 붙으므로 실제 경로는
 *   `/v1/workspaces/:workspaceId/calendar/events[/:eventId]`
 *
 * 가드 적용 순서:
 *   1) 글로벌 `JwtAuthGuard` (AppModule APP_GUARD) — JWT 검증 + `req.user` 채움
 *   2) 컨트롤러 `WorkspaceMemberGuard` — `:workspaceId` 멤버십 검증
 *
 * 데이터 단 권한(작성자/관리자)은 service 가 책임진다.
 */
@Controller("workspaces/:workspaceId/calendar/events")
@UseGuards(WorkspaceMemberGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  list(
    @Param("workspaceId") workspaceId: string,
    @Query() query: ListEventsDto,
  ) {
    return this.calendarService.list(workspaceId, query.from, query.to);
  }

  @Get(":eventId")
  getOne(
    @Param("workspaceId") workspaceId: string,
    @Param("eventId") eventId: string,
  ) {
    return this.calendarService.getOne(workspaceId, eventId);
  }

  @Post()
  create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.create(workspaceId, user.userId, dto);
  }

  @Patch(":eventId")
  update(
    @Param("workspaceId") workspaceId: string,
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.update(workspaceId, eventId, user.userId, dto);
  }

  @Delete(":eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param("workspaceId") workspaceId: string,
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.delete(workspaceId, eventId, user.userId);
  }
}
