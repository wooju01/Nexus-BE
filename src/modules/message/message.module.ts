import { Module } from "@nestjs/common";
import { ChannelMessageController } from "./channel-message.controller";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";
import { GatewayModule } from "../gateway/gateway.module";

@Module({
  imports: [GatewayModule],
  controllers: [ChannelMessageController, MessageController],
  providers: [MessageService],
})
export class MessageModule {}
