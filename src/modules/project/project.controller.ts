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
import { ProjectService } from "./project.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { AddProjectMemberDto } from "./dto/add-project-member.dto";

@Controller("workspaces/:workspaceId/projects")
export class WorkspaceProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  getProjects(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
  ) {
    const { userId } = req.user as { userId: string };
    return this.projectService.getProjects(userId, workspaceId);
  }

  @Post()
  createProject(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.projectService.createProject(userId, workspaceId, dto);
  }
}

@Controller("projects")
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get(":id")
  getProject(@Req() req: Request, @Param("id") projectId: string) {
    const { userId } = req.user as { userId: string };
    return this.projectService.getProject(userId, projectId);
  }

  @Patch(":id")
  updateProject(
    @Req() req: Request,
    @Param("id") projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.projectService.updateProject(userId, projectId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(@Req() req: Request, @Param("id") projectId: string) {
    const { userId } = req.user as { userId: string };
    return this.projectService.deleteProject(userId, projectId);
  }

  // ─── 프로젝트 멤버 관리 ─────────────────────────────────

  // GET /projects/:id/members — 프로젝트 멤버 목록
  @Get(":id/members")
  getProjectMembers(@Req() req: Request, @Param("id") projectId: string) {
    const { userId } = req.user as { userId: string };
    return this.projectService.getProjectMembers(userId, projectId);
  }

  // POST /projects/:id/members — 워크스페이스 멤버를 프로젝트에 초대
  @Post(":id/members")
  addProjectMember(
    @Req() req: Request,
    @Param("id") projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.projectService.addProjectMember(userId, projectId, dto);
  }

  // DELETE /projects/:id/members/:targetUserId — 프로젝트 멤버 제거
  @Delete(":id/members/:targetUserId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProjectMember(
    @Req() req: Request,
    @Param("id") projectId: string,
    @Param("targetUserId") targetUserId: string,
  ) {
    const { userId } = req.user as { userId: string };
    return this.projectService.removeProjectMember(
      userId,
      projectId,
      targetUserId,
    );
  }
}
