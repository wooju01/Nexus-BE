import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChatGateway } from "../gateway/chat.gateway";
import type { CreateTaskDto } from "./dto/create-task.dto";
import type { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  // GET /tasks/my — 현재 유저가 담당자인 미완료 태스크 전체 (프로젝트 횡단)
  async getMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: {
        assignees: { some: { userId } },
        deletedAt: null,
        status: { not: "DONE" },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        labels: { include: { label: true } },
        creator: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 30,
    });
  }

  async getTasks(projectId: string, userId: string) {
    await this.requireMembership(projectId, userId);

    return this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        labels: { include: { label: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { comments: true, subTasks: true } },
      },
      orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });
  }

  async createTask(projectId: string, userId: string, dto: CreateTaskDto) {
    await this.requireMembership(projectId, userId);

    const task = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id: projectId },
        data: { taskCount: { increment: 1 } },
        select: { taskCount: true },
      });

      return tx.task.create({
        data: {
          number: project.taskCount,
          projectId,
          createdById: userId,
          title: dto.title,
          description: dto.description as never,
          priority: dto.priority,
          status: dto.status,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          columnId: dto.columnId,
          parentTaskId: dto.parentTaskId,
          assignees: dto.assigneeIds?.length
            ? {
                create: dto.assigneeIds.map((uid) => ({
                  userId: uid,
                  assignedBy: userId,
                })),
              }
            : undefined,
        },
        include: {
          assignees: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
          labels: { include: { label: true } },
          creator: { select: { id: true, name: true, avatar: true } },
        },
      });
    });

    this.gateway.broadcastToProject("task.created", projectId, {
      task,
      actorUserId: userId,
    });

    // 담당자에게 배정 알림 (best-effort)
    const recipientIds = task.assignees
      .map((a) => a.userId)
      .filter((id) => id !== userId);
    if (recipientIds.length > 0) {
      void Promise.all(
        recipientIds.map((recipientId) =>
          this.prisma.notification
            .create({
              data: {
                userId: recipientId,
                type: "TASK_ASSIGNED",
                title: `태스크 배정: ${task.title}`,
                body: `${task.creator.name}님이 태스크를 배정했습니다.`,
                linkUrl: `/projects/${projectId}?task=${task.id}`,
                metadata: { taskId: task.id },
              },
            })
            .then((notif) => this.gateway.notifyUser(notif.userId, notif)),
        ),
      );
    }

    return task;
  }

  async getTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        labels: { include: { label: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        comments: {
          where: { task: { deletedAt: null } },
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        subTasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    if (!task) throw new NotFoundException("태스크를 찾을 수 없습니다.");
    await this.requireMembership(task.projectId, userId);
    return task;
  }

  async updateTask(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { assignees: { select: { userId: true } } },
    });
    if (!task) throw new NotFoundException("태스크를 찾을 수 없습니다.");
    await this.requireMembership(task.projectId, userId);

    const prevAssigneeIds = new Set(task.assignees.map((a) => a.userId));

    const { assigneeIds, labelIds, columnId, dueDate, ...rest } = dto;

    // dueDate 처리:
    //   - undefined → 변경 없음
    //   - null      → 마감일 제거 (unset)
    //   - 문자열    → Date 로 변환
    const dueDatePatch =
      dueDate === undefined
        ? {}
        : dueDate === null
          ? { dueDate: null }
          : { dueDate: new Date(dueDate) };

    // Prisma XOR 타입 제한으로 columnId(scalar)와 column(relation)을 동시에 쓸 수 없어 as any 사용
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...rest,
        ...dueDatePatch,
        ...(columnId !== undefined && { columnId }),
        assignees: assigneeIds
          ? {
              deleteMany: {},
              create: assigneeIds.map((uid) => ({
                userId: uid,
                assignedBy: userId,
              })),
            }
          : undefined,
        // 라벨 동기화: 빈 배열이면 모두 제거.
        labels: labelIds
          ? {
              deleteMany: {},
              create: labelIds.map((lid) => ({ labelId: lid })),
            }
          : undefined,
      } as any,
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        labels: { include: { label: true } },
        creator: { select: { id: true, name: true, avatar: true } },
      },
    });

    this.gateway.broadcastToProject("task.updated", task.projectId, {
      task: updated,
      actorUserId: userId,
    });

    // 새로 추가된 담당자에게만 배정 알림 (best-effort)
    if (assigneeIds) {
      const newRecipientIds = assigneeIds.filter(
        (id) => !prevAssigneeIds.has(id) && id !== userId,
      );
      if (newRecipientIds.length > 0) {
        void Promise.all(
          newRecipientIds.map((recipientId) =>
            this.prisma.notification
              .create({
                data: {
                  userId: recipientId,
                  type: "TASK_ASSIGNED",
                  title: `태스크 배정: ${updated.title}`,
                  body: `${updated.creator.name}님이 태스크를 배정했습니다.`,
                  linkUrl: `/projects/${task.projectId}?task=${taskId}`,
                  metadata: { taskId },
                },
              })
              .then((notif) => this.gateway.notifyUser(notif.userId, notif)),
          ),
        );
      }
    }

    return updated;
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) throw new NotFoundException("태스크를 찾을 수 없습니다.");
    await this.requireMembership(task.projectId, userId);

    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    this.gateway.broadcastToProject("task.deleted", task.projectId, {
      taskId,
      actorUserId: userId,
    });
  }

  private async requireMembership(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) throw new NotFoundException("프로젝트를 찾을 수 없습니다.");

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: project.workspaceId },
      },
    });
    if (!membership) throw new ForbiddenException("접근 권한이 없습니다.");
  }
}
