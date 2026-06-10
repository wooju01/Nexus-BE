import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Role } from "@prisma/client";
import type { CreateLabelDto, UpdateLabelDto } from "./dto/label.dto";

@Injectable()
export class LabelService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly PRIVILEGED_ROLES: Role[] = [Role.OWNER, Role.ADMIN];

  // GET /workspaces/:workspaceId/labels
  async getLabels(userId: string, workspaceId: string) {
    await this.requireWorkspaceMember(userId, workspaceId);
    return this.prisma.label.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });
  }

  // POST /workspaces/:workspaceId/labels
  async createLabel(userId: string, workspaceId: string, dto: CreateLabelDto) {
    await this.requirePrivileged(userId, workspaceId);

    const existing = await this.prisma.label.findUnique({
      where: { workspaceId_name: { workspaceId, name: dto.name } },
    });
    if (existing) throw new ConflictException("이미 존재하는 라벨 이름입니다.");

    return this.prisma.label.create({
      data: { workspaceId, ...dto },
    });
  }

  // PATCH /labels/:id
  async updateLabel(userId: string, labelId: string, dto: UpdateLabelDto) {
    const label = await this.findLabelOrThrow(labelId);
    await this.requirePrivileged(userId, label.workspaceId);

    if (dto.name) {
      const existing = await this.prisma.label.findUnique({
        where: {
          workspaceId_name: { workspaceId: label.workspaceId, name: dto.name },
        },
      });
      if (existing && existing.id !== labelId) {
        throw new ConflictException("이미 존재하는 라벨 이름입니다.");
      }
    }

    return this.prisma.label.update({
      where: { id: labelId },
      data: dto,
    });
  }

  // DELETE /labels/:id
  async deleteLabel(userId: string, labelId: string) {
    const label = await this.findLabelOrThrow(labelId);
    await this.requirePrivileged(userId, label.workspaceId);
    await this.prisma.label.delete({ where: { id: labelId } });
  }

  // Helper methods
  private async findLabelOrThrow(labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
    });
    if (!label) throw new NotFoundException("라벨을 찾을 수 없습니다.");
    return label;
  }

  private async requireWorkspaceMember(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) throw new ForbiddenException();
    return membership;
  }

  private async requirePrivileged(userId: string, workspaceId: string) {
    const membership = await this.requireWorkspaceMember(userId, workspaceId);
    if (!this.PRIVILEGED_ROLES.includes(membership.role)) {
      throw new ForbiddenException();
    }
  }
}
