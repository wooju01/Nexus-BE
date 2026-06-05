import { Controller, Get, Post, Body, Req, HttpCode, HttpStatus } from "@nestjs/common";
import type { Request } from "express";
import { DmService } from "./dm.service";
import type { CreateDmDto } from "./dto/dm.dto";

@Controller("dms")
export class WorkspaceDmController {
  constructor(private readonly dmService: DmService) {}

  @Get()
  getDms(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.dmService.getDms(userId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  createDm(@Req() req: Request, @Body() dto: CreateDmDto) {
    const { userId } = req.user as { userId: string };
    return this.dmService.createDm(userId, dto);
  }
}
