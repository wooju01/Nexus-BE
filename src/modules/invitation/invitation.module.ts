import { Module } from "@nestjs/common";

import { InvitationService } from "./invitation.service";
import { InvitationController } from "./invitation.controller";
import { WorkspaceInvitationController } from "./workspace-invitation.controller";

@Module({
  controllers: [InvitationController, WorkspaceInvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
