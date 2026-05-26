import { IsEnum } from "class-validator";
import { ProjectRole } from "@prisma/client";

export class UpdateProjectMemberDto {
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
