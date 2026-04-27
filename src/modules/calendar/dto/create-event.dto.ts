import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * 캘린더 이벤트 생성 본문.
 *
 * - 시각: `startAt`, `endAt` 둘 다 필수 ISO 8601 (UTC 권장).
 *   시간 순서 검증 (`endAt > startAt`)은 service 단에서 처리 — DTO 단계에선
 *   다른 필드와 함께 따져야 하기 때문.
 * - `participantIds`: 작성자 본인은 자동으로 ACCEPTED 로 추가되므로 여기에 안 넣어도 됨.
 *   넣어도 service 가 dedupe.
 * - `color`: BE 는 자유 문자열 통과. FE 가 알려진 토큰으로 매핑하고 unknown 은 fallback.
 */
export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  participantIds?: string[];
}
