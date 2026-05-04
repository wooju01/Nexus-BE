import { Module } from "@nestjs/common";
import { WorkspaceDmController } from "./workspace-dm.controller";
import { DmService } from "./dm.service";

@Module({
  controllers: [WorkspaceDmController],
  providers: [DmService],
})
export class DmModule {}
