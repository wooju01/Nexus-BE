import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Role } from "@prisma/client";
import type { UpdateMemberRoleDto } from "./dto/member-role.dto";

// ADMIN이 관리할 수 있는 역할 (자신보다 낮은 레벨)
const ADMIN_MANAGEABLE: Role[] = [Role.MEMBER, Role.GUEST];

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /workspaces/:id/members
  async getMembers(userId: string, workspaceId: string) {
    await this.requireMembership(userId, workspaceId);
    return this.prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, jobTitle: true, avatar: true, status: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  // GET /workspaces/:id/presence
  async getMemberPresence(userId: string, workspaceId: string) {
    await this.requireMembership(userId, workspaceId);
    return this.prisma.membership.findMany({
      where: { workspaceId },
      select: {
        userId: true,
        user: {
          select: { status: true, lastSeenAt: true },
        },
      },
    });
  }

  // PATCH /workspaces/:id/members/:targetUserId
  async updateMemberRole(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException("자신의 역할은 변경할 수 없습니다.");
    }

    const myMembership = await this.requireMembership(userId, workspaceId);
    const target = await this.getMembershipOrThrow(targetUserId, workspaceId);

    // OWNER는 추방 불가
    if (target.role === Role.OWNER) {
      throw new ForbiddenException("OWNER의 역할은 변경할 수 없습니다.");
    }

    // ADMIN은 MEMBER/GUEST만 변경 가능
    if (
      myMembership.role === Role.ADMIN &&
      !ADMIN_MANAGEABLE.includes(target.role)
    ) {
      throw new ForbiddenException();
    }

    // MEMBER/GUEST는 권한 없음
    if (!([Role.OWNER, Role.ADMIN] as Role[]).includes(myMembership.role)) {
      throw new ForbiddenException();
    }

    return this.prisma.membership.update({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  // DELETE
  async removeMember(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException("자기 자신은 추방할 수 없습니다.");
    }

    const myMembership = await this.requireMembership(userId, workspaceId);
    const target = await this.getMembershipOrThrow(targetUserId, workspaceId);

    if (target.role === Role.OWNER) {
      throw new ForbiddenException("OWNER는 추방할 수 없습니다.");
    }

    if (
      myMembership.role === Role.ADMIN &&
      !ADMIN_MANAGEABLE.includes(target.role)
    ) {
      throw new ForbiddenException();
    }

    if (!([Role.OWNER, Role.ADMIN] as Role[]).includes(myMembership.role)) {
      throw new ForbiddenException();
    }

    await this.prisma.membership.delete({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });
  }

  // 멤버십 존재 여부 확인
  private async requireMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new ForbiddenException();
    return membership;
  }

  // 멤버십 조회 (없으면 예외)
  private async getMembershipOrThrow(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership)
      throw new NotFoundException("해당 멤버를 찾을 수 없습니다.");
    return membership;
  }
}
