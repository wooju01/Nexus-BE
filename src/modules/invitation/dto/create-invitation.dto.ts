import { IsEmail, IsIn, IsOptional, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { Role } from "@prisma/client";

/**
 * POST /workspaces/:workspaceId/invitations 요청 바디.
 *
 * - email: 초대 받을 사용자의 이메일. 가입 후 수락 시 이 이메일과 일치해야 함.
 *   `@Transform` 으로 trim + lowercase 정규화 → 대소문자 차이로 인한 중복 초대 방지.
 * - role: ADMIN 또는 MEMBER 만 허용 (`@IsIn`). 미지정 시 service 에서 MEMBER 적용.
 *   OWNER 는 워크스페이스 생성자만 가질 수 있고, GUEST 는 초대 흐름과 별개라 불가.
 */
export class CreateInvitationDto {
  @IsEmail({}, { message: "올바른 이메일 형식이 아닙니다." })
  @MaxLength(254, { message: "이메일은 254자를 넘을 수 없습니다." })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") return value;
    return value.trim().toLowerCase();
  })
  email!: string;

  @IsOptional()
  @IsIn([Role.ADMIN, Role.MEMBER], {
    message: "역할은 ADMIN 또는 MEMBER 만 가능합니다.",
  })
  role?: Role;
}
