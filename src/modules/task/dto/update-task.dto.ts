import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsInt,
  ValidateIf,
} from "class-validator";
import { Priority, TaskStatus } from "@prisma/client";

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  description?: unknown;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  // null 이 들어오면 dueDate 를 unset (마감일 제거).
  // ValidateIf 로 null 일 때 IsDateString 검사를 건너뛴다.
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeIds?: string[];

  /** 태스크에 붙일 라벨 ID 배열. 빈 배열이면 모두 제거. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}
