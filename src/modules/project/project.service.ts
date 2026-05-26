import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Role, ChannelType, ProjectRole } from "@prisma/client";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";
import type { AddProjectMemberDto } from "./dto/add-project-member.dto";

const PROJECT_SELECT = {
  id: true,
  workspaceId: true,
  name: true,
  description: true,
  iconUrl: true,
  createdAt: true,
  updatedAt: true,
};

const MEMBER_SELECT = {
  id: true,
  role: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
};

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /workspaces/:workspaceId/projects
  // OWNER/ADMIN: 전체 프로젝트 반환
  // MEMBER/GUEST: ProjectMember로 등록된 프로젝트만 반환
  async getProjects(userId: string, workspaceId: string) {
    const membership = await this.requireMembership(userId, workspaceId);

    const isPrivileged =
      membership.role === Role.OWNER || membership.role === Role.ADMIN;

    if (isPrivileged) {
      return this.prisma.project.findMany({
        where: { workspaceId },
        select: PROJECT_SELECT,
        orderBy: { createdAt: "asc" },
      });
    }

    // 일반 멤버: ProjectMember로 등록된 프로젝트만
    return this.prisma.project.findMany({
      where: {
        workspaceId,
        members: { some: { userId } },
      },
      select: PROJECT_SELECT,
      orderBy: { createdAt: "asc" },
    });
  }

  // POST /workspaces/:workspaceId/projects
  // 생성자를 프로젝트 MANAGER로 자동 추가 + 동명 채널 생성
  async createProject(
    userId: string,
    workspaceId: string,
    dto: CreateProjectDto,
  ) {
    await this.requireMembership(userId, workspaceId);

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { workspaceId, ...dto },
        select: PROJECT_SELECT,
      });

      // 생성자를 프로젝트 MANAGER로 자동 추가
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: ProjectRole.MANAGER,
        },
      });

      // 동명 채널 자동 생성 (auto-linked)
      const channel = await tx.channel.create({
        data: {
          workspaceId,
          type: ChannelType.CHANNEL,
          name: dto.name,
        },
      });

      // 생성자를 채널 멤버로 추가
      await tx.channelMember.create({
        data: { channelId: channel.id, userId },
      });

      return { ...project, linkedChannelId: channel.id };
    });
  }

  // GET /projects/:id
  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: PROJECT_SELECT,
    });
    if (!project) throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    await this.requireProjectAccess(userId, projectId, project.workspaceId);
    return project;
  }

  // PATCH /projects/:id
  async updateProject(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    await this.requireProjectManager(userId, projectId, project.workspaceId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
      select: PROJECT_SELECT,
    });
  }

  // DELETE /projects/:id
  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    await this.requireRole(userId, project.workspaceId, Role.OWNER);

    await this.prisma.project.delete({ where: { id: projectId } });
  }

  // GET /projects/:id/members
  async getProjectMembers(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    await this.requireProjectAccess(userId, projectId, project.workspaceId);

    return this.prisma.projectMember.findMany({
      where: { projectId },
      select: MEMBER_SELECT,
      orderBy: { joinedAt: "asc" },
    });
  }

  // POST /projects/:id/members — 워크스페이스 멤버를 프로젝트에 초대
  async addProjectMember(
    userId: string,
    projectId: string,
    dto: AddProjectMemberDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    await this.requireProjectManager(userId, projectId, project.workspaceId);

    // 초대 대상이 워크스페이스 멤버인지 확인
    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: dto.userId,
          workspaceId: project.workspaceId,
        },
      },
    });
    if (!targetMembership)
      throw new NotFoundException("해당 유저는 워크스페이스 멤버가 아닙니다.");

    // 이미 프로젝트 멤버인지 확인
    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException("이미 프로젝트 멤버입니다.");

    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role ?? ProjectRole.MEMBER,
      },
      select: MEMBER_SELECT,
    });
  }

  // DELETE /projects/:id/members/:targetUserId
  async removeProjectMember(
    userId: string,
    projectId: string,
    targetUserId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException("프로젝트를 찾을 수 없습니다.");
    await this.requireProjectManager(userId, projectId, project.workspaceId);

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!member)
      throw new NotFoundException("해당 유저는 프로젝트 멤버가 아닙니다.");

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
  }

  // ─── 내부 헬퍼 ───────────────────────────────────────────

  private async requireMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new ForbiddenException();
    return membership;
  }

  private async requireRole(
    userId: string,
    workspaceId: string,
    ...roles: Role[]
  ) {
    const membership = await this.requireMembership(userId, workspaceId);
    if (!roles.includes(membership.role)) throw new ForbiddenException();
    return membership;
  }

  /**
   * 프로젝트 읽기 접근 권한:
   * - 워크스페이스 OWNER/ADMIN → 항상 허용
   * - 그 외 → ProjectMember여야 허용
   */
  private async requireProjectAccess(
    userId: string,
    projectId: string,
    workspaceId: string,
  ) {
    const membership = await this.requireMembership(userId, workspaceId);

    if (membership.role === Role.OWNER || membership.role === Role.ADMIN) {
      return;
    }

    const projectMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!projectMember)
      throw new ForbiddenException("프로젝트 접근 권한이 없습니다.");
  }

  /**
   * 프로젝트 수정 권한:
   * - 워크스페이스 OWNER/ADMIN → 허용
   * - 프로젝트 MANAGER → 허용
   * - 그 외 → 거부
   */
  private async requireProjectManager(
    userId: string,
    projectId: string,
    workspaceId: string,
  ) {
    const membership = await this.requireMembership(userId, workspaceId);

    if (membership.role === Role.OWNER || membership.role === Role.ADMIN) {
      return;
    }

    const projectMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!projectMember || projectMember.role !== ProjectRole.MANAGER) {
      throw new ForbiddenException("프로젝트 관리 권한이 없습니다.");
    }
  }
}
