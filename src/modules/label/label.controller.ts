import {
  Controller,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Request } from "express";
import { LabelService } from "./label.service";
import type { UpdateLabelDto } from "./dto/label.dto";

@Controller("labels")
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Patch(":id")
  updateLabel(
    @Req() req: Request,
    @Param("id") labelId: string,
    @Body() dto: UpdateLabelDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.labelService.updateLabel(userId, labelId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLabel(@Req() req: Request, @Param("id") labelId: string) {
    const { userId } = req.user as { userId: string };
    return this.labelService.deleteLabel(userId, labelId);
  }
}
