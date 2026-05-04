import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";

import { InvitationService } from "./invitation.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { MailService } from "../mail/mail.service";

/**
 * InvitationService 유닛 테스트.
 * Prisma · MailService 는 mock 객체 — 실제 DB / SMTP 없이 비즈니스 로직만 검증.
 */
describe("InvitationService", () => {
  // 매 테스트마다 새로 만들어 mock 리셋.
  let prisma: ReturnType<typeof createPrismaMock>;
  let mailService: { sendInvitation: jest.Mock };
  let service: InvitationService;

  const INVITER_ID = "user-admin";
  const WORKSPACE_ID = "ws-1";
  const TARGET_EMAIL = "alice@example.com";

  beforeEach(() => {
    prisma = createPrismaMock();
    mailService = { sendInvitation: jest.fn().mockResolvedValue(true) };
    service = new InvitationService(
      prisma as unknown as PrismaService,
      mailService as unknown as MailService,
    );
  });

  // ---------- createInvitation ----------

  describe("createInvitation", () => {
    it("ADMIN 이 새 이메일을 초대하면 성공하고 응답을 반환한다", async () => {
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: "m1",
        userId: INVITER_ID,
        workspaceId: WORKSPACE_ID,
        role: Role.ADMIN,
      });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.invitation.findFirst.mockResolvedValueOnce(null);
      prisma.invitation.create.mockResolvedValueOnce(buildInvitationRow());

      const result = await service.createInvitation(INVITER_ID, WORKSPACE_ID, {
        email: TARGET_EMAIL,
        role: Role.MEMBER,
      });

      expect(result.workspaceName).toBe("Aether Labs");
      expect(result.creatorName).toBe("Sejun");
      expect(result.status).toBe("pending");
      expect(prisma.invitation.create).toHaveBeenCalledTimes(1);
    });

    it("MEMBER 권한으로 초대 시도 시 ForbiddenException", async () => {
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: "m1",
        userId: INVITER_ID,
        workspaceId: WORKSPACE_ID,
        role: Role.MEMBER,
      });

      await expect(
        service.createInvitation(INVITER_ID, WORKSPACE_ID, {
          email: TARGET_EMAIL,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("멤버 자격 자체가 없으면 ForbiddenException", async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createInvitation(INVITER_ID, WORKSPACE_ID, {
          email: TARGET_EMAIL,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("OWNER 가 OWNER 역할로 초대하려 하면 BadRequestException", async () => {
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: "m1",
        userId: INVITER_ID,
        workspaceId: WORKSPACE_ID,
        role: Role.OWNER,
      });

      await expect(
        service.createInvitation(INVITER_ID, WORKSPACE_ID, {
          email: TARGET_EMAIL,
          role: Role.OWNER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("이미 멤버인 이메일을 초대하면 ConflictException", async () => {
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: "m1",
        userId: INVITER_ID,
        workspaceId: WORKSPACE_ID,
        role: Role.ADMIN,
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        memberships: [{ id: "m-existing" }],
      });

      await expect(
        service.createInvitation(INVITER_ID, WORKSPACE_ID, {
          email: TARGET_EMAIL,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("같은 이메일로 살아있는 pending 초대가 이미 있으면 ConflictException", async () => {
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: "m1",
        userId: INVITER_ID,
        workspaceId: WORKSPACE_ID,
        role: Role.ADMIN,
      });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.invitation.findFirst.mockResolvedValueOnce({
        id: "inv-existing",
      });

      await expect(
        service.createInvitation(INVITER_ID, WORKSPACE_ID, {
          email: TARGET_EMAIL,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ---------- acceptInvitation ----------

  describe("acceptInvitation", () => {
    const TOKEN = "tok-1";
    const INVITED_USER_ID = "user-alice";

    it("정상 수락 시 멤버십 생성 + acceptedAt 갱신", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        token: TOKEN,
        workspaceId: WORKSPACE_ID,
        email: TARGET_EMAIL,
        role: Role.MEMBER,
        acceptedAt: null,
        expiresAt: futureDate(),
      });

      const txCreate = jest.fn();
      const txUpdate = jest.fn();
      prisma.$transaction.mockImplementationOnce(async (fn: TxFn) => {
        return fn({
          membership: {
            findUnique: jest.fn().mockResolvedValueOnce(null),
            create: txCreate,
          },
          invitation: { update: txUpdate },
        });
      });

      const result = await service.acceptInvitation(
        INVITED_USER_ID,
        TARGET_EMAIL,
        TOKEN,
      );

      expect(result.workspaceId).toBe(WORKSPACE_ID);
      expect(txCreate).toHaveBeenCalledTimes(1);
      expect(txUpdate).toHaveBeenCalledTimes(1);
    });

    it("이미 수락된 초대는 ConflictException", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        token: TOKEN,
        workspaceId: WORKSPACE_ID,
        email: TARGET_EMAIL,
        role: Role.MEMBER,
        acceptedAt: new Date(),
        expiresAt: futureDate(),
      });

      await expect(
        service.acceptInvitation(INVITED_USER_ID, TARGET_EMAIL, TOKEN),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("만료된 토큰은 BadRequestException", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        token: TOKEN,
        workspaceId: WORKSPACE_ID,
        email: TARGET_EMAIL,
        role: Role.MEMBER,
        acceptedAt: null,
        expiresAt: pastDate(),
      });

      await expect(
        service.acceptInvitation(INVITED_USER_ID, TARGET_EMAIL, TOKEN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("이메일이 다르면 ForbiddenException", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        token: TOKEN,
        workspaceId: WORKSPACE_ID,
        email: TARGET_EMAIL,
        role: Role.MEMBER,
        acceptedAt: null,
        expiresAt: futureDate(),
      });

      await expect(
        service.acceptInvitation(
          INVITED_USER_ID,
          "someone-else@example.com",
          TOKEN,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("이미 멤버인 사용자도 idempotent — 멤버십 새로 만들지 않고 acceptedAt 만 갱신", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        token: TOKEN,
        workspaceId: WORKSPACE_ID,
        email: TARGET_EMAIL,
        role: Role.MEMBER,
        acceptedAt: null,
        expiresAt: futureDate(),
      });

      const txCreate = jest.fn();
      const txUpdate = jest.fn();
      prisma.$transaction.mockImplementationOnce(async (fn: TxFn) => {
        return fn({
          membership: {
            findUnique: jest.fn().mockResolvedValueOnce({ id: "m-existing" }),
            create: txCreate,
          },
          invitation: { update: txUpdate },
        });
      });

      await service.acceptInvitation(INVITED_USER_ID, TARGET_EMAIL, TOKEN);

      expect(txCreate).not.toHaveBeenCalled();
      expect(txUpdate).toHaveBeenCalledTimes(1);
    });

    it("이메일이 null 인 초대는 누가 로그인해도 수락 가능", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        token: TOKEN,
        workspaceId: WORKSPACE_ID,
        email: null, // link-only
        role: Role.MEMBER,
        acceptedAt: null,
        expiresAt: futureDate(),
      });

      prisma.$transaction.mockImplementationOnce(async (fn: TxFn) => {
        return fn({
          membership: {
            findUnique: jest.fn().mockResolvedValueOnce(null),
            create: jest.fn(),
          },
          invitation: { update: jest.fn() },
        });
      });

      await expect(
        service.acceptInvitation(
          INVITED_USER_ID,
          "any-email@example.com",
          TOKEN,
        ),
      ).resolves.toEqual({ workspaceId: WORKSPACE_ID });
    });
  });

  // ---------- cancelInvitation ----------

  describe("cancelInvitation", () => {
    const TOKEN = "tok-1";

    it("ADMIN 이 취소하면 삭제 호출", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        workspaceId: WORKSPACE_ID,
      });
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: "m1",
        role: Role.ADMIN,
      });

      await service.cancelInvitation(INVITER_ID, TOKEN);

      expect(prisma.invitation.delete).toHaveBeenCalledWith({
        where: { id: "inv-1" },
      });
    });

    it("토큰 없으면 NotFoundException", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.cancelInvitation(INVITER_ID, TOKEN),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("MEMBER 권한이면 ForbiddenException", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce({
        id: "inv-1",
        workspaceId: WORKSPACE_ID,
      });
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: "m1",
        role: Role.MEMBER,
      });

      await expect(
        service.cancelInvitation(INVITER_ID, TOKEN),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ---------- getInvitationByToken ----------

  describe("getInvitationByToken", () => {
    it("없으면 NotFoundException", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce(null);

      await expect(service.getInvitationByToken("nope")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("만료된 초대도 반환은 되며 status=expired", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce(
        buildInvitationRow({ expiresAt: pastDate() }),
      );

      const result = await service.getInvitationByToken("tok-1");
      expect(result.status).toBe("expired");
    });

    it("수락된 초대는 status=accepted", async () => {
      prisma.invitation.findUnique.mockResolvedValueOnce(
        buildInvitationRow({ acceptedAt: new Date() }),
      );

      const result = await service.getInvitationByToken("tok-1");
      expect(result.status).toBe("accepted");
    });
  });
});

// -------------------- helpers --------------------

/**
 * `prisma.$transaction(async (tx) => ...)` 콜백의 인자 타입.
 * 실제 Prisma 트랜잭션 클라이언트와 모양이 달라도 — 테스트에서는 service 가
 * 호출하는 `tx.membership.findUnique` / `tx.membership.create` / `tx.invitation.update`
 * 만 보이면 충분하다.
 */
type TxFn = (tx: {
  membership: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  invitation: {
    update: jest.Mock;
  };
}) => Promise<unknown>;

function futureDate() {
  return new Date(Date.now() + 60 * 60 * 1000);
}
function pastDate() {
  return new Date(Date.now() - 60 * 60 * 1000);
}

function buildInvitationRow(
  overrides: Partial<{
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
  }> = {},
) {
  return {
    id: "inv-1",
    token: "tok-1",
    workspaceId: "ws-1",
    email: "alice@example.com",
    role: Role.MEMBER,
    createdBy: "user-admin",
    expiresAt: futureDate(),
    acceptedAt: null,
    createdAt: new Date(),
    workspace: { name: "Aether Labs" },
    creator: { name: "Sejun" },
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    membership: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    invitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}
