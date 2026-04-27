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
 * 캘린더 이벤트 부분 업데이트.
 *
 * `CreateEventDto` 와 동일한 필드의 optional 버전.
 * `@nestjs/mapped-types` 의 `PartialType` 을 쓰면 한 줄로 끝나지만,
 * 추가 의존성 없이 두 DTO 를 명시적으로 유지한다.
 *
 * 시각 변경 시 `endAt > startAt` 검증은 service 가 둘 중 변경된 쪽 + 기존 값 조합으로 검사.
 */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

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
