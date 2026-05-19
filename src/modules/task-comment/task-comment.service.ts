import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from '../gateway/chat.gateway';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class TaskCommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  /** 태스크의 코멘트 목록 (오름차순). */
  async listByTask(taskId: string, userId: string) {
    const task = await this.requireAccessibleTask(taskId, userId);

    return this.prisma.taskComment.findMany({
      where: { taskId: task.id },
      include: { author: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** 코멘트 생성 + 보드 룸으로 실시간 broadcast. */
  async create(taskId: string, userId: string, dto: CreateCommentDto) {
    const task = await this.requireAccessibleTask(taskId, userId);

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId: task.id,
        authorId: userId,
        content: dto.content as never,
      },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    this.gateway.broadcastToProject('comment.created', task.projectId, {
      comment,
      actorUserId: userId,
    });

    return comment;
  }

  /** 본인 작성 코멘트만 수정 가능. */
  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const existing = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
      include: { task: { select: { id: true, projectId: true, deletedAt: true } } },
    });
    if (!existing || existing.task.deletedAt) {
      throw new NotFoundException('코멘트를 찾을 수 없습니다.');
    }
    if (existing.authorId !== userId) {
      throw new ForbiddenException('자신의 코멘트만 수정할 수 있습니다.');
    }
    await this.requireMembership(existing.task.projectId, userId);

    const updated = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content: dto.content as never },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    this.gateway.broadcastToProject('comment.updated', existing.task.projectId, {
      comment: updated,
      actorUserId: userId,
    });

    return updated;
  }

  /** 본인 작성 코멘트만 삭제 가능. */
  async remove(commentId: string, userId: string) {
    const existing = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
      include: { task: { select: { id: true, projectId: true, deletedAt: true } } },
    });
    if (!existing || existing.task.deletedAt) {
      throw new NotFoundException('코멘트를 찾을 수 없습니다.');
    }
    if (existing.authorId !== userId) {
      throw new ForbiddenException('자신의 코멘트만 삭제할 수 있습니다.');
    }
    await this.requireMembership(existing.task.projectId, userId);

    await this.prisma.taskComment.delete({ where: { id: commentId } });

    this.gateway.broadcastToProject('comment.deleted', existing.task.projectId, {
      commentId,
      taskId: existing.task.id,
      actorUserId: userId,
    });
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────────────

  /** 살아있는 태스크 + 멤버십 확인. */
  private async requireAccessibleTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true },
    });
    if (!task) throw new NotFoundException('태스크를 찾을 수 없습니다.');
    await this.requireMembership(task.projectId, userId);
    return task;
  }

  private async requireMembership(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');

    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
    });
    if (!membership) throw new ForbiddenException('접근 권한이 없습니다.');
  }
}
