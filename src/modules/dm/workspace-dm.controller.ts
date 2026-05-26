import { Controller, Get, Post, Param, Body, Req, HttpCode, HttpStatus } from "@nestjs/common";
import type { Request } from "express";
import { DmService } from "./dm.service";
import type { CreateDmDto } from "./dto/dm.dto";

@Controller("workspaces/:workspaceId/dms")
export class WorkspaceDmController {
  constructor(private readonly dmService: DmService) {}

  @Get()
  getDms(@Req() req: Request, @Param("workspaceId") workspaceId: string) {
    const { userId } = req.user as { userId: string };
    return this.dmService.getDms(userId, workspaceId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  createDm(
    @Req() req: Request,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateDmDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.dmService.createDm(userId, workspaceId, dto);
  }
}
