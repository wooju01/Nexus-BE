import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role, RsvpStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { ChatGateway } from "../gateway/chat.gateway";
import {
  CalendarEventResponse,
  toCalendarEventResponse,
} from "./dto/event-response.dto";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

/**
 * 캘린더 도메인 서비스.
 *
 * 정책 (결정 사항):
 *  - 가시성: 워크스페이스 멤버 전원 모든 이벤트 조회·생성 가능
 *  - 수정/삭제: 작성자 본인 OR 워크스페이스 OWNER/ADMIN
 *  - 작성자는 생성 시 자동으로 ACCEPTED 참가자에 포함 (dedupe)
 *  - 시간: `endAt > startAt` 강제, 60일 초과 범위 조회 거절
 *  - 응답: 항상 participants(+user 정보) join 해서 반환
 *
 * `:workspaceId` 멤버십 검증은 controller 의 `WorkspaceMemberGuard` 가 이미 끝낸 상태로 가정.
 * service 는 데이터 계층 권한(작성자/관리자)만 책임진다.
 */
@Injectable()
export class CalendarService {
  /** 한 번에 조회할 수 있는 시간 범위 상한 — 사고 방지용 cap. */
  private static readonly MAX_RANGE_DAYS = 60;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  /**
   * Prisma include 옵션 — 응답 DTO 변환에 필요한 join 을 한 곳에 모아둔다.
   * 모든 read 쿼리가 동일한 셰이프를 보장.
   */
  private static readonly INCLUDE_PARTICIPANTS = {
    participants: {
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    },
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  // ───────────────────────── List / Get ─────────────────────────

  async list(
    workspaceId: string,
    from: string,
    to: string,
  ): Promise<CalendarEventResponse[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (toDate.getTime() <= fromDate.getTime()) {
      throw new BadRequestException("`to` 는 `from` 보다 이후여야 합니다.");
    }

    const rangeDays =
      (toDate.getTime() - fromDate.getTime()) / CalendarService.MS_PER_DAY;
    if (rangeDays > CalendarService.MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `조회 범위는 최대 ${CalendarService.MAX_RANGE_DAYS}일까지 가능합니다.`,
      );
    }

    // 시간 범위와 "겹치는" 모든 이벤트: 이벤트의 [startAt, endAt] 가 [from, to] 와 한 점이라도 교차.
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        workspaceId,
        startAt: { lt: toDate },
        endAt: { gt: fromDate },
      },
      include: CalendarService.INCLUDE_PARTICIPANTS,
      orderBy: { startAt: "asc" },
    });

    return events.map(toCalendarEventResponse);
  }

  async getOne(
    workspaceId: string,
    eventId: string,
  ): Promise<CalendarEventResponse> {
    const event = await this.findEventOrThrow(workspaceId, eventId);
    return toCalendarEventResponse(event);
  }

  // ───────────────────────── Create ─────────────────────────

  async create(
    workspaceId: string,
    createdById: string,
    dto: CreateEventDto,
  ): Promise<CalendarEventResponse> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertTimeOrder(startAt, endAt);

    // 작성자 본인은 자동으로 ACCEPTED 참가자에 포함. dedupe 까지 처리.
    const participantIdSet = new Set<string>(dto.participantIds ?? []);
    participantIdSet.add(createdById);
    const otherParticipantIds = Array.from(participantIdSet).filter(
      (id) => id !== createdById,
    );

    const event = await this.prisma.calendarEvent.create({
      data: {
        workspaceId,
        createdById,
        title: dto.title,
        description: dto.description ?? null,
        startAt,
        endAt,
        allDay: dto.allDay ?? false,
        location: dto.location ?? null,
        color: dto.color ?? null,
        participants: {
          create: [
            { userId: createdById, status: RsvpStatus.ACCEPTED },
            ...otherParticipantIds.map((userId) => ({
              userId,
              status: RsvpStatus.PENDING,
            })),
          ],
        },
      },
      include: CalendarService.INCLUDE_PARTICIPANTS,
    });

    // 초대된 참가자에게 알림 (best-effort)
    if (otherParticipantIds.length > 0) {
      void (async () => {
        const creator = await this.prisma.user.findUnique({
          where: { id: createdById },
          select: { name: true },
        });
        const notifications = await Promise.all(
          otherParticipantIds.map((participantId) =>
            this.prisma.notification.create({
              data: {
                userId: participantId,
                type: "EVENT_INVITED",
                title: `일정 초대: ${dto.title}`,
                body: `${creator?.name ?? "누군가"}님이 일정에 초대했습니다.`,
                linkUrl: `/calendar`,
                metadata: { eventId: event.id },
              },
            }),
          ),
        );
        for (const notif of notifications) {
          this.gateway.notifyUser(notif.userId, notif);
        }
      })();
    }

    return toCalendarEventResponse(event);
  }

  // ───────────────────────── Update / Delete ─────────────────────────

  async update(
    workspaceId: string,
    eventId: string,
    currentUserId: string,
    dto: UpdateEventDto,
  ): Promise<CalendarEventResponse> {
    const existing = await this.findEventOrThrow(workspaceId, eventId);
    await this.assertCanModify(
      workspaceId,
      currentUserId,
      existing.createdById,
    );

    // 시간이 바뀌는 경우, 변경된 값과 기존 값 조합으로 순서 검증.
    const nextStart = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const nextEnd = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    if (dto.startAt !== undefined || dto.endAt !== undefined) {
      this.assertTimeOrder(nextStart, nextEnd);
    }

    // 참가자 변경 처리:
    //   - participantIds 가 본문에 있으면 "전체 교체" 의도로 해석.
    //   - 작성자는 항상 ACCEPTED 로 유지 (다른 사람이 작성자를 교체할 수 없음).
    //   - 미지정이면 참가자 그대로 둔다.
    const participantsUpdate = dto.participantIds
      ? {
          deleteMany: { eventId },
          create: this.buildParticipantsForReplace(
            existing.createdById,
            dto.participantIds,
          ),
        }
      : undefined;

    const event = await this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: dto.title,
        description: dto.description,
        startAt: dto.startAt ? nextStart : undefined,
        endAt: dto.endAt ? nextEnd : undefined,
        allDay: dto.allDay,
        location: dto.location,
        color: dto.color,
        participants: participantsUpdate,
      },
      include: CalendarService.INCLUDE_PARTICIPANTS,
    });

    return toCalendarEventResponse(event);
  }

  async delete(
    workspaceId: string,
    eventId: string,
    currentUserId: string,
  ): Promise<void> {
    const existing = await this.findEventOrThrow(workspaceId, eventId);
    await this.assertCanModify(
      workspaceId,
      currentUserId,
      existing.createdById,
    );

    await this.prisma.calendarEvent.delete({ where: { id: eventId } });
  }

  // ───────────────────────── Helpers ─────────────────────────

  private async findEventOrThrow(workspaceId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, workspaceId },
      include: CalendarService.INCLUDE_PARTICIPANTS,
    });

    if (!event) {
      // 다른 워크스페이스의 이벤트도 동일하게 404 — 존재 여부 노출 방지.
      throw new NotFoundException("이벤트를 찾을 수 없습니다.");
    }

    return event;
  }

  /** 작성자 본인 또는 OWNER/ADMIN 만 수정·삭제 가능. */
  private async assertCanModify(
    workspaceId: string,
    currentUserId: string,
    createdById: string,
  ): Promise<void> {
    if (currentUserId === createdById) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: currentUserId, workspaceId },
      },
      select: { role: true },
    });

    const isAdmin =
      membership?.role === Role.OWNER || membership?.role === Role.ADMIN;
    if (!isAdmin) {
      throw new ForbiddenException("이 이벤트를 수정할 권한이 없습니다.");
    }
  }

  private assertTimeOrder(startAt: Date, endAt: Date): void {
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException(
        "`endAt` 은 `startAt` 보다 이후여야 합니다.",
      );
    }
  }

  private buildParticipantsForReplace(
    createdById: string,
    participantIds: string[],
  ) {
    const set = new Set(participantIds);
    set.add(createdById);
    return Array.from(set).map((userId) => ({
      userId,
      status: userId === createdById ? RsvpStatus.ACCEPTED : RsvpStatus.PENDING,
    }));
  }
}
