import { Module } from "@nestjs/common";
import { WorkspaceProjectController, ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";

@Module({
  controllers: [WorkspaceProjectController, ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
