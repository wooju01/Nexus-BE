import { Role } from "@prisma/client";

export type UpdateMemberRoleDto = {
  role: Exclude<Role, "OWNER">;
};
