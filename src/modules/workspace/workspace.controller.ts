import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { WorkspaceService } from "./workspace.service";
import type { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import type { UpdateWorkspaceDto } from "./dto/update-workspace.dto";

@Controller("workspaces")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  getMyWorkspaces(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.workspaceService.getMyWorkspaces(userId);
  }

  @Post()
  createWorkspace(@Req() req: Request, @Body() dto: CreateWorkspaceDto) {
    const { userId } = req.user as { userId: string };
    return this.workspaceService.createWorkspace(userId, dto);
  }

  @Get(":id")
  getWorkspace(@Req() req: Request, @Param("id") workspaceId: string) {
    const { userId } = req.user as { userId: string };
    return this.workspaceService.getWorkspace(userId, workspaceId);
  }

  @Patch(":id")
  updateWorkspace(
    @Req() req: Request,
    @Param("id") workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.workspaceService.updateWorkspace(userId, workspaceId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWorkspace(@Req() req: Request, @Param("id") workspaceId: string) {
    const { userId } = req.user as { userId: string };
    return this.workspaceService.deleteWorkspace(userId, workspaceId);
  }
  @Get(":id/unread-summary")
  getUnreadSummary(@Req() req: Request, @Param("id") workspaceId: string) {
    const { userId } = req.user as { userId: string };
    return this.workspaceService.getUnreadSummary(userId, workspaceId);
  }
}
