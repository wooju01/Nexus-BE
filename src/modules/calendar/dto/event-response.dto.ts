import type { CalendarEvent, CalendarParticipant, User } from "@prisma/client";

/**
 * 응답에 사용되는 형태.
 *
 * Prisma 모델을 그대로 노출하지 않고 plain object 로 직렬화한다.
 * 이유:
 *  - DB 의 모든 컬럼이 외부에 필요한 건 아님 (예: Prisma 내부 메타)
 *  - 향후 변환 (예: 날짜 포맷, 참가자 사용자 정보 join)에서 자유도 확보
 *  - FE 타입 (`types/domain.ts`) 과 1:1 매칭하기 쉬움
 */
export type CalendarParticipantResponse = {
  userId: string;
  status: CalendarParticipant["status"];
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
};

export type CalendarEventResponse = {
  id: string;
  workspaceId: string;
  createdById: string;
  title: string;
  description: string | null;
  startAt: string; // ISO 8601 UTC
  endAt: string;
  allDay: boolean;
  location: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  participants: CalendarParticipantResponse[];
};

/**
 * Prisma 결과를 응답 셰이프로 변환.
 *
 * `participants` 는 항상 join 된 상태로 들어와야 한다 (service 가 include 책임).
 */
export function toCalendarEventResponse(
  event: CalendarEvent & {
    participants: (CalendarParticipant & {
      user: Pick<User, "id" | "name" | "avatar">;
    })[];
  },
): CalendarEventResponse {
  return {
    id: event.id,
    workspaceId: event.workspaceId,
    createdById: event.createdById,
    title: event.title,
    description: event.description,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    allDay: event.allDay,
    location: event.location,
    color: event.color,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    participants: event.participants.map((p) => ({
      userId: p.userId,
      status: p.status,
      user: {
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar,
      },
    })),
  };
}
