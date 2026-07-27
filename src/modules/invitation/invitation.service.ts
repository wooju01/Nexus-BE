import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ChatGateway } from "../gateway/chat.gateway";
import { CreateInvitationDto } from "./dto/create-invitation.dto";

const INVITATION_EXPIRES_DAYS = 7;
const ALLOWED_INVITATION_ROLES: ReadonlyArray<Role> = [Role.ADMIN, Role.MEMBER];

/**
 * 워크스페이스 초대(Invitation) 도메인 서비스.
 *
 * - 토큰은 Prisma 의 `@default(cuid())` 가 자동 발급
 * - 만료: 생성 시점 + 7일
 * - status 는 DB 에 저장하지 않고 (acceptedAt, expiresAt) 으로 계산해서 응답에 부여
 *
 * 권한:
 *   - 초대 생성/조회/취소: 해당 워크스페이스의 OWNER 또는 ADMIN
 *   - 초대 토큰 단건 조회: Public (가입 안 한 사용자가 워크스페이스 정보 미리 보기 위함)
 *   - 초대 수락: 인증된 사용자
 */
@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly gateway: ChatGateway,
  ) {}

  // POST /workspaces/:workspaceId/invitations
  async createInvitation(
    inviterId: string,
    workspaceId: string,
    dto: CreateInvitationDto,
  ) {
    await this.requireRole(inviterId, workspaceId, [Role.OWNER, Role.ADMIN]);

    const role = dto.role ?? Role.MEMBER;
    if (!ALLOWED_INVITATION_ROLES.includes(role)) {
      throw new BadRequestException(
        "초대 가능한 역할은 ADMIN 또는 MEMBER 입니다.",
      );
    }

    const email = dto.email.trim().toLowerCase();
    if (!email) throw new BadRequestException("이메일이 비어있습니다.");

    // 이미 워크스페이스 멤버라면 초대 의미 없음
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        memberships: {
          where: { workspaceId },
          select: { id: true },
        },
      },
    });
    if (existingUser && existingUser.memberships.length > 0) {
      throw new ConflictException("이미 워크스페이스 멤버입니다.");
    }

    // Nexus 계정이 있는 기존 유저라면 초대 완료 후 inbox 알림을 생성
    const inviteeUserId =
      existingUser && existingUser.memberships.length === 0
        ? existingUser.id
        : null;

    // 같은 이메일에 살아있는 pending 초대가 있으면 충돌 (먼저 취소 후 재발급 정책)
    const now = new Date();
    const existingPending = await this.prisma.invitation.findFirst({
      where: {
        workspaceId,
        email,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    });
    if (existingPending) {
      throw new ConflictException(
        "해당 이메일로 이미 대기 중인 초대가 있습니다. 기존 초대를 취소한 뒤 다시 시도하세요.",
      );
    }

    const expiresAt = new Date(
      now.getTime() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    const invitation = await this.prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role,
        createdBy: inviterId,
        expiresAt,
      },
      include: {
        workspace: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    // 메일 발송은 best-effort — 실패해도 invitation 응답은 정상.
    // FE 는 응답 토큰으로 링크를 만들어 복사 fallback 을 항상 제공하므로
    // 메일 실패가 사용자 흐름을 막지 않는다.
    void this.mailService.sendInvitation({
      to: invitation.email ?? "",
      workspaceName: invitation.workspace.name,
      inviterName: invitation.creator.name,
      role: invitation.role === Role.ADMIN ? "ADMIN" : "MEMBER",
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });

    if (inviteeUserId) {
      const notif = await this.prisma.notification.create({
        data: {
          userId: inviteeUserId,
          type: "WORKSPACE_INVITED",
          title: `${invitation.workspace.name} 워크스페이스 초대`,
          body: `${invitation.creator.name}님이 ${invitation.workspace.name} 워크스페이스에 초대했습니다.`,
          metadata: { invitationToken: invitation.token },
        },
      });
      this.gateway.notifyUser(notif.userId, notif);
    }

    return this.toResponse(invitation);
  }

  // GET /workspaces/:workspaceId/invitations
  async listPendingInvitations(userId: string, workspaceId: string) {
    await this.requireRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    const invitations = await this.prisma.invitation.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((inv) => this.toResponse(inv));
  }

  // GET /invitations/:token (Public)
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException("존재하지 않는 초대 링크입니다.");
    }

    return this.toResponse(invitation);
  }

  // POST /invitations/:token/accept
  async acceptInvitation(userId: string, userEmail: string, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw new NotFoundException("존재하지 않는 초대 링크입니다.");
    }

    if (invitation.acceptedAt) {
      throw new ConflictException("이미 수락된 초대입니다.");
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("만료된 초대입니다.");
    }

    // 이메일 명시되어 있으면 로그인한 사용자와 일치해야 수락 가능.
    if (
      invitation.email &&
      invitation.email.toLowerCase() !== userEmail.toLowerCase()
    ) {
      throw new ForbiddenException(
        "초대받은 이메일과 로그인한 이메일이 다릅니다.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 이미 멤버인 경우 idempotent 하게: 멤버십 새로 만들지 않고 acceptedAt 만 마킹
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: invitation.workspaceId,
          },
        },
      });

      if (!existingMembership) {
        await tx.membership.create({
          data: {
            userId,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { workspaceId: invitation.workspaceId };
    });
  }

  // DELETE /invitations/:token
  async cancelInvitation(userId: string, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw new NotFoundException("존재하지 않는 초대입니다.");
    }

    await this.requireRole(userId, invitation.workspaceId, [
      Role.OWNER,
      Role.ADMIN,
    ]);

    await this.prisma.invitation.delete({ where: { id: invitation.id } });
  }

  // ---------- helpers ----------

  /**
   * 사용자가 워크스페이스 멤버이고 허용된 역할 중 하나인지 검증.
   * 멤버 자체가 아니면 "워크스페이스 존재"를 노출하지 않기 위해 같은 메시지로 403.
   */
  private async requireRole(
    userId: string,
    workspaceId: string,
    allowed: ReadonlyArray<Role>,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      throw new ForbiddenException("해당 워크스페이스에 접근할 수 없습니다.");
    }
    if (!allowed.includes(membership.role)) {
      throw new ForbiddenException("권한이 없습니다.");
    }
  }

  /**
   * Prisma row → FE 가 기대하는 응답 셰이프로 변환.
   * FE types/invitation.ts 의 Invitation 타입과 동일.
   */
  private toResponse(invitation: {
    id: string;
    token: string;
    workspaceId: string;
    email: string | null;
    role: Role;
    createdBy: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
    workspace: { name: string };
    creator: { name: string };
  }) {
    return {
      id: invitation.id,
      token: invitation.token,
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspace.name,
      email: invitation.email,
      role: invitation.role,
      createdBy: invitation.createdBy,
      creatorName: invitation.creator.name,
      status: this.computeStatus(invitation.acceptedAt, invitation.expiresAt),
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  private computeStatus(
    acceptedAt: Date | null,
    expiresAt: Date,
  ): "pending" | "accepted" | "expired" {
    if (acceptedAt) return "accepted";
    if (expiresAt < new Date()) return "expired";
    return "pending";
  }
}
