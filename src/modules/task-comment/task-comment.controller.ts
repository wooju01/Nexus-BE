import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { TaskCommentService } from "./task-comment.service";

/**
 * 코멘트 라우트는 두 가지 prefix 를 섞어 사용한다:
 *   - 목록/생성:        /tasks/:taskId/comments
 *   - 단건 수정/삭제:   /comments/:id
 *
 * NestJS @Controller 는 단일 prefix 라 두 컨트롤러로 분리하지 않고
 * 빈 prefix 로 두고 메서드별 경로를 절대 경로로 명시.
 */
@Controller()
export class TaskCommentController {
  constructor(private readonly service: TaskCommentService) {}

  @Get("tasks/:taskId/comments")
  list(@Req() req: Request, @Param("taskId") taskId: string) {
    const { userId } = req.user as { userId: string };
    return this.service.listByTask(taskId, userId);
  }

  @Post("tasks/:taskId/comments")
  create(
    @Req() req: Request,
    @Param("taskId") taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.service.create(taskId, userId, dto);
  }

  @Patch("comments/:id")
  update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.service.update(id, userId, dto);
  }

  @Delete("comments/:id")
  remove(@Req() req: Request, @Param("id") id: string) {
    const { userId } = req.user as { userId: string };
    return this.service.remove(id, userId);
  }
}
