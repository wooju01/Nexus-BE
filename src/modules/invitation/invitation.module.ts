import { Module } from "@nestjs/common";

import { InvitationService } from "./invitation.service";
import { InvitationController } from "./invitation.controller";
import { WorkspaceInvitationController } from "./workspace-invitation.controller";
import { GatewayModule } from "../gateway/gateway.module";

@Module({
  imports: [GatewayModule],
  controllers: [InvitationController, WorkspaceInvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
