import { Controller, Get, Post, Param, Body, Req } from "@nestjs/common";
import type { Request } from "express";
import { LabelService } from "./label.service";
import type { CreateLabelDto } from "./dto/label.dto";

@Controller("workspaces/:workspaceId/labels")
export class WorkspaceLabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get()
  getLabels(@Req() req: Request, @Param("workspaceId") workspaceId: string) {
    const { userId } = req.user as { userId: string };
    return this.labelService.getLabels(userId, workspaceId);
  }

  @Post()
  createLabel(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateLabelDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.labelService.createLabel(userId, workspaceId, dto);
  }
}
