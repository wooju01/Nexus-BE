import { Module } from "@nestjs/common";
import { WorkspaceLabelController } from "./workspace-label.controller";
import { LabelController } from "./label.controller";
import { LabelService } from "./label.service";

@Module({
  controllers: [WorkspaceLabelController, LabelController],
  providers: [LabelService],
})
export class LabelModule {}
