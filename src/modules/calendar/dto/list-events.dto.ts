import { IsISO8601 } from "class-validator";

/**
 * 캘린더 이벤트 목록 조회 query 파라미터.
 *
 * - `from`/`to` 둘 다 필수 (ISO 8601, UTC 권장).
 * - 시간 범위 자체로 페이지네이션을 대체. cursor/limit 은 v0 에서 두지 않음.
 * - 60일 초과 범위는 service 단에서 400 으로 거절 (사고 방지용 cap).
 */
export class ListEventsDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
