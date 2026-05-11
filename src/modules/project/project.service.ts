import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Role, ChannelType } from "@prisma/client";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";

const PROJECT_SELECT = {
  id: true,
  workspaceId: true,
  name: true,
  description: true,
  iconUrl: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /workspaces/:workspaceId/projects
  async getProjects(userId: string, workspaceId: string) {
    await this.requireMembership(userId, workspaceId);
    return this.prisma.project.findMany({
      where: { workspaceId },
      select: PROJECT_SELECT,
      orderBy: { createdAt: "asc" },
    });
  }

  // POST /workspaces/:workspaceId/projects
  // 프로젝트 생성 시 동명의 채널을 자동 생성하고 생성자를 채널 멤버로 추가
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
    await this.requireMembership(userId, project.workspaceId);
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
    await this.requireRole(userId, project.workspaceId, Role.OWNER, Role.ADMIN);

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
}
