import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";
import { ProjectRole } from "@prisma/client";

export class AddProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole;
}
