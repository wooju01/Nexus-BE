import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
} from "class-validator";
import { Priority, TaskStatus } from "@prisma/client";

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  description?: unknown;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsString()
  parentTaskId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeIds?: string[];
}
