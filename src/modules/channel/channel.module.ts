import { Module } from "@nestjs/common";
import { ChannelController } from "./channel.controller";
import { WorkspaceChannelController } from "../workspace/workspace-channel.controller";
import { ChannelService } from "./channel.service";

@Module({
  controllers: [ChannelController, WorkspaceChannelController],
  providers: [ChannelService],
})
export class ChannelModule {}
